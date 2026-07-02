import { useState, useEffect, useRef, useCallback } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PhoneOff, Video, VideoOff, Mic, MicOff, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { startRingingSound, stopRingingSound, startRingtone, stopRingtone } from '@/utils/sounds';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

const RING_TIMEOUT_MS = 30000; // 30 seconds — auto-end if no answer

interface CallScreenProps {
  recipientId: string;
  recipientName: string;
  recipientAvatar?: string;
  callType: 'audio' | 'video';
  isIncoming?: boolean;
  offer?: RTCSessionDescriptionInit;
  onEnd: () => void;
}

export default function CallScreen({
  recipientId, recipientName, recipientAvatar, callType, isIncoming, offer, onEnd,
}: CallScreenProps) {
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const [status, setStatus] = useState<'connecting' | 'ringing' | 'active' | 'ended'>('connecting');
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(callType === 'audio');
  const [duration, setDuration] = useState(0);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const channelRef = useRef<any>(null);
  const timerRef = useRef<number | null>(null);
  const ringTimeoutRef = useRef<number | null>(null);
  const callStartRef = useRef<number | null>(null);

  const channelName = [user?.id, recipientId].sort().join('-');

  const saveCallHistory = useCallback(async (callStatus: string, callDuration: number = 0) => {
    if (!user) return;
    await supabase.from('call_history').insert({
      caller_id: isIncoming ? recipientId : user.id,
      receiver_id: isIncoming ? user.id : recipientId,
      call_type: callType,
      status: callStatus,
      duration: callDuration,
    } as any);
  }, [user, recipientId, callType, isIncoming]);

  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
    stopRingingSound();
    stopRingtone();
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    pcRef.current?.close();
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    setStatus('ended');
  }, []);

  const setupMedia = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: callType === 'video',
    });
    localStreamRef.current = stream;
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    return stream;
  }, [callType]);

  const setupPeerConnection = useCallback((stream: MediaStream) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;

    stream.getTracks().forEach(t => pc.addTrack(t, stream));

    pc.ontrack = (e) => {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0];
      stopRingingSound();
      stopRingtone();
      if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
      setStatus('active');
      callStartRef.current = Date.now();
      timerRef.current = window.setInterval(() => setDuration(d => d + 1), 1000);
    };

    pc.onicecandidate = (e) => {
      if (e.candidate && channelRef.current) {
        channelRef.current.send({
          type: 'broadcast', event: 'ice-candidate',
          payload: { candidate: e.candidate.toJSON(), from: user?.id },
        });
      }
    };

    return pc;
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;

    const init = async () => {
      const stream = await setupMedia();
      const pc = setupPeerConnection(stream);

      const channel = supabase.channel(`call-${channelName}`);
      channelRef.current = channel;

      channel
        .on('broadcast', { event: 'answer' }, async ({ payload }) => {
          if (payload.from !== user.id) {
            await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
            stopRingingSound();
            if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
          }
        })
        .on('broadcast', { event: 'offer' }, async ({ payload }) => {
          if (payload.from !== user.id) {
            await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            channel.send({ type: 'broadcast', event: 'answer', payload: { answer, from: user.id } });
          }
        })
        .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
          if (payload.from !== user.id && payload.candidate) {
            await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
          }
        })
        .on('broadcast', { event: 'end-call' }, ({ payload }) => {
          if (payload.from !== user.id) {
            const dur = callStartRef.current ? Math.floor((Date.now() - callStartRef.current) / 1000) : 0;
            saveCallHistory(dur > 0 ? 'completed' : 'missed', dur);
            cleanup();
            onEnd();
          }
        })
        .subscribe(async (s) => {
          if (s === 'SUBSCRIBED') {
            if (isIncoming && offer) {
              stopRingtone();
              await pc.setRemoteDescription(new RTCSessionDescription(offer));
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              channel.send({ type: 'broadcast', event: 'answer', payload: { answer, from: user.id } });
              saveCallHistory('answered');
            } else {
              setStatus('ringing');
              startRingingSound();

              // Auto-end after 30s if no answer
              ringTimeoutRef.current = window.setTimeout(() => {
                saveCallHistory('missed');
                channel.send({ type: 'broadcast', event: 'end-call', payload: { from: user.id } });
                cleanup();
                onEnd();
              }, RING_TIMEOUT_MS);

              const { data: profile } = await supabase.from('profiles').select('display_name').eq('id', user.id).single();
              supabase.functions.invoke('send-push-notification', {
                body: {
                  receiverId: recipientId,
                  senderName: profile?.display_name || 'Someone',
                  messageType: callType === 'video' ? 'call_video' : 'call_audio',
                  content: '',
                },
              }).catch(() => {});

              const offerDesc = await pc.createOffer();
              await pc.setLocalDescription(offerDesc);
              channel.send({
                type: 'broadcast', event: 'offer',
                payload: { offer: offerDesc, from: user.id, callType },
              });
            }
          }
        });
    };

    init().catch(console.error);
    return cleanup;
  }, []);

  const endCall = () => {
    const dur = callStartRef.current ? Math.floor((Date.now() - callStartRef.current) / 1000) : 0;
    saveCallHistory(dur > 0 ? 'completed' : 'cancelled', dur);
    channelRef.current?.send({ type: 'broadcast', event: 'end-call', payload: { from: user?.id } });
    cleanup();
    onEnd();
  };

  const toggleMute = () => {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setIsMuted(!isMuted);
  };

  const toggleCamera = () => {
    localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
    setIsCameraOff(!isCameraOff);
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-between py-safe">
      <div className="flex-1 w-full flex items-center justify-center relative">
        {callType === 'video' ? (
          <video ref={remoteVideoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-4">
            <Avatar className="h-28 w-28 ring-4 ring-primary/20">
              <AvatarImage src={recipientAvatar} />
              <AvatarFallback className="bg-primary/10 text-primary text-4xl">
                {recipientName[0] || <User className="h-12 w-12" />}
              </AvatarFallback>
            </Avatar>
            <h2 className="text-2xl font-bold">{recipientName}</h2>
            <p className="text-muted-foreground text-lg">
              {status === 'ringing' && (isRTL ? 'جاري الاتصال...' : 'Calling...')}
              {status === 'connecting' && (isRTL ? 'جاري الاتصال...' : 'Connecting...')}
              {status === 'active' && fmt(duration)}
              {status === 'ended' && (isRTL ? 'انتهت المكالمة' : 'Call ended')}
            </p>
            {(status === 'ringing' || status === 'connecting') && (
              <div className="w-4 h-4 rounded-full bg-primary animate-pulse" />
            )}
          </div>
        )}

        {callType === 'video' && (
          <div className="absolute top-6 end-6 w-28 h-40 rounded-2xl overflow-hidden border-2 border-background shadow-lg">
            <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          </div>
        )}
      </div>

      <div className="shrink-0 pb-8 pt-4">
        <div className="flex items-center gap-4">
          <Button size="icon" variant={isMuted ? 'destructive' : 'secondary'} onClick={toggleMute} className="h-14 w-14 rounded-full">
            {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          </Button>
          {callType === 'video' && (
            <Button size="icon" variant={isCameraOff ? 'destructive' : 'secondary'} onClick={toggleCamera} className="h-14 w-14 rounded-full">
              {isCameraOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
            </Button>
          )}
          <Button size="icon" variant="destructive" onClick={endCall} className="h-16 w-16 rounded-full">
            <PhoneOff className="h-7 w-7" />
          </Button>
        </div>
      </div>
    </div>
  );
}

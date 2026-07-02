import { useState, useRef } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { Button } from '@/components/ui/button';
import { Mic, Square, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface VoiceRecorderProps {
  onRecordComplete: (url: string, duration: number) => void;
  onCancel: () => void;
}

export default function VoiceRecorder({ onRecordComplete, onCancel }: VoiceRecorderProps) {
  const { isRTL } = useLanguage();
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await uploadVoice(blob);
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setDuration(0);
      timerRef.current = window.setInterval(() => setDuration(d => d + 1), 1000);
    } catch {
      // Mic access denied
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      if (timerRef.current) clearInterval(timerRef.current);
      setIsRecording(false);
    }
  };

  const cancel = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream?.getTracks().forEach(t => t.stop());
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
    onCancel();
  };

  const uploadVoice = async (blob: Blob) => {
    setIsUploading(true);
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    const fileName = `${userId}/${Date.now()}.webm`;

    const { error } = await supabase.storage.from('voice-messages').upload(fileName, blob);
    if (error) { setIsUploading(false); return; }

    const { data: urlData } = supabase.storage.from('voice-messages').getPublicUrl(fileName);
    onRecordComplete(urlData.publicUrl, duration);
    setIsUploading(false);
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  if (isUploading) {
    return (
      <div className="flex items-center justify-center gap-3 p-4 bg-primary/5 rounded-2xl">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">{isRTL ? 'جاري الرفع...' : 'Uploading...'}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 w-full">
      {isRecording ? (
        <>
          <Button size="icon" variant="ghost" onClick={cancel} className="h-12 w-12 rounded-xl shrink-0">
            <X className="h-5 w-5" />
          </Button>
          <div className="flex-1 flex items-center gap-3 px-4 py-3 bg-destructive/10 rounded-2xl">
            <div className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
            <span className="font-mono text-base font-medium">{fmt(duration)}</span>
          </div>
          <Button size="icon" onClick={stopRecording} className="h-12 w-12 rounded-xl shrink-0 bg-primary">
            <Square className="h-5 w-5" />
          </Button>
        </>
      ) : (
        <>
          <Button size="icon" variant="ghost" onClick={onCancel} className="h-12 w-12 rounded-xl shrink-0">
            <X className="h-5 w-5" />
          </Button>
          <p className="flex-1 text-sm text-muted-foreground text-center">
            {isRTL ? 'اضغط للتسجيل' : 'Tap to record'}
          </p>
          <Button size="icon" onClick={startRecording} className="h-12 w-12 rounded-xl shrink-0 bg-primary">
            <Mic className="h-5 w-5" />
          </Button>
        </>
      )}
    </div>
  );
}

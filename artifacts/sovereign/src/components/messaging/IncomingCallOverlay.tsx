import { useLanguage } from '@/i18n/LanguageContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Phone, PhoneOff, Video, User } from 'lucide-react';
import { motion } from 'framer-motion';

interface IncomingCallOverlayProps {
  callerName: string;
  callerAvatar?: string;
  callType: 'audio' | 'video';
  onAnswer: () => void;
  onReject: () => void;
}

export default function IncomingCallOverlay({ callerName, callerAvatar, callType, onAnswer, onReject }: IncomingCallOverlayProps) {
  const { isRTL } = useLanguage();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black/95 flex flex-col items-center justify-between py-safe"
    >
      {/* Caller info */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        {/* Pulsing ring behind avatar */}
        <div className="relative">
          <motion.div
            animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute inset-0 rounded-full border-2 border-green-400"
            style={{ margin: '-16px' }}
          />
          <motion.div
            animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0, 0.2] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
            className="absolute inset-0 rounded-full border border-green-400/50"
            style={{ margin: '-32px' }}
          />
          <Avatar className="h-32 w-32 ring-4 ring-green-400/30">
            <AvatarImage src={callerAvatar} />
            <AvatarFallback className="bg-primary/20 text-primary text-5xl">
              {callerName[0] || <User className="h-16 w-16" />}
            </AvatarFallback>
          </Avatar>
        </div>

        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-2">{callerName}</h2>
          <p className="text-lg text-white/60">
            {callType === 'video'
              ? (isRTL ? 'مكالمة فيديو واردة...' : 'Incoming video call...')
              : (isRTL ? 'مكالمة صوتية واردة...' : 'Incoming audio call...')}
          </p>
        </div>

        {/* Subtle pulsing dot */}
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-3 h-3 rounded-full bg-green-400"
        />
      </div>

      {/* Answer / Reject buttons */}
      <div className="shrink-0 pb-12 pt-4">
        <div className="flex items-center gap-16">
          {/* Reject */}
          <div className="flex flex-col items-center gap-2">
            <Button
              size="icon"
              variant="destructive"
              onClick={onReject}
              className="h-18 w-18 rounded-full shadow-lg shadow-red-500/30"
              style={{ width: '72px', height: '72px' }}
            >
              <PhoneOff className="h-8 w-8" />
            </Button>
            <span className="text-sm text-white/60">{isRTL ? 'رفض' : 'Decline'}</span>
          </div>

          {/* Answer */}
          <div className="flex flex-col items-center gap-2">
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <Button
                size="icon"
                onClick={onAnswer}
                className="h-18 w-18 rounded-full bg-green-500 hover:bg-green-600 shadow-lg shadow-green-500/30"
                style={{ width: '72px', height: '72px' }}
              >
                {callType === 'video' ? <Video className="h-8 w-8 text-white" /> : <Phone className="h-8 w-8 text-white" />}
              </Button>
            </motion.div>
            <span className="text-sm text-white/60">{isRTL ? 'رد' : 'Answer'}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

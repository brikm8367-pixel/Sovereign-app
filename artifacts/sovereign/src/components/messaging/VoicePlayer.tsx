import { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoicePlayerProps {
  url: string;
  isMine?: boolean;
}

export default function VoicePlayer({ url, isMine }: VoicePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.addEventListener('loadedmetadata', () => setDuration(audio.duration));
    audio.addEventListener('timeupdate', () => {
      if (audio.duration) setProgress((audio.currentTime / audio.duration) * 100);
    });
    audio.addEventListener('ended', () => { setIsPlaying(false); setProgress(0); });
    return () => { audio.pause(); audio.remove(); };
  }, [url]);

  const toggle = () => {
    if (!audioRef.current) return;
    if (isPlaying) audioRef.current.pause();
    else audioRef.current.play();
    setIsPlaying(!isPlaying);
  };

  const fmt = (s: number) => {
    if (!s || !isFinite(s)) return '0:00';
    return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-3 min-w-[160px]">
      <button
        onClick={toggle}
        className={cn(
          'h-9 w-9 rounded-full flex items-center justify-center shrink-0 transition-all',
          isMine ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-primary/10 text-primary'
        )}
      >
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ms-0.5" />}
      </button>
      <div className="flex-1 space-y-1">
        <div className={cn('h-1.5 rounded-full overflow-hidden', isMine ? 'bg-primary-foreground/15' : 'bg-muted')}>
          <div
            className={cn('h-full rounded-full transition-all duration-200', isMine ? 'bg-primary-foreground/50' : 'bg-primary/50')}
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className={cn('text-[10px]', isMine ? 'text-primary-foreground/60' : 'text-muted-foreground')}>
          {fmt(duration)}
        </span>
      </div>
    </div>
  );
}

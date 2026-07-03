import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useLanguage } from '@/i18n/LanguageContext';
import { ManagedCelebrity } from '@/hooks/useRole';
import { cn } from '@/lib/utils';

interface Props {
  celebrities: ManagedCelebrity[];
  activeCelebId: string | null;
  onSwitch: (id: string) => void;
}

const MAX_VISIBLE = 5;

export function CelebritySwitcher({ celebrities, activeCelebId, onSwitch }: Props) {
  const { isRTL } = useLanguage();
  if (celebrities.length <= 1) return null;

  const visible = celebrities.slice(0, MAX_VISIBLE);
  const overflow = celebrities.length - MAX_VISIBLE;

  return (
    <div className="px-4 pt-3 pb-0">
      <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2.5 font-semibold">
        {isRTL ? 'المشاهير الذين تديرهم' : 'Managing'}
      </p>
      <div className="flex items-start gap-3 overflow-x-auto scrollbar-hide pb-2">
        {visible.map(c => {
          const active = c.id === activeCelebId;
          const initials = (c.display_name || c.username || '?')[0].toUpperCase();
          return (
            <motion.button
              key={c.id}
              whileTap={{ scale: 0.88 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              onClick={() => onSwitch(c.id)}
              className="flex flex-col items-center gap-1.5 shrink-0 min-w-[52px]"
            >
              <div className={cn(
                'rounded-full p-[2px] transition-all duration-200',
                active
                  ? 'bg-gradient-to-br from-amber-400 to-amber-600 shadow-[0_0_12px_rgba(184,134,11,0.4)]'
                  : 'bg-transparent',
              )}>
                <div className={cn('rounded-full', active ? 'p-[1.5px] bg-background' : '')}>
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={c.avatar_url ?? undefined} />
                    <AvatarFallback className={cn(
                      'text-sm font-bold',
                      active ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400' : 'bg-muted text-muted-foreground',
                    )}>
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </div>
              <span className={cn(
                'text-[10px] leading-tight text-center max-w-[52px] line-clamp-1',
                active ? 'text-primary font-bold' : 'text-muted-foreground',
              )}>
                {c.display_name || c.username || '—'}
              </span>
            </motion.button>
          );
        })}

        {overflow > 0 && (
          <div className="flex flex-col items-center gap-1.5 shrink-0 min-w-[52px]">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center ring-1 ring-border">
              <span className="text-xs font-bold text-muted-foreground">+{overflow}</span>
            </div>
            <span className="text-[10px] text-muted-foreground">{isRTL ? 'المزيد' : 'more'}</span>
          </div>
        )}
      </div>
    </div>
  );
}

import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { Home, Search, Bell, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface NavItem {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: { ar: string; en: string; fr: string; es: string };
  path: string;
}

const navItems: NavItem[] = [
  { id: 'home', icon: Home, label: { ar: 'الرئيسية', en: 'Home', fr: 'Accueil', es: 'Inicio' }, path: '/home' },
  { id: 'search', icon: Search, label: { ar: 'بحث', en: 'Search', fr: 'Recherche', es: 'Buscar' }, path: '/home?tab=search' },
  { id: 'notifications', icon: Bell, label: { ar: 'إشعارات', en: 'Alerts', fr: 'Alertes', es: 'Alertas' }, path: '/notifications' },
  { id: 'profile', icon: User, label: { ar: 'حسابي', en: 'Profile', fr: 'Profil', es: 'Perfil' }, path: '/profile' },
];

export function BottomNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { language } = useLanguage();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch unread message count for badge
  useEffect(() => {
    if (!user) return;
    const fetchUnread = async () => {
      const { count } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .eq('is_read', false);
      setUnreadCount(count || 0);
    };
    fetchUnread();

    // Listen for new messages
    const channel = supabase
      .channel('nav-unread')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` }, () => {
        fetchUnread();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const isActive = (path: string) => {
    if (path.includes('?')) {
      return location.pathname + location.search === path;
    }
    return location.pathname === path;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-area-inset-bottom">
      <div className="bg-card/95 backdrop-blur-lg border-t border-border">
        <div className="max-w-lg mx-auto flex items-center justify-around h-16 px-2">
          {navItems.map((item) => {
            const active = isActive(item.path);
            const Icon = item.icon;
            const showBadge = item.id === 'home' && unreadCount > 0;
            
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={cn(
                  'flex flex-col items-center justify-center flex-1 h-full px-3 transition-all touch-feedback',
                  active && 'text-primary'
                )}
              >
                <div className={cn(
                  'relative flex items-center justify-center w-10 h-10 rounded-xl transition-all',
                  active && 'bg-primary/10'
                )}>
                  <Icon className={cn(
                    'h-6 w-6 transition-all',
                    active ? 'text-primary' : 'text-muted-foreground'
                  )} />
                  {/* Badge count */}
                  {showBadge && (
                    <span className="absolute -top-1 -end-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </div>
                <span className={cn(
                  'text-xs mt-0.5 font-medium transition-all',
                  active ? 'text-primary' : 'text-muted-foreground'
                )}>
                  {item.label[language] || item.label.en}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

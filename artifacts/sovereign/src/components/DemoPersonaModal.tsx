import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Users, Heart, MessageCircle, Star, TrendingUp } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

interface DemoPersonaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DemoPersonaModal({ open, onOpenChange }: DemoPersonaModalProps) {
  const { t, isRTL } = useLanguage();

  const persona = {
    name: t.demoModal.persona.name,
    role: t.demoModal.persona.role,
    avatar: "👩‍💼",
    followers: t.demoModal.persona.followers,
    quote: t.demoModal.persona.quote,
  };

  const categories = [
    {
      id: "work",
      title: t.demoModal.categories.work.title,
      icon: Briefcase,
      color: "bg-primary/5 text-primary border-primary/20",
      iconBg: "bg-primary/15",
      messages: [
        { sender: t.demoModal.categories.work.messages.sender1, preview: t.demoModal.categories.work.messages.preview1, time: `5 ${t.demoModal.timeAgo.minutes}`, unread: true },
        { sender: t.demoModal.categories.work.messages.sender2, preview: t.demoModal.categories.work.messages.preview2, time: t.demoModal.timeAgo.hour, unread: true },
        { sender: t.demoModal.categories.work.messages.sender3, preview: t.demoModal.categories.work.messages.preview3, time: `3 ${t.demoModal.timeAgo.hours}`, unread: false },
      ],
      count: 12,
      limit: 15,
    },
    {
      id: "audience",
      title: t.demoModal.categories.audience.title,
      icon: Users,
      color: "bg-accent/10 text-accent border-accent/25",
      iconBg: "bg-accent/20",
      messages: [
        { sender: t.demoModal.categories.audience.messages.sender1, preview: t.demoModal.categories.audience.messages.preview1, time: `10 ${t.demoModal.timeAgo.minutes}`, unread: true },
        { sender: t.demoModal.categories.audience.messages.sender2, preview: t.demoModal.categories.audience.messages.preview2, time: `30 ${t.demoModal.timeAgo.minutes}`, unread: false },
        { sender: t.demoModal.categories.audience.messages.sender3, preview: t.demoModal.categories.audience.messages.preview3, time: `2 ${t.demoModal.timeAgo.hours}`, unread: false },
      ],
      count: 248,
      limit: 300,
    },
    {
      id: "others",
      title: t.demoModal.categories.closeOnes.title,
      icon: Heart,
      color: "bg-orange-500/10 text-orange-600 border-orange-500/20",
      iconBg: "bg-orange-500/20",
      messages: [
        { sender: t.demoModal.categories.closeOnes.messages.sender1, preview: t.demoModal.categories.closeOnes.messages.preview1, time: `15 ${t.demoModal.timeAgo.minutes}`, unread: true },
        { sender: t.demoModal.categories.closeOnes.messages.sender2, preview: t.demoModal.categories.closeOnes.messages.preview2, time: t.demoModal.timeAgo.hour, unread: false },
        { sender: t.demoModal.categories.closeOnes.messages.sender3, preview: t.demoModal.categories.closeOnes.messages.preview3, time: `4 ${t.demoModal.timeAgo.hours}`, unread: false },
      ],
      count: 5,
      limit: 10,
    },
  ];

  const stats = [
    { label: t.demoModal.stats.todayMessages, value: "265", icon: MessageCircle },
    { label: t.demoModal.stats.importantMessages, value: "12", icon: Star },
    { label: t.demoModal.stats.timeSaved, value: t.demoModal.stats.timeSavedValue, icon: TrendingUp },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 gap-0 bg-background border-border/50 shadow-2xl"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {/* Header with persona info */}
        <DialogHeader className="p-6 pb-4 border-b border-border/30 bg-gradient-to-b from-primary/5 via-primary/2 to-transparent">
          <div className={`flex items-center gap-4 ${isRTL ? 'flex-row' : 'flex-row'}`}>
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-4xl shadow-lg ring-2 ring-primary/10">
              {persona.avatar}
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl font-bold text-foreground mb-1">
                {persona.name}
              </DialogTitle>
              <p className="text-muted-foreground text-sm">{persona.role}</p>
              <div className={`flex items-center gap-2 mt-2 ${isRTL ? 'flex-row' : 'flex-row'}`}>
                <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-0">
                  <Users className={`h-3 w-3 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                  {persona.followers}
                </Badge>
              </div>
            </div>
          </div>
          
          {/* Quote */}
          <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/10">
            <p className="text-sm text-foreground/80 italic leading-relaxed">
              "{persona.quote}"
            </p>
          </div>
        </DialogHeader>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 p-6 border-b border-border/30 bg-muted/20">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center p-4 rounded-xl bg-background shadow-sm border border-border/30 hover:border-primary/30 transition-all duration-300">
              <div className="h-10 w-10 mx-auto mb-3 rounded-xl bg-primary/10 flex items-center justify-center">
                <stat.icon className="h-5 w-5 text-primary" />
              </div>
              <p className="text-lg font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Categories */}
        <div className="p-6 space-y-6 bg-gradient-to-b from-transparent to-muted/10">
          <h3 className="text-sm font-semibold text-muted-foreground">
            {t.demoModal.organizedInbox} {persona.name}
          </h3>
          
          {categories.map((category) => (
            <div key={category.id} className={`rounded-2xl border p-4 ${category.color} backdrop-blur-sm`}>
              {/* Category header */}
              <div className="flex items-center justify-between mb-4">
                <div className={`flex items-center gap-3 ${isRTL ? 'flex-row' : 'flex-row'}`}>
                  <div className={`h-10 w-10 rounded-xl ${category.iconBg} flex items-center justify-center`}>
                    <category.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold">{category.title}</h4>
                    <p className="text-xs opacity-70">
                      {category.count} {t.demoModal.categories.work.count} {category.limit} {t.demoModal.ofMessages}
                    </p>
                  </div>
                </div>
                
                {/* Progress bar */}
                <div className="w-24">
                  <div className="h-2 rounded-full bg-current/10 overflow-hidden">
                    <div 
                      className="h-full rounded-full bg-current/50 transition-all duration-500"
                      style={{ width: `${(category.count / category.limit) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="space-y-2">
                {category.messages.map((message, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center gap-3 p-3 rounded-xl bg-background/90 hover:bg-background hover:shadow-sm transition-all duration-200 cursor-pointer border border-transparent hover:border-border/30"
                  >
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center text-sm font-bold text-primary">
                      {message.sender.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`flex items-center gap-2 ${isRTL ? 'flex-row' : 'flex-row'}`}>
                        <span className="font-medium text-foreground text-sm">{message.sender}</span>
                        {message.unread && (
                          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{message.preview}</p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{message.time}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-6 pt-4 border-t border-border/30 bg-gradient-to-t from-primary/5 to-transparent">
          <p className="text-center text-sm text-muted-foreground">
            {t.demoModal.footer}
            <span className="text-primary font-semibold hover:underline cursor-pointer"> {t.demoModal.tryNow}</span>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
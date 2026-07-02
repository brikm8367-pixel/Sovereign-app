import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Users, MessageSquare, TrendingUp, Crown, Shield } from 'lucide-react';

// Admin user ID - replace with your actual user ID after registering
const ADMIN_USER_ID = 'YOUR_ADMIN_USER_ID';

interface Stats {
  totalUsers: number;
  activeUsers: number;
  totalMessages: number;
  messagesLast24h: number;
  messagesLast7d: number;
}

export default function AdminStats() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdminAndFetchStats = async () => {
      if (!user) {
        navigate('/');
        return;
      }

      // Check if user is admin
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();

      if (!roleData) {
        navigate('/home');
        return;
      }

      setIsAdmin(true);

      // Fetch stats
      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

      // Total users
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Total messages
      const { count: totalMessages } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true });

      // Messages last 24h
      const { count: messagesLast24h } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', last24h);

      // Messages last 7 days
      const { count: messagesLast7d } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', last7d);

      // Active users (sent or received message in last 7 days)
      const { data: activeData } = await supabase
        .from('messages')
        .select('sender_id, receiver_id')
        .gte('created_at', last7d);

      const activeUserIds = new Set<string>();
      activeData?.forEach(m => {
        activeUserIds.add(m.sender_id);
        activeUserIds.add(m.receiver_id);
      });

      setStats({
        totalUsers: totalUsers || 0,
        activeUsers: activeUserIds.size,
        totalMessages: totalMessages || 0,
        messagesLast24h: messagesLast24h || 0,
        messagesLast7d: messagesLast7d || 0,
      });

      setIsLoading(false);
    };

    if (!loading) {
      checkAdminAndFetchStats();
    }
  }, [user, loading, navigate]);

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-lg mx-auto flex h-16 items-center justify-between px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/home')} className="h-11 w-11">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-bold text-lg">Admin Dashboard</span>
          </div>
          <div className="w-11" />
        </div>
      </header>

      <main className="max-w-lg mx-auto pt-24 pb-8 px-4 space-y-4">
        {/* Admin Badge */}
        <div className="flex items-center justify-center gap-2 p-4 bg-primary/10 rounded-2xl border-2 border-primary/20">
          <Crown className="h-6 w-6 text-primary" />
          <span className="font-bold text-lg text-primary">Owner Access Only</span>
        </div>

        {stats && (
          <div className="grid gap-4">
            {/* Total Users */}
            <Card className="rounded-3xl border-2 border-primary/10">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="p-3 rounded-xl bg-primary/10">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  Total Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-primary">{stats.totalUsers}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {stats.activeUsers} active in last 7 days
                </p>
              </CardContent>
            </Card>

            {/* Messages */}
            <Card className="rounded-3xl border-2 border-primary/10">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="p-3 rounded-xl bg-primary/10">
                    <MessageSquare className="h-5 w-5 text-primary" />
                  </div>
                  Total Messages
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-primary">{stats.totalMessages}</p>
              </CardContent>
            </Card>

            {/* Activity */}
            <Card className="rounded-3xl border-2 border-primary/10">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="p-3 rounded-xl bg-primary/10">
                    <TrendingUp className="h-5 w-5 text-primary" />
                  </div>
                  Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-muted rounded-xl">
                  <span className="text-muted-foreground">Last 24 hours</span>
                  <span className="font-bold text-foreground">{stats.messagesLast24h} messages</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted rounded-xl">
                  <span className="text-muted-foreground">Last 7 days</span>
                  <span className="font-bold text-foreground">{stats.messagesLast7d} messages</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted rounded-xl">
                  <span className="text-muted-foreground">Active users (7d)</span>
                  <span className="font-bold text-foreground">{stats.activeUsers} users</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

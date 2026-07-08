import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/i18n/LanguageContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { User, Loader2, ArrowLeft, Lock, Sparkles, Send, Share2, Copy, MessageCircle, Camera, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { copyUsername, copyToClipboard } from '@/utils/sharing';
import { shareCardAsImage } from '@/utils/shareCard';

// Lazy-loaded: these dialogs are only rendered once the user opens them,
// so keeping them out of the main PublicProfile chunk shrinks first-load JS.
const MessageComposer = lazy(() => import('@/components/messaging/MessageComposer'));
const DealCardComposer = lazy(() => import('@/components/deals/DealCardComposer').then(m => ({ default: m.DealCardComposer })));

interface Profile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_public: boolean | null;
  account_type?: string | null;
}



const LABELS: Record<string, Record<string, string>> = {
  ar: {
    sendMessage: 'إرسال رسالة', talkTo: 'تحدث مع', goBack: 'العودة',
    privateProfile: 'هذا الملف خاص', userNotFound: 'لم يتم العثور على هذا المستخدم',
    commStyle: 'نمط التواصل', shareProfile: 'مشاركة', linkCopied: 'تم نسخ الرابط!',
    usernameCopied: 'تم نسخ اسم المستخدم', joinSovereign: 'انضم إلى Sovereign',
    changeAvatar: 'تغيير الصورة', removeAvatar: 'إزالة الصورة',
    encrypted: 'مشفّر من طرف إلى طرف',
    discoverStyle: 'اكتشف نمط تواصلك',
  },
  en: {
    sendMessage: 'Send Message', talkTo: 'Talk to', goBack: 'Go back',
    privateProfile: 'This profile is private', userNotFound: 'User not found',
    commStyle: 'Communication Style', shareProfile: 'Share', linkCopied: 'Link copied!',
    usernameCopied: 'Username copied', joinSovereign: 'Join Sovereign',
    changeAvatar: 'Change Photo', removeAvatar: 'Remove Photo',
    encrypted: 'End-to-end encrypted',
    discoverStyle: 'Discover your communication style',
  },
  fr: {
    sendMessage: 'Envoyer un message', talkTo: 'Parler à', goBack: 'Retour',
    privateProfile: 'Ce profil est privé', userNotFound: 'Utilisateur introuvable',
    commStyle: 'Style de communication', shareProfile: 'Partager', linkCopied: 'Lien copié!',
    usernameCopied: 'Nom copié', joinSovereign: 'Rejoindre Sovereign',
    changeAvatar: 'Changer la photo', removeAvatar: 'Supprimer la photo',
    encrypted: 'Chiffré de bout en bout',
    discoverStyle: 'Découvrez votre style de communication',
  },
  es: {
    sendMessage: 'Enviar mensaje', talkTo: 'Hablar con', goBack: 'Volver',
    privateProfile: 'Este perfil es privado', userNotFound: 'Usuario no encontrado',
    commStyle: 'Estilo de comunicación', shareProfile: 'Compartir', linkCopied: 'Enlace copiado!',
    usernameCopied: 'Usuario copiado', joinSovereign: 'Unirse a Sovereign',
    changeAvatar: 'Cambiar foto', removeAvatar: 'Eliminar foto',
    encrypted: 'Cifrado de extremo a extremo',
    discoverStyle: 'Descubre tu estilo de comunicación',
  },
};

export default function PublicProfile() {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [showDealCard, setShowDealCard] = useState(false);
  
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const l = LABELS[language] || LABELS.en;
  const isOwnProfile = profile?.id === user?.id;

  useEffect(() => {
    const fetchProfile = async () => {
      if (!username) return;
      if (!username.startsWith('@')) {
        setNotFound(true);
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      const cleanUsername = username.replace(/^@/, '');

      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, bio, is_public, account_type')
        .eq('username', cleanUsername)
        .single();

      if (error || !data) {
        setNotFound(true);
        setIsLoading(false);
        return;
      }

      setProfile(data as Profile);
      const displayName = data.display_name || cleanUsername;
      document.title = `${displayName} — Sovereign`;

      setIsLoading(false);
    };
    fetchProfile();
  }, [username, language]);

  const handleShare = () => {
    if (!profile?.username) return;
    const displayName = profile.display_name || profile.username;
    shareCardAsImage(
      'profile-share-card',
      `${displayName} — Sovereign`,
      `Check out ${displayName}'s communication style on Sovereign!\n${window.location.origin}/@${profile.username}`
    );
  };

  const handleCopyUsername = () => {
    if (!profile?.username) return;
    copyUsername(profile.username, l.usernameCopied);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !isOwnProfile) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Max 10MB');
      return;
    }

    setIsUploading(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${user.id}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
      const avatar_url = `${urlData.publicUrl}?t=${Date.now()}`;

      await supabase.from('profiles').update({ avatar_url, updated_at: new Date().toISOString() }).eq('id', user.id);
      setProfile(prev => prev ? { ...prev, avatar_url } : prev);
      toast.success('✨');
    } catch (err: any) {
      console.error('Upload error:', err);
      toast.error('Upload failed: ' + (err.message || ''));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user || !isOwnProfile) return;
    await supabase.from('profiles').update({ avatar_url: null, updated_at: new Date().toISOString() }).eq('id', user.id);
    setProfile(prev => prev ? { ...prev, avatar_url: null } : prev);
    toast.success('✨');
  };



  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
          <User className="h-10 w-10 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold mb-2">{l.userNotFound}</h1>
        <p className="text-muted-foreground mb-6">@{username?.replace(/^@/, '')}</p>
        <Button onClick={() => navigate('/')} variant="outline" className="rounded-xl">
          <ArrowLeft className="h-4 w-4 me-2" />
          {l.goBack}
        </Button>
      </div>
    );
  }

  if (profile && !profile.is_public && !isOwnProfile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
          <Lock className="h-10 w-10 text-muted-foreground" />
        </div>
        <h1 className="text-xl font-bold mb-1">{profile.display_name || profile.username}</h1>
        <p className="text-sm text-muted-foreground mb-6">{l.privateProfile}</p>
        <Button onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/home')} variant="outline" className="rounded-xl">
          <ArrowLeft className="h-4 w-4 me-2" />
          {l.goBack}
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 py-8">
        <Button variant="ghost" size="icon" onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/home')} className="mb-6 h-11 w-11 rounded-xl">
          <ArrowLeft className="h-5 w-5" />
        </Button>

        {/* VIP Profile Card — shareable as image */}
        <div id="profile-share-card" className="relative overflow-hidden rounded-2xl p-8 text-center" style={{ background: 'linear-gradient(135deg, hsl(220 15% 10%), hsl(220 20% 16%))' }}>
          <div className="absolute inset-0 opacity-10" style={{ background: 'radial-gradient(circle at 30% 20%, hsl(45 80% 60%), transparent 60%)' }} />
          <div className="relative z-10">
            {/* Avatar */}
            <div className="relative inline-block mb-4">
              <Avatar className="h-24 w-24 mx-auto ring-4 ring-amber-500/20">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-white/10 text-white text-3xl">
                  {profile?.display_name?.[0] || <User className="h-10 w-10" />}
                </AvatarFallback>
              </Avatar>
              {isOwnProfile && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -end-1 h-8 w-8 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-lg"
                  disabled={isUploading}
                >
                  {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleAvatarChange} />
            </div>

            {isOwnProfile && profile?.avatar_url && (
              <button onClick={handleRemoveAvatar} className="text-xs text-white/40 hover:text-red-400 mb-2 block mx-auto">
                {l.removeAvatar}
              </button>
            )}

            <h1 className="text-2xl font-bold text-white mb-1">{profile?.display_name}</h1>
            <p className="text-white/50 text-sm mb-3">@{profile?.username}</p>

            {profile?.bio && (
              <p className="text-sm text-white/60 mb-4 max-w-xs mx-auto">{profile.bio}</p>
            )}



            {/* E2E badge */}
            <div className="flex items-center justify-center gap-1.5 mb-2">
              <Shield className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-xs text-white/40">{l.encrypted}</span>
            </div>

            <p className="text-[10px] text-white/20 mt-3">Sovereign — Smart Communication</p>
          </div>
        </div>

        {/* Action Buttons — outside card for clean share image */}
        <div className="flex gap-3 justify-center flex-wrap mt-6">
          {user && !isOwnProfile && (
            <Button onClick={() => setShowComposer(true)} className="rounded-xl h-12 px-6 text-base">
              <Send className="h-5 w-5 me-2" />
              {l.sendMessage}
            </Button>
          )}
          {user && !isOwnProfile && profile?.account_type === 'celebrity' && (
            <Button onClick={() => setShowDealCard(true)} variant="outline" className="rounded-xl h-12 px-6 text-base border-blue-500/40 text-blue-600">
              <Sparkles className="h-5 w-5 me-2" />
              {language === 'ar' ? 'إرسال عرض عمل' : 'Send Deal'}
            </Button>
          )}
          {!user && (
            <Button onClick={() => navigate('/')} className="rounded-xl h-12 px-6 text-base">
              <MessageCircle className="h-5 w-5 me-2" />
              {l.joinSovereign}
            </Button>
          )}
          <Button variant="outline" onClick={handleShare} className="rounded-xl h-12 px-5 text-sm">
            <Share2 className="h-4 w-4 me-2" />
            {l.shareProfile}
          </Button>
          <Button variant="outline" size="icon" onClick={handleCopyUsername} className="h-12 w-12 rounded-xl">
            <Copy className="h-5 w-5" />
          </Button>
        </div>

        {/* CTA for non-logged-in visitors */}
        {!user && (
          <Card className="mt-6 p-5 text-center border-primary/10 bg-primary/5">
            <Sparkles className="h-6 w-6 text-primary mx-auto mb-2" />
            <p className="text-sm font-semibold mb-2">{l.discoverStyle}</p>
            <Button onClick={() => navigate('/')} size="sm" className="rounded-xl">
              {l.joinSovereign}
            </Button>
          </Card>
        )}

        <p className="text-center text-xs text-muted-foreground mt-8">
          Sovereign — Smart Communication
        </p>
      </div>

      {profile && (
        <Suspense fallback={null}>
          <MessageComposer
            isOpen={showComposer}
            onClose={() => setShowComposer(false)}
            recipient={profile}
            onMessageSent={() => { setShowComposer(false); toast.success('Sent ✨'); }}
          />
        </Suspense>
      )}
      {profile && (
        <Suspense fallback={null}>
          <DealCardComposer
            open={showDealCard}
            onOpenChange={setShowDealCard}
            celebrityId={profile.id}
            celebrityName={profile.username}
          />
        </Suspense>
      )}
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BottomNavigation } from '@/components/BottomNavigation';
import { toast } from 'sonner';
import { Camera, User, Loader2, Check, Mail, AtSign, FileText, Shield, LogOut, Trash2, Share2, ShieldCheck, Copy } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { SovereignRolePanel } from '@/components/profile/SovereignRolePanel';

interface Profile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_public: boolean | null;
}

export default function ProfilePage() {
  const { user, loading, signOut } = useAuth();
  const { isRTL } = useLanguage();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [isPublic, setIsPublic] = useState(true);

  useEffect(() => {
    if (!loading && !user) navigate('/');
  }, [user, loading, navigate]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (data) {
        setProfile(data);
        setDisplayName(data.display_name || '');
        setUsername(data.username || '');
        setBio(data.bio || '');
        setIsPublic(data.is_public ?? true);
      }
      setIsLoading(false);
    };
    if (user) fetchProfile();
  }, [user]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast.error(isRTL ? 'يرجى اختيار صورة' : 'Please select an image');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error(isRTL ? 'الصورة كبيرة جداً (الحد 10 ميغابايت)' : 'Image too large (max 10MB)');
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;

      // Upload directly to bucket root (bucket name is 'avatars')
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { 
          upsert: true,
          contentType: file.type,
        });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);
      if (updateError) throw updateError;

      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null);
      toast.success(isRTL ? 'تم تحديث الصورة ✨' : 'Photo updated ✨');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(isRTL ? 'فشل رفع الصورة: ' + (error.message || '') : 'Upload failed: ' + (error.message || ''));
    } finally {
      setIsUploading(false);
      // Reset input so same file can be selected again
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName.trim() || null,
          username: username.trim().toLowerCase() || null,
          bio: bio.trim() || null,
          is_public: isPublic,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
      if (error) throw error;
      toast.success(isRTL ? 'تم الحفظ ✨' : 'Saved ✨');
    } catch (error) {
      console.error('Save error:', error);
      toast.error(isRTL ? 'فشل الحفظ' : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const handleShareUsername = async () => {
    const link = `${window.location.origin}/@${username}`;
    const shareData = {
      title: 'Sovereign',
      text: isRTL 
        ? `تواصل معي على Sovereign: @${username}` 
        : `Reach me on Sovereign: @${username}`,
      url: link,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(link);
        toast.success(isRTL ? 'تم نسخ الرابط!' : 'Link copied!');
      }
    } catch {
      // Fallback
      try {
        await navigator.clipboard.writeText(link);
        toast.success(isRTL ? 'تم نسخ الرابط!' : 'Link copied!');
      } catch {
        toast.error(isRTL ? 'فشل النسخ' : 'Copy failed');
      }
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    try {
      // Permanent deletion runs server-side: wipes all data AND removes the auth
      // account, so the email becomes available again for a new signup.
      const { data, error } = await supabase.functions.invoke('delete-account');
      if (error || (data as any)?.error) throw error || new Error((data as any).error);
      await signOut();
      toast.success(isRTL ? 'تم حذف حسابك بالكامل' : 'Your account has been deleted');
      navigate('/');
    } catch {
      toast.error(isRTL ? 'فشل حذف الحساب' : 'Failed to delete account');
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <header className="fixed top-0 right-0 left-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border safe-area-inset-top">
        <div className="max-w-lg mx-auto flex h-14 items-center justify-between px-4">
          <h1 className="font-bold text-lg">{isRTL ? 'الملف الشخصي' : 'Profile'}</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSave}
            disabled={isSaving}
            className="h-10 w-10 rounded-xl touch-feedback"
          >
            {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5 text-primary" />}
          </Button>
        </div>
      </header>

      <main className="max-w-lg mx-auto pt-16 pb-24 px-4">
        {/* Avatar */}
        <div className="flex flex-col items-center mb-6 mt-2">
          <div className="relative">
            <Avatar className="h-24 w-24 ring-3 ring-primary/20">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                {displayName?.[0] || <User className="h-10 w-10" />}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="absolute bottom-0 end-0 h-9 w-9 rounded-full bg-primary text-primary-foreground shadow-md flex items-center justify-center touch-feedback"
            >
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            </button>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleFileChange} className="hidden" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">{isRTL ? 'اضغط لتغيير الصورة' : 'Tap to change photo'}</p>
        </div>

        {/* Share Username Card */}
        {username && (
          <div className="mb-5 p-4 rounded-2xl bg-card border border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <AtSign className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">@{username}</p>
                  <p className="text-xs text-muted-foreground truncate">directly.app/@{username}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => { navigator.clipboard.writeText(`@${username}`); toast.success(isRTL ? 'تم النسخ' : 'Copied!'); }}
                  className="h-9 w-9 rounded-xl"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleShareUsername}
                  className="h-9 rounded-xl gap-1.5 text-xs font-semibold"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  {isRTL ? 'شارك' : 'Share'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="flex items-center gap-2 text-sm">
              <User className="h-3.5 w-3.5 text-primary" />
              {isRTL ? 'الاسم الظاهر' : 'Display Name'}
            </Label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder={isRTL ? 'محمد أحمد' : 'John Doe'} className="h-12 text-base rounded-xl" />
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-2 text-sm">
              <AtSign className="h-3.5 w-3.5 text-primary" />
              {isRTL ? 'اسم المستخدم' : 'Username'}
            </Label>
            <Input value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} placeholder="username" className="h-12 text-base rounded-xl" dir="ltr" maxLength={20} />
            <p className="text-xs text-muted-foreground">{isRTL ? 'يتم إنشاء username تلقائياً عند التسجيل' : 'Auto-generated on signup, you can customize it'}</p>
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-2 text-sm">
              <Mail className="h-3.5 w-3.5 text-primary" />
              {isRTL ? 'البريد الإلكتروني' : 'Email'}
            </Label>
            <Input value={user?.email || ''} disabled className="h-12 text-base rounded-xl bg-muted/50" />
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-2 text-sm">
              <FileText className="h-3.5 w-3.5 text-primary" />
              {isRTL ? 'نبذة عنك' : 'About you'}
            </Label>
            <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder={isRTL ? 'اكتب نبذة مختصرة...' : 'Write a short bio...'} className="min-h-[80px] text-base rounded-xl resize-none" maxLength={200} />
            <p className="text-xs text-muted-foreground text-end">{bio.length}/200</p>
          </div>

          {/* Privacy toggle */}
          <div className="p-4 rounded-2xl bg-card border border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Shield className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">{isRTL ? 'ملف شخصي عام' : 'Public Profile'}</p>
                  <p className="text-xs text-muted-foreground">{isRTL ? 'يمكن للآخرين إيجادك' : 'Others can find you'}</p>
                </div>
              </div>
              <button
                onClick={() => setIsPublic(!isPublic)}
                className={`w-12 h-7 rounded-full transition-colors ${isPublic ? 'bg-primary' : 'bg-muted'}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${isPublic ? (isRTL ? '-translate-x-0.5' : 'translate-x-6') : (isRTL ? '-translate-x-6' : 'translate-x-0.5')}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Save */}
        <Button onClick={handleSave} disabled={isSaving} className="w-full h-13 mt-6 text-base font-semibold rounded-2xl glow-gold">
          {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : isRTL ? 'حفظ التغييرات' : 'Save Changes'}
        </Button>

        {/* Sovereign role layer */}
        <SovereignRolePanel />



        {/* Links */}
        <div className="mt-6 p-4 rounded-2xl bg-card border border-border space-y-2">
          <a href="/security" className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors touch-feedback">
            <span className="text-sm font-medium flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              {isRTL ? 'الأمان والخصوصية' : 'Security & Privacy'}
            </span>
            <span className="text-xs text-muted-foreground">→</span>
          </a>
          <a href="/privacy" className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors touch-feedback">
            <span className="text-sm font-medium">{isRTL ? 'سياسة الخصوصية' : 'Privacy Policy'}</span>
            <span className="text-xs text-muted-foreground">→</span>
          </a>
          <a href="/terms" className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors touch-feedback">
            <span className="text-sm font-medium">{isRTL ? 'شروط الخدمة' : 'Terms of Service'}</span>
            <span className="text-xs text-muted-foreground">→</span>
          </a>
        </div>

        {/* Sign Out */}
        <Button variant="ghost" onClick={handleSignOut} className="w-full mt-3 h-12 text-destructive rounded-xl">
          <LogOut className="h-4 w-4 me-2" />
          {isRTL ? 'تسجيل الخروج' : 'Sign Out'}
        </Button>

        {/* Delete Account */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" className="w-full mt-1 h-12 text-destructive/60 rounded-xl text-xs">
              <Trash2 className="h-3.5 w-3.5 me-2" />
              {isRTL ? 'حذف الحساب نهائياً' : 'Delete Account Permanently'}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>{isRTL ? 'حذف الحساب؟' : 'Delete Account?'}</AlertDialogTitle>
              <AlertDialogDescription>
                {isRTL
                  ? 'سيتم حذف جميع بياناتك ورسائلك نهائياً. هذا الإجراء غير قابل للتراجع.'
                  : 'All your data and messages will be permanently deleted. This action cannot be undone.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">{isRTL ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive text-destructive-foreground rounded-xl">
                {isRTL ? 'حذف نهائياً' : 'Delete Forever'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <p className="text-center text-xs text-muted-foreground mt-4 mb-2">Sovereign v1.0 · © 2026</p>
      </main>

      <BottomNavigation />
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MessageSquare, Loader2, Eye, EyeOff, ShieldCheck } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  username: z.string().min(3).max(15).regex(/^[a-zA-Z0-9_]+$/),
  displayName: z.string().min(2).max(50),
});

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  
  const { signIn, signUp, user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Where to go after auth: honor a safe in-app ?redirect= path (e.g. manager invite links).
  const rawRedirect = searchParams.get('redirect') || '';
  const redirectTarget = rawRedirect.startsWith('/') && !rawRedirect.startsWith('//')
    ? rawRedirect
    : '/home';

  useEffect(() => {
    if (!loading && user) navigate(redirectTarget, { replace: true });
  }, [user, loading, navigate, redirectTarget]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isLogin) {
        const validation = loginSchema.safeParse({ email, password });
        if (!validation.success) {
          setError('Please check your email and password');
          setIsLoading(false);
          return;
        }
        const { error: signInError } = await signIn(email, password);
        if (signInError) {
          if (signInError.message.includes('Invalid login credentials')) {
            setError('Your key is incorrect — try again.');
          } else {
            setError('Something didn\'t work — your messages are safe.');
          }
        }
      } else {
        const validation = signupSchema.safeParse({ email, password, username, displayName });
        if (!validation.success) {
          const firstError = validation.error.errors[0];
          if (firstError?.path[0] === 'username') {
            setError('Username must be 3-15 characters (letters, numbers, _ only)');
          } else if (firstError?.path[0] === 'displayName') {
            setError('Display name must be at least 2 characters');
          } else if (firstError?.path[0] === 'email') {
            setError('Please enter a valid email');
          } else if (firstError?.path[0] === 'password') {
            setError('Password must be at least 6 characters');
          }
          setIsLoading(false);
          return;
        }
        const { error: signUpError } = await signUp(email, password, username, displayName);
        if (signUpError) {
          if (signUpError.message.includes('already registered')) {
            setError('Looks like you already have an account — sign in.');
          } else {
            setError('Something didn\'t work — your messages are safe.');
          }
        }
      }
    } catch {
      setError('Something didn\'t work — your messages are safe.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError('Please enter your email first');
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setResetSent(true);
      setError('');
    } catch {
      setError('Something didn\'t work — try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setIsForgotPassword(false);
    setResetSent(false);
    setError('');
    setEmail('');
    setPassword('');
    setUsername('');
    setDisplayName('');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <MessageSquare className="h-7 w-7" />
          </div>
          <span className="text-2xl font-bold text-foreground">Sovereign</span>
          <p className="text-sm text-muted-foreground text-center max-w-[250px]">
            Smart Communication
          </p>
        </div>

        {/* Card */}
        <div className="bg-card rounded-2xl p-6 border border-border shadow-lg">
          <h1 className="text-xl font-semibold text-center mb-1">
            {isLogin ? 'Welcome back' : 'Start your journey'}
          </h1>
          <p className="text-xs text-muted-foreground text-center mb-6">
            {isLogin ? 'Your messages are waiting — everything in its place.' : 'Your account is about to be ready.'}
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-sm text-destructive text-center">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="displayName" className="text-sm font-medium">
                    What name do you want the world to see you by?
                  </Label>
                  <Input
                    id="displayName"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="John Doe"
                    className="h-11"
                    autoComplete="name"
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-sm font-medium">
                    Your name on Sovereign — people will find you by it.
                  </Label>
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="username"
                    className="h-11"
                    autoComplete="username"
                    disabled={isLoading}
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                {isLogin ? 'Email' : 'Your email — this will be your private gateway.'}
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="h-11"
                autoComplete="email"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                {isLogin ? 'Password' : 'Your private key — only you know it.'}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-11 pe-10"
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {isLogin && (
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-xs text-primary hover:underline mt-1"
                disabled={isLoading}
              >
                Forgot your password?
              </button>
            )}

            {resetSent && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 mt-2">
                <p className="text-sm text-emerald-600 dark:text-emerald-400 text-center">
                  Check your email — we sent you a recovery link.
                </p>
              </div>
            )}

            <Button type="submit" className="w-full h-11 font-medium" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                isLogin ? 'Sign In' : 'Start your journey'
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or</span>
            </div>
          </div>

          {/* Google OAuth */}
          <Button
            type="button"
            variant="outline"
            className="w-full h-11 font-medium gap-3"
            disabled={isLoading}
            onClick={async () => {
              setIsLoading(true);
              setError('');
              const oauthRedirect = redirectTarget !== '/home'
                ? `${window.location.origin}/?redirect=${encodeURIComponent(redirectTarget)}`
                : window.location.origin;
              const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: oauthRedirect } });
              if (error) setError('Failed to sign in with Google');
              setIsLoading(false);
            }}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </Button>

          {/* Apple OAuth */}
          <Button
            type="button"
            variant="outline"
            className="w-full h-11 font-medium gap-3 mt-3"
            disabled={isLoading}
            onClick={async () => {
              setIsLoading(true);
              setError('');
              const oauthRedirect = redirectTarget !== '/home'
                ? `${window.location.origin}/?redirect=${encodeURIComponent(redirectTarget)}`
                : window.location.origin;
              const { error } = await supabase.auth.signInWithOAuth({ provider: 'apple', options: { redirectTo: oauthRedirect } });
              if (error) setError('Failed to sign in with Apple');
              setIsLoading(false);
            }}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
            Continue with Apple
          </Button>

          {/* E2E Trust badge */}
          <div className="flex items-center justify-center gap-1.5 mt-4 text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span className="text-[11px] font-medium">End-to-end encrypted · Zero tracking</span>
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            You must be 13 years or older to use Sovereign.
          </p>

          <div className="mt-5 text-center">
            <button type="button" onClick={switchMode} className="text-sm text-muted-foreground hover:text-primary transition-colors" disabled={isLoading}>
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <span className="font-medium text-primary">{isLogin ? 'Sign Up' : 'Sign In'}</span>
            </button>
          </div>
        </div>

        <div className="mt-6 text-center">
          <button onClick={() => navigate('/welcome')} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            What is Sovereign?
          </button>
        </div>
      </div>
    </div>
  );
}

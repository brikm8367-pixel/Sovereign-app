import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

/**
 * Short custom-link resolver: /s/:slug -> /@username (send / deal page).
 * Keeps links short and shareable (e.g. sovereign-app.lovable.app/s/omar).
 */
export default function SlugRedirect() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    const resolve = async () => {
      if (!slug) {
        navigate('/', { replace: true });
        return;
      }
      const { data } = await supabase
        .from('profiles')
        .select('username')
        .ilike('slug', slug)
        .maybeSingle();

      if (data?.username) {
        navigate(`/@${data.username}`, { replace: true });
      } else {
        navigate('/404', { replace: true });
      }
    };
    resolve();
  }, [slug, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
    </div>
  );
}

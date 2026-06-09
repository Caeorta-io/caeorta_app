import { useEffect } from 'react';

import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/store';

/**
 * Restores any persisted session on boot (from the SecureStore-backed adapter)
 * and keeps the Zustand auth store in sync with Supabase auth events for the
 * lifetime of the app. Mount once, at the root layout.
 *
 * `loading` stays true until the initial `getSession()` settles, which gates the
 * splash screen so a logged-in user never flashes the sign-in screen on launch.
 */
export function useAuthLifecycle(): void {
  const setSession = useAuthStore((s) => s.setSession);
  const setLoading = useAuthStore((s) => s.setLoading);

  useEffect(() => {
    let active = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (active) setSession(data.session);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    // Sign-in, sign-out, and token refresh all surface here, keeping the store
    // authoritative without each screen having to poll.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [setSession, setLoading]);
}

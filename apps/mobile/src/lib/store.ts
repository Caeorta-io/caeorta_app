import { create } from 'zustand';
import type { Session, User } from '@caeorta/supabase';

/**
 * Client-side auth state. This is the only Zustand slice in v1 — keep it that
 * way until a second concern genuinely needs global client state. Server state
 * (queries, caches) belongs in TanStack Query, not here.
 */
interface AuthState {
  /** The current Supabase session, or null when signed out. */
  session: Session | null;
  /** Convenience mirror of `session.user`; null when signed out. */
  user: User | null;
  /** True while the initial session restore is in flight (gates the splash screen). */
  loading: boolean;
  /** Replace the session (and derived user). Called from the auth lifecycle listener. */
  setSession: (session: Session | null) => void;
  /** Clear the session and user. */
  clearSession: () => void;
  /** Flip the boot-time loading flag once session restore completes. */
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  loading: true,
  setSession: (session) => set({ session, user: session?.user ?? null }),
  clearSession: () => set({ session: null, user: null }),
  setLoading: (loading) => set({ loading }),
}));

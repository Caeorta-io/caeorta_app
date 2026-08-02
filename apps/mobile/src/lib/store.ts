import { create } from 'zustand';
import type { Session, User } from '@caeorta/supabase';

/**
 * Client-side auth state. Server state (queries, caches) belongs in TanStack Query,
 * not here.
 *
 * This was the ONLY Zustand slice until session 36, when the new-DTC notification
 * surface needed two more (S8 preferences + the acknowledged-DTC set). Those live in
 * `lib/dtcNotificationStore.ts` rather than here, because one of them carries a native
 * `expo-secure-store` import and this file must stay free of native modules — every
 * graph that touches auth pulls it in. Keep that split: pure in-memory slices may join
 * this file; anything doing native I/O gets its own module beside its feature.
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

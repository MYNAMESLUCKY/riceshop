import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { getEffectiveRole } from '../lib/authz';

const buildFallbackProfile = (user, fallbackRole = 'user') => ({
  role: getEffectiveRole(user, fallbackRole),
  full_name: user?.user_metadata?.full_name || '',
});

export const useAuthStore = create((set) => ({
  user: null,
  profile: null,
  loading: true,

  initialize: async () => {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) throw error;

      if (session?.user) {
        set({ user: session.user });
        await useAuthStore.getState().fetchProfile(session.user.id);
      } else {
        set({ loading: false });
      }

      supabase.auth.onAuthStateChange(async (_event, nextSession) => {
        if (nextSession?.user) {
          set({ user: nextSession.user });
          await useAuthStore.getState().fetchProfile(nextSession.user.id);
        } else {
          set({ user: null, profile: null, loading: false });
        }
      });
    } catch (error) {
      console.error('Error initializing auth:', error.message);
      set({ loading: false });
    }
  },

  fetchProfile: async (userId) => {
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();

      if (error && error.code === 'PGRST116') {
        const role = getEffectiveRole(authUser, 'user');

        const { data: newProfile, error: upsertErr } = await supabase
          .from('profiles')
          .upsert({ id: userId, role, full_name: authUser?.user_metadata?.full_name || null })
          .select()
          .single();

        if (upsertErr) {
          console.warn('Profile create skipped (DB tables might be missing):', upsertErr.message);
        }

        set({ profile: newProfile || buildFallbackProfile(authUser, role), loading: false });
        return;
      }

      if (error) throw error;

      const role = getEffectiveRole(authUser, data?.role);
      const fullName = authUser?.user_metadata?.full_name || data?.full_name || '';
      if (data?.role !== role) {
        const { error: syncRoleError } = await supabase.from('profiles').update({ role }).eq('id', userId);

        if (syncRoleError) {
          console.warn('Profile role sync skipped:', syncRoleError.message);
        }
      }

      set({ profile: { ...data, role, full_name: fullName }, loading: false });
    } catch (error) {
      console.warn('Profile fetch skipped (DB tables might be missing):', error.message);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      set({ profile: buildFallbackProfile(user), loading: false });
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, profile: null });
  },
}));

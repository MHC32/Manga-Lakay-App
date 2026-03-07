// src/stores/auth.store.ts
import {create} from 'zustand';
import {UserProfile} from '../types/firebase.types';
import {authService} from '../services/firebase/auth.service';
import {userService} from '../services/firebase/user.service';

interface AuthState {
  user: UserProfile | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  // Actions
  setUser: (user: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  setError: (error: string | null) => void;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: false,
  isInitialized: false,
  error: null,

  setUser: (user) => set({user}),
  setLoading: (isLoading) => set({isLoading}),
  setInitialized: (isInitialized) => set({isInitialized}),
  setError: (error) => set({error}),

  signOut: async () => {
    set({isLoading: true});
    try {
      await authService.signOut();
      set({user: null, error: null});
    } catch (e) {
      set({error: e instanceof Error ? e.message : 'Erreur de déconnexion'});
    } finally {
      set({isLoading: false});
    }
  },

  refreshProfile: async () => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      return;
    }
    const profile = await userService.getProfile(currentUser.uid);
    set({user: profile});
  },
}));

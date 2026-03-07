// src/stores/library.store.ts
import {create} from 'zustand';
import {LibraryEntry} from '../types/firebase.types';
import {LibraryStatus} from '../types/mangadex.types';
import {libraryService} from '../services/firebase/library.service';

interface LibraryState {
  entries: LibraryEntry[];
  isLoading: boolean;
  error: string | null;
  unsubscribe: (() => void) | null;

  // Getters calculés
  getEntry: (mangaId: string) => LibraryEntry | undefined;
  getByStatus: (status: LibraryStatus) => LibraryEntry[];
  isInLibrary: (mangaId: string) => boolean;

  // Actions
  loadLibrary: (uid: string) => Promise<void>;
  subscribeToLibrary: (uid: string) => void;
  unsubscribeFromLibrary: () => void;
  addToLibrary: (uid: string, mangaId: string, status: LibraryStatus) => Promise<void>;
  updateStatus: (uid: string, mangaId: string, status: LibraryStatus) => Promise<void>;
  removeFromLibrary: (uid: string, mangaId: string) => Promise<void>;
  markChapterRead: (uid: string, mangaId: string, chapterId: string) => Promise<void>;
  setEntries: (entries: LibraryEntry[]) => void;
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  entries: [],
  isLoading: false,
  error: null,
  unsubscribe: null,

  getEntry: (mangaId) => get().entries.find(e => e.mangaId === mangaId),
  getByStatus: (status) => get().entries.filter(e => e.status === status),
  isInLibrary: (mangaId) => get().entries.some(e => e.mangaId === mangaId),

  setEntries: (entries) => set({entries}),

  loadLibrary: async (uid) => {
    set({isLoading: true, error: null});
    try {
      const entries = await libraryService.getLibrary(uid);
      set({entries});
    } catch (e) {
      set({error: e instanceof Error ? e.message : 'Erreur chargement bibliothèque'});
    } finally {
      set({isLoading: false});
    }
  },

  subscribeToLibrary: (uid) => {
    // Désabonner l'ancienne subscription si elle existe
    const current = get().unsubscribe;
    if (current) {
      current();
    }

    const unsubFn = libraryService.subscribeToLibrary(uid, (entries) => {
      set({entries});
    });
    set({unsubscribe: unsubFn});
  },

  unsubscribeFromLibrary: () => {
    const current = get().unsubscribe;
    if (current) {
      current();
      set({unsubscribe: null});
    }
  },

  addToLibrary: async (uid, mangaId, status) => {
    await libraryService.addToLibrary(uid, mangaId, status);
    // Le stream onSnapshot mettra à jour les entries automatiquement
  },

  updateStatus: async (uid, mangaId, status) => {
    // Mise à jour optimiste locale
    set(state => ({
      entries: state.entries.map(e =>
        e.mangaId === mangaId ? {...e, status} : e,
      ),
    }));
    await libraryService.updateStatus(uid, mangaId, status);
  },

  removeFromLibrary: async (uid, mangaId) => {
    // Suppression optimiste locale
    set(state => ({
      entries: state.entries.filter(e => e.mangaId !== mangaId),
    }));
    await libraryService.removeFromLibrary(uid, mangaId);
  },

  markChapterRead: async (uid, mangaId, chapterId) => {
    // Mise à jour optimiste locale
    set(state => ({
      entries: state.entries.map(e =>
        e.mangaId === mangaId
          ? {
              ...e,
              chaptersRead: [...new Set([...e.chaptersRead, chapterId])],
              lastChapterRead: chapterId,
            }
          : e,
      ),
    }));
    await libraryService.markChapterRead(uid, mangaId, chapterId);
  },
}));

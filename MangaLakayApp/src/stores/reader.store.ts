// src/stores/reader.store.ts
import {create} from 'zustand';
import {ReaderSettings} from '../types/mangadex.types';
import {mmkv} from '../services/cache/mmkv';

const READER_SETTINGS_KEY = 'user:readerSettings';

const defaultSettings: ReaderSettings = {
  direction: 'rtl', // Manga japonais: droite à gauche par défaut
  quality: 'standard',
};

function loadSettings(): ReaderSettings {
  const raw = mmkv.getString(READER_SETTINGS_KEY);
  if (!raw) {
    return defaultSettings;
  }
  try {
    return JSON.parse(raw) as ReaderSettings;
  } catch {
    return defaultSettings;
  }
}

interface ReaderState {
  currentChapterId: string | null;
  currentMangaId: string | null;
  currentPage: number;
  totalPages: number;
  settings: ReaderSettings;
  showControls: boolean;

  // Actions
  openChapter: (chapterId: string, mangaId: string, totalPages: number) => void;
  setPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  toggleControls: () => void;
  setShowControls: (show: boolean) => void;
  updateSettings: (settings: Partial<ReaderSettings>) => void;
  closeReader: () => void;
}

export const useReaderStore = create<ReaderState>((set, get) => ({
  currentChapterId: null,
  currentMangaId: null,
  currentPage: 0,
  totalPages: 0,
  settings: loadSettings(),
  showControls: false,

  openChapter: (chapterId, mangaId, totalPages) =>
    set({
      currentChapterId: chapterId,
      currentMangaId: mangaId,
      currentPage: 0,
      totalPages,
      showControls: false,
    }),

  setPage: (page) =>
    set(state => ({
      currentPage: Math.max(0, Math.min(page, state.totalPages - 1)),
    })),

  nextPage: () =>
    set(state => ({
      currentPage: Math.min(state.currentPage + 1, state.totalPages - 1),
    })),

  prevPage: () =>
    set(state => ({
      currentPage: Math.max(state.currentPage - 1, 0),
    })),

  toggleControls: () =>
    set(state => ({showControls: !state.showControls})),

  setShowControls: (showControls) => set({showControls}),

  updateSettings: (updates) => {
    const newSettings = {...get().settings, ...updates};
    mmkv.setString(READER_SETTINGS_KEY, JSON.stringify(newSettings));
    set({settings: newSettings});
  },

  closeReader: () =>
    set({
      currentChapterId: null,
      currentMangaId: null,
      currentPage: 0,
      totalPages: 0,
      showControls: false,
    }),
}));

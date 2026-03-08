// src/stores/search.store.ts
import {create} from 'zustand';

/**
 * Store pour la navigation cross-tab Explore → Search.
 * ExploreScreen y écrit un filtre (tagId + label), SearchScreen le lit au montage.
 */
interface SearchStore {
  pendingTagId: string | null;
  pendingTagLabel: string | null;
  pendingLanguageFilter: 'all' | 'fr_only' | null;
  setPendingTag: (tagId: string, label: string) => void;
  setPendingLanguageFilter: (filter: 'all' | 'fr_only') => void;
  clearPendingTag: () => void;
}

export const useSearchStore = create<SearchStore>(set => ({
  pendingTagId: null,
  pendingTagLabel: null,
  pendingLanguageFilter: null,
  setPendingTag: (tagId, label) => set({pendingTagId: tagId, pendingTagLabel: label}),
  setPendingLanguageFilter: (filter) => set({pendingLanguageFilter: filter}),
  clearPendingTag: () => set({pendingTagId: null, pendingTagLabel: null, pendingLanguageFilter: null}),
}));

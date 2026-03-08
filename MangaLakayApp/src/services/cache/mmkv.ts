// src/services/cache/mmkv.ts
import {createMMKV} from 'react-native-mmkv';

// Instance singleton MMKV (API v4 NitroModules)
export const storage = createMMKV({id: 'mangalakay-cache'});

export const mmkv = {
  getString: (key: string): string | undefined => storage.getString(key),
  setString: (key: string, value: string): void => storage.set(key, value),
  delete: (key: string): void => { storage.remove(key); },
  getAllKeys: (): string[] => storage.getAllKeys(),
  contains: (key: string): boolean => storage.contains(key),
  clearAll: (): void => storage.clearAll(),
};

// ─── Helpers historique des recherches (US-007, BR-011) ───────────────────────

const SEARCH_HISTORY_KEY = 'user:searchHistory';

export const getSearchHistory = (): string[] => {
  const raw = storage.getString(SEARCH_HISTORY_KEY);
  if (!raw) { return []; }
  try { return JSON.parse(raw) as string[]; } catch { return []; }
};

export const addToSearchHistory = (query: string): void => {
  const history = getSearchHistory().filter(
    q => q.toLowerCase() !== query.toLowerCase(),
  );
  const updated = [query, ...history].slice(0, 10);
  storage.set(SEARCH_HISTORY_KEY, JSON.stringify(updated));
};

export const clearSearchHistory = (): void => {
  storage.remove(SEARCH_HISTORY_KEY);
};

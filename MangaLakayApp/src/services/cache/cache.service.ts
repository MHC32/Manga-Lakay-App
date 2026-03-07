// src/services/cache/cache.service.ts
import {mmkv} from './mmkv';

interface CacheMeta {
  expiresAt: number; // unix ms
}

const META_PREFIX = 'cache:meta:';

function metaKey(key: string): string {
  return `${META_PREFIX}${key}`;
}

function isExpired(meta: CacheMeta): boolean {
  return Date.now() > meta.expiresAt;
}

export const cacheService = {
  /**
   * Récupère une valeur du cache. Retourne null si absente ou expirée.
   */
  get<T>(key: string): T | null {
    const metaStr = mmkv.getString(metaKey(key));
    if (!metaStr) {
      return null;
    }

    const meta: CacheMeta = JSON.parse(metaStr);
    if (isExpired(meta)) {
      // Nettoyer les données expirées
      mmkv.delete(key);
      mmkv.delete(metaKey(key));
      return null;
    }

    const raw = mmkv.getString(key);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },

  /**
   * Stocke une valeur avec TTL en heures.
   */
  set<T>(key: string, data: T, ttlHours: number): void {
    const meta: CacheMeta = {
      expiresAt: Date.now() + ttlHours * 60 * 60 * 1000,
    };
    mmkv.setString(key, JSON.stringify(data));
    mmkv.setString(metaKey(key), JSON.stringify(meta));
  },

  /**
   * Invalide une clé spécifique.
   */
  invalidate(key: string): void {
    mmkv.delete(key);
    mmkv.delete(metaKey(key));
  },

  /**
   * Invalide toutes les clés commençant par un préfixe.
   */
  invalidatePattern(prefix: string): void {
    const allKeys = mmkv.getAllKeys();
    for (const key of allKeys) {
      if (key.startsWith(prefix) && !key.startsWith(META_PREFIX)) {
        this.invalidate(key);
      }
    }
  },

  /**
   * Vérifie si une clé est encore valide (présente et non expirée).
   */
  isValid(key: string): boolean {
    const metaStr = mmkv.getString(metaKey(key));
    if (!metaStr) {
      return false;
    }
    const meta: CacheMeta = JSON.parse(metaStr);
    return !isExpired(meta);
  },

  /**
   * Vide tout le cache.
   */
  clear(): void {
    mmkv.clearAll();
  },
};

/**
 * Clés de cache typées pour éviter les typos.
 */
export const CacheKeys = {
  manga: (id: string) => `manga:${id}`,
  chapters: (mangaId: string) => `manga:${mangaId}:chapters`,
  stats: (mangaId: string) => `stats:${mangaId}`,
  search: (hash: string) => `search:${hash}`,
  trending: () => 'home:trending',
  newChapters: () => 'home:newChapters',
  chapterPages: (id: string) => `chapter:${id}:pages`,
  searchHistory: () => 'user:searchHistory',
  readerSettings: () => 'user:readerSettings',
  filterPrefs: () => 'user:filterPrefs',
} as const;

// src/services/mangadex/manga.service.ts
import {mangadexClient} from './client';
import {rawToManga} from './transformers';
import {cacheService, CacheKeys} from '../cache/cache.service';
import {
  Manga,
  MangaListParams,
  MangaListResponse,
  MangaDexMangaRaw,
} from '../../types/mangadex.types';
import {
  ALLOWED_CONTENT_RATINGS,
  ALLOWED_LANGUAGES,
  CACHE_TTL,
  PAGINATION,
} from '../../constants/api';

/** Sérialise un objet en JSON avec les clés triées pour garantir la stabilité des clés de cache. */
function stableStringify(obj: Record<string, unknown>): string {
  const sortedKeys = Object.keys(obj).sort();
  return JSON.stringify(obj, sortedKeys);
}

// Paramètres par défaut conformes BR-001 (filtrage contenu adulte)
const DEFAULT_PARAMS = {
  contentRating: [...ALLOWED_CONTENT_RATINGS],
  availableTranslatedLanguage: [...ALLOWED_LANGUAGES],
  includes: ['cover_art', 'author', 'artist'] as const,
};

export const mangaService = {
  /**
   * Recherche des mangas avec filtres. Cache TTL 30min.
   * BR-001: contentRating forcé à safe+suggestive.
   */
  async searchManga(
    params: MangaListParams = {},
    useCache = true,
  ): Promise<{mangas: Manga[]; total: number}> {
    const cacheKey = CacheKeys.search(stableStringify(params as Record<string, unknown>));

    if (useCache) {
      const cached = cacheService.get<{mangas: Manga[]; total: number}>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const response = await mangadexClient.get<MangaListResponse>('/manga', {
      params: {
        ...DEFAULT_PARAMS,
        limit: PAGINATION.defaultLimit,
        ...params,
        // Forcer BR-001 même si params override tentait de changer ça
        contentRating: [...ALLOWED_CONTENT_RATINGS],
      },
    });

    const result = {
      mangas: response.data.data.map(rawToManga),
      total: response.data.total,
    };

    cacheService.set(cacheKey, result, CACHE_TTL.search);
    return result;
  },

  /**
   * Récupère un manga par ID. Cache TTL 6h.
   */
  async getMangaById(mangaId: string): Promise<Manga | null> {
    const cacheKey = CacheKeys.manga(mangaId);
    const cached = cacheService.get<Manga>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await mangadexClient.get<{data: MangaDexMangaRaw}>(
        `/manga/${mangaId}`,
        {params: {includes: DEFAULT_PARAMS.includes}},
      );

      const manga = rawToManga(response.data.data);
      cacheService.set(cacheKey, manga, CACHE_TTL.manga);
      return manga;
    } catch {
      return null;
    }
  },

  /**
   * Récupère les tendances (mangas populaires). Cache TTL 2h.
   * Tri par nombre de follows décroissant.
   */
  async getTrending(limit = 20): Promise<Manga[]> {
    const cacheKey = CacheKeys.trending();
    const cached = cacheService.get<Manga[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const response = await mangadexClient.get<MangaListResponse>('/manga', {
      params: {
        ...DEFAULT_PARAMS,
        limit,
        order: {followedCount: 'desc'},
      },
    });

    const mangas = response.data.data.map(rawToManga);
    cacheService.set(cacheKey, mangas, CACHE_TTL.trending);
    return mangas;
  },

  /**
   * Récupère un manga aléatoire. Pas de cache (BR-011: manga aléatoire toujours frais).
   */
  async getRandom(): Promise<Manga | null> {
    try {
      const response = await mangadexClient.get<{data: MangaDexMangaRaw}>(
        '/manga/random',
        {
          params: {
            contentRating: [...ALLOWED_CONTENT_RATINGS],
            includes: DEFAULT_PARAMS.includes,
          },
        },
      );
      return rawToManga(response.data.data);
    } catch {
      return null;
    }
  },

  /**
   * Récupère plusieurs mangas par leurs IDs.
   */
  async getMangaByIds(mangaIds: string[]): Promise<Manga[]> {
    if (mangaIds.length === 0) {
      return [];
    }

    const response = await mangadexClient.get<MangaListResponse>('/manga', {
      params: {
        ...DEFAULT_PARAMS,
        ids: mangaIds,
        limit: Math.min(mangaIds.length, PAGINATION.maxLimit),
      },
    });

    return response.data.data.map(rawToManga);
  },
};

// src/services/mangadex/chapter.service.ts
import {mangadexClient} from './client';
import {rawToChapter} from './transformers';
import {cacheService, CacheKeys} from '../cache/cache.service';
import {
  Chapter,
  ChapterPages,
  ChapterListResponse,
  MangaDexChapterRaw,
} from '../../types/mangadex.types';
import {ALLOWED_LANGUAGES, CACHE_TTL, PAGINATION} from '../../constants/api';

interface AtHomeServerResponse {
  result: string;
  baseUrl: string;
  chapter: {
    hash: string;
    data: string[];
    dataSaver: string[];
  };
}

export const chapterService = {
  /**
   * Récupère la liste des chapitres d'un manga.
   * Priorité: fr → en (BR-002). Cache TTL 1h.
   */
  async getChapterFeed(
    mangaId: string,
    offset = 0,
    limit = PAGINATION.defaultLimit,
  ): Promise<{chapters: Chapter[]; total: number}> {
    const cacheKey =
      offset === 0
        ? CacheKeys.chapters(mangaId)
        : `${CacheKeys.chapters(mangaId)}:page:${offset}`;

    const cached = cacheService.get<{chapters: Chapter[]; total: number}>(
      cacheKey,
    );
    if (cached) {
      return cached;
    }

    const response = await mangadexClient.get<ChapterListResponse>(
      `/manga/${mangaId}/feed`,
      {
        params: {
          translatedLanguage: [...ALLOWED_LANGUAGES],
          limit,
          offset,
          order: {chapter: 'asc'},
          includes: ['scanlation_group'],
          // Exclure les chapitres avec URL externe (pas lisibles dans l'app)
          externalUrl: 'none',
        },
      },
    );

    const result = {
      chapters: response.data.data.map(rawToChapter),
      total: response.data.total,
    };

    cacheService.set(cacheKey, result, CACHE_TTL.chapters);
    return result;
  },

  /**
   * Récupère les URLs des pages d'un chapitre via at-home/server.
   * BR-003: retry auto sur autres serveurs (max 3 tentatives géré par rate limiter).
   * Cache TTL 1h.
   */
  async getChapterPages(chapterId: string): Promise<ChapterPages | null> {
    const cacheKey = CacheKeys.chapterPages(chapterId);
    const cached = cacheService.get<ChapterPages>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await mangadexClient.get<AtHomeServerResponse>(
        `/at-home/server/${chapterId}`,
      );

      const pages: ChapterPages = {
        chapterId,
        baseUrl: response.data.baseUrl,
        hash: response.data.chapter.hash,
        data: response.data.chapter.data,
        dataSaver: response.data.chapter.dataSaver,
      };

      cacheService.set(cacheKey, pages, CACHE_TTL.chapterPages);
      return pages;
    } catch {
      return null;
    }
  },

  /**
   * Récupère les chapitres récents (nouvelles sorties) pour l'écran d'accueil.
   * Cache TTL 30min.
   */
  async getNewChapters(limit = 20): Promise<Chapter[]> {
    const cacheKey = CacheKeys.newChapters();
    const cached = cacheService.get<Chapter[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const response = await mangadexClient.get<ChapterListResponse>('/chapter', {
      params: {
        translatedLanguage: [...ALLOWED_LANGUAGES],
        limit,
        order: {publishAt: 'desc'},
        includes: ['scanlation_group', 'manga'],
        contentRating: ['safe', 'suggestive'],
      },
    });

    const chapters = response.data.data.map((raw: MangaDexChapterRaw) =>
      rawToChapter(raw),
    );
    cacheService.set(cacheKey, chapters, CACHE_TTL.newChapters);
    return chapters;
  },
};

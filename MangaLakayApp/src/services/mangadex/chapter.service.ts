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
        },
      },
    );

    // Filtrer les chapitres non lisibles dans l'app (URL externe ou aucune page)
    const readable = response.data.data.filter(
      raw => !raw.attributes.externalUrl && raw.attributes.pages > 0,
    );
    const result = {
      chapters: readable.map(rawToChapter),
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
   * Récupère les chapitres publiés dans les 7 derniers jours pour une liste de mangas suivis.
   * Batches de 10 mangaIds max par appel (BR-010). Cache TTL 30min.
   */
  async getRecentChaptersForMangas(mangaIds: string[]): Promise<Chapter[]> {
    if (mangaIds.length === 0) {
      return [];
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const since = sevenDaysAgo.toISOString().split('.')[0]; // Format: 2026-03-01T00:00:00

    // Batch de max 10 mangaIds par appel (rate limiting BR-010)
    const batches: string[][] = [];
    for (let i = 0; i < mangaIds.length; i += 10) {
      batches.push(mangaIds.slice(i, i + 10));
    }

    const results = await Promise.all(
      batches.map(batch =>
        mangadexClient
          .get<ChapterListResponse>('/chapter', {
            params: {
              manga: batch,
              publishAtSince: since,
              order: {publishAt: 'desc'},
              limit: 20,
              translatedLanguage: [...ALLOWED_LANGUAGES],
              contentRating: ['safe', 'suggestive'],
              includes: ['manga', 'cover_art'],
            },
          })
          .catch(() => null),
      ),
    );

    const now = Date.now();
    const allChapters = results
      .filter(Boolean)
      .flatMap(r =>
        (r?.data?.data ?? [])
          .filter(
            (raw: MangaDexChapterRaw) =>
              !raw.attributes.externalUrl &&
              raw.attributes.pages > 0 &&
              new Date(raw.attributes.readableAt).getTime() <= now,
          )
          .map((raw: MangaDexChapterRaw) => rawToChapter(raw)),
      );

    // Dédupliquer par ID et trier par date de publication
    const seen = new Set<string>();
    return allChapters
      .filter(c => {
        if (seen.has(c.id)) {
          return false;
        }
        seen.add(c.id);
        return true;
      })
      .sort(
        (a, b) =>
          new Date(b.publishAt).getTime() - new Date(a.publishAt).getTime(),
      )
      .slice(0, 20);
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
        // On demande plus pour compenser les chapitres filtrés (externalUrl / pages=0)
        limit: Math.min(limit * 3, 100),
        order: {readableAt: 'desc'},
        includes: ['scanlation_group', 'manga', 'cover_art'],
        contentRating: ['safe', 'suggestive'],
      },
    });

    // Filtrer les chapitres sans pages (externalUrl) et les dates futures aberrantes
    const now = Date.now();
    const readable = response.data.data.filter(
      raw =>
        !raw.attributes.externalUrl &&
        raw.attributes.pages > 0 &&
        new Date(raw.attributes.readableAt).getTime() <= now,
    );
    const chapters = readable.slice(0, limit).map((raw: MangaDexChapterRaw) =>
      rawToChapter(raw),
    );
    cacheService.set(cacheKey, chapters, CACHE_TTL.newChapters);
    return chapters;
  },
};

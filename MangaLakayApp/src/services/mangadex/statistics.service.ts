// src/services/mangadex/statistics.service.ts
import {mangadexClient} from './client';
import {cacheService, CacheKeys} from '../cache/cache.service';
import {MangaStats} from '../../types/mangadex.types';
import {CACHE_TTL} from '../../constants/api';

interface MangaDexStatsResponse {
  result: string;
  statistics: Record<
    string,
    {
      rating: {
        average: number | null;
        bayesian: number | null;
        distribution: Record<string, number>;
      };
      follows: number;
      comments?: {threadId: number; repliesCount: number};
    }
  >;
}

export const statisticsService = {
  /**
   * Récupère les statistiques d'un manga (rating MangaDex + follows). Cache TTL 2h.
   */
  async getMangaStats(mangaId: string): Promise<MangaStats | null> {
    const cacheKey = CacheKeys.stats(mangaId);
    const cached = cacheService.get<MangaStats>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await mangadexClient.get<MangaDexStatsResponse>(
        `/statistics/manga/${mangaId}`,
      );

      const rawStats = response.data.statistics[mangaId];
      if (!rawStats) {
        return null;
      }

      const stats: MangaStats = {
        mangaId,
        rating: {
          average: rawStats.rating.average,
          bayesian: rawStats.rating.bayesian,
          distribution: rawStats.rating.distribution,
        },
        follows: rawStats.follows,
        comments: rawStats.comments?.repliesCount ?? 0,
      };

      cacheService.set(cacheKey, stats, CACHE_TTL.stats);
      return stats;
    } catch {
      return null;
    }
  },
};

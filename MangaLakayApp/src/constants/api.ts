// src/constants/api.ts
export const MANGADEX_BASE = 'https://api.mangadex.org';
export const MANGADEX_UPLOADS = 'https://uploads.mangadex.org';

export const ALLOWED_CONTENT_RATINGS = ['safe', 'suggestive'] as const;
export const ALLOWED_LANGUAGES = ['fr', 'en'] as const;

export const CACHE_TTL = {
  manga: 6,
  chapters: 1,
  chapterPages: 1,
  stats: 2,
  covers: 24,
  search: 0.5,
  trending: 2,
  newChapters: 0.5,
  ranking: 24,
} as const;

export const PAGINATION = {
  defaultLimit: 20,
  maxLimit: 100,
  infiniteScrollThreshold: 0.8,
} as const;

export const RATE_LIMIT = {
  maxPerSecond: 3,
  minIntervalMs: 334,
  maxRetries: 3,
  backoffMs: [1000, 2000, 4000],
} as const;

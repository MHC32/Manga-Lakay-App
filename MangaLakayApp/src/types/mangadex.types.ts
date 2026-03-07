// src/types/mangadex.types.ts
export type MangaStatus = 'ongoing' | 'completed' | 'hiatus' | 'cancelled';
export type ContentRating = 'safe' | 'suggestive' | 'erotica' | 'pornographic';
export type LibraryStatus = 'reading' | 'completed' | 'plan_to_read' | 'dropped';
export type ReadingDirection = 'ltr' | 'rtl';

export interface LocalizedString {
  fr?: string;
  en?: string;
  'ja-ro'?: string;
  [lang: string]: string | undefined;
}

export interface MangaTag {
  id: string;
  name: LocalizedString;
  group: 'genre' | 'theme' | 'format' | 'content';
}

export interface Author {
  id: string;
  name: string;
}

export interface Manga {
  id: string;
  title: LocalizedString;
  altTitles: LocalizedString[];
  description: LocalizedString;
  status: MangaStatus;
  contentRating: ContentRating;
  tags: MangaTag[];
  authors: Author[];
  artists: Author[];
  coverUrl: string | null;
  year: number | null;
  lastChapter: string | null;
  lastVolume: string | null;
  demographic: 'shounen' | 'shoujo' | 'seinen' | 'josei' | null;
  originalLanguage: string;
}

export interface MangaStats {
  mangaId: string;
  rating: {
    average: number | null;
    bayesian: number | null;
    distribution: Record<string, number>;
  };
  follows: number;
  comments: number;
}

export interface Chapter {
  id: string;
  chapter: string | null;
  title: string | null;
  volume: string | null;
  translatedLanguage: string;
  scanlationGroup: string | null;
  publishAt: string;
  readableAt: string;
  externalUrl: string | null;
  pageCount: number;
}

export interface ChapterPages {
  chapterId: string;
  baseUrl: string;
  hash: string;
  data: string[];
  dataSaver: string[];
}

export interface SearchFilters {
  genres: string[];
  status: MangaStatus | null;
  demographic: string | null;
  contentRating: ContentRating[];
  sortBy: 'relevance' | 'rating' | 'follows' | 'updatedAt';
}

export interface ReaderSettings {
  direction: ReadingDirection;
  quality: 'standard' | 'dataSaver';
}

// Types bruts de l'API MangaDex (avant transformation)
export interface MangaDexMangaRaw {
  id: string;
  type: 'manga';
  attributes: {
    title: LocalizedString;
    altTitles: LocalizedString[];
    description: LocalizedString;
    status: MangaStatus;
    contentRating: ContentRating;
    tags: Array<{
      id: string;
      attributes: {
        name: LocalizedString;
        group: { [k: string]: string };
      };
    }>;
    year: number | null;
    lastChapter: string | null;
    lastVolume: string | null;
    publicationDemographic: string | null;
    originalLanguage: string;
  };
  relationships: Array<{
    id: string;
    type: string;
    attributes?: { name?: string; fileName?: string };
  }>;
}

export interface MangaDexChapterRaw {
  id: string;
  type: 'chapter';
  attributes: {
    chapter: string | null;
    title: string | null;
    volume: string | null;
    translatedLanguage: string;
    externalUrl: string | null;
    publishAt: string;
    readableAt: string;
    pages: number;
  };
  relationships: Array<{
    id: string;
    type: string;
    attributes?: { name?: string };
  }>;
}

export interface MangaListResponse {
  data: MangaDexMangaRaw[];
  total: number;
  limit: number;
  offset: number;
}

export interface ChapterListResponse {
  data: MangaDexChapterRaw[];
  total: number;
  limit: number;
  offset: number;
}

export interface MangaListParams {
  title?: string;
  limit?: number;
  offset?: number;
  includedTags?: string[];
  excludedTags?: string[];
  status?: MangaStatus[];
  contentRating?: ContentRating[];
  publicationDemographic?: string[];
  availableTranslatedLanguage?: string[];
  order?: {
    relevance?: 'asc' | 'desc';
    rating?: 'asc' | 'desc';
    followedCount?: 'asc' | 'desc';
    updatedAt?: 'asc' | 'desc';
  };
  includes?: ('cover_art' | 'author' | 'artist')[];
}

// src/services/mangadex/transformers.ts
import {
  Manga,
  Chapter,
  MangaDexMangaRaw,
  MangaDexChapterRaw,
  MangaTag,
  Author,
} from '../../types/mangadex.types';
import {getCoverUrl} from '../../utils/image';

/**
 * Transforme un manga brut de l'API MangaDex vers le type interne Manga.
 */
export function rawToManga(raw: MangaDexMangaRaw): Manga {
  const {attributes, relationships} = raw;

  // Extraire la couverture
  const coverRel = relationships.find(r => r.type === 'cover_art');
  const coverFilename = coverRel?.attributes?.fileName ?? null;

  // Extraire les auteurs
  const authors: Author[] = relationships
    .filter(r => r.type === 'author')
    .map(r => ({id: r.id, name: r.attributes?.name ?? ''}));

  // Extraire les artistes
  const artists: Author[] = relationships
    .filter(r => r.type === 'artist')
    .map(r => ({id: r.id, name: r.attributes?.name ?? ''}));

  // Transformer les tags
  const tags: MangaTag[] = attributes.tags.map(tag => ({
    id: tag.id,
    name: tag.attributes.name,
    group: (tag.attributes.group?.main ?? 'genre') as MangaTag['group'],
  }));

  return {
    id: raw.id,
    title: attributes.title,
    altTitles: attributes.altTitles,
    description: attributes.description,
    status: attributes.status,
    contentRating: attributes.contentRating,
    tags,
    authors,
    artists,
    coverUrl: getCoverUrl(raw.id, coverFilename),
    year: attributes.year,
    lastChapter: attributes.lastChapter,
    lastVolume: attributes.lastVolume,
    demographic: (attributes.publicationDemographic as Manga['demographic']) ?? null,
    originalLanguage: attributes.originalLanguage,
  };
}

/**
 * Transforme un chapitre brut de l'API MangaDex vers le type interne Chapter.
 */
export function rawToChapter(raw: MangaDexChapterRaw): Chapter {
  const {attributes, relationships} = raw;

  // Extraire le groupe de scanlation
  const groupRel = relationships.find(r => r.type === 'scanlation_group');
  const scanlationGroup = groupRel?.attributes?.name ?? null;

  return {
    id: raw.id,
    chapter: attributes.chapter,
    title: attributes.title,
    volume: attributes.volume,
    translatedLanguage: attributes.translatedLanguage,
    scanlationGroup,
    publishAt: attributes.publishAt,
    readableAt: attributes.readableAt,
    externalUrl: attributes.externalUrl,
    pageCount: attributes.pages,
  };
}

// src/utils/image.ts
import {MANGADEX_UPLOADS} from '../constants/api';

/**
 * Construit l'URL de couverture MangaDex.
 * Format: https://uploads.mangadex.org/covers/{mangaId}/{filename}.512.jpg
 */
export function getCoverUrl(mangaId: string, filename: string | null): string | null {
  if (!filename) {
    return null;
  }
  return `${MANGADEX_UPLOADS}/covers/${mangaId}/${filename}.512.jpg`;
}

/**
 * Construit l'URL d'une page de chapitre (haute qualité).
 */
export function getPageUrl(baseUrl: string, hash: string, filename: string): string {
  return `${baseUrl}/data/${hash}/${filename}`;
}

/**
 * Construit l'URL d'une page de chapitre (data saver).
 */
export function getPageUrlDataSaver(
  baseUrl: string,
  hash: string,
  filename: string,
): string {
  return `${baseUrl}/data-saver/${hash}/${filename}`;
}

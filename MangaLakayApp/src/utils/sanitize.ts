// src/utils/sanitize.ts
import {MAX_BIO_LENGTH, MAX_USERNAME_LENGTH} from '../constants/config';

/**
 * Sanitise un pseudo: lowercase, caractères autorisés seulement (a-z0-9_-), max 20 chars.
 * BR-005: lettres, chiffres, underscores, tirets uniquement — pas d'espace.
 */
export function sanitizeUsername(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, MAX_USERNAME_LENGTH);
}

/**
 * Sanitise une bio: supprime les URLs, max 150 chars.
 * BR-019: pas de liens URL autorisés dans les bios.
 */
export function sanitizeBio(value: string): string {
  const noUrls = value.replace(/https?:\/\/\S+/gi, '');
  return noUrls.slice(0, MAX_BIO_LENGTH);
}

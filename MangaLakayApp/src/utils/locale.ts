// src/utils/locale.ts
import {LocalizedString} from '../types/mangadex.types';

const LANG_PRIORITY = ['fr', 'en', 'ja-ro'] as const;

/**
 * Retourne le titre localisé selon la priorité fr → en → ja-ro → premier disponible.
 */
export function getTitle(titles: LocalizedString | LocalizedString[]): string {
  const titleObj = Array.isArray(titles) ? mergeLocalizedStrings(titles) : titles;
  return getLocalized(titleObj) ?? 'Sans titre';
}

/**
 * Retourne la description localisée.
 */
export function getDescription(desc: LocalizedString): string {
  return getLocalized(desc) ?? '';
}

/**
 * Retourne une valeur localisée selon la priorité de langue.
 */
export function getLocalized(obj: LocalizedString): string | undefined {
  for (const lang of LANG_PRIORITY) {
    const val = obj[lang];
    if (val && val.trim().length > 0) {
      return val.trim();
    }
  }
  // Fallback: premier champ non-vide
  const keys = Object.keys(obj);
  for (const key of keys) {
    const val = obj[key];
    if (val && val.trim().length > 0) {
      return val.trim();
    }
  }
  return undefined;
}

function mergeLocalizedStrings(arr: LocalizedString[]): LocalizedString {
  return arr.reduce((acc, item) => ({...acc, ...item}), {} as LocalizedString);
}

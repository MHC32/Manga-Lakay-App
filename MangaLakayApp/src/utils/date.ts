// src/utils/date.ts
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/fr';

dayjs.extend(relativeTime);
dayjs.locale('fr');

/**
 * Retourne une date en format relatif: "il y a 2 heures", "il y a 3 jours".
 * Au-delà de 7 jours: retourne la date complète "12 mars 2026".
 */
export function formatRelativeDate(dateStr: string): string {
  const date = dayjs(dateStr);
  const now = dayjs();
  const diffDays = now.diff(date, 'day');

  if (diffDays >= 7) {
    return date.format('D MMMM YYYY');
  }

  return date.fromNow();
}

/**
 * Retourne la date et l'heure exacte pour les tooltips.
 * Format: "12 mars 2026 à 14:32"
 */
export function formatExactDate(dateStr: string): string {
  return dayjs(dateStr).format('D MMMM YYYY [à] HH:mm');
}

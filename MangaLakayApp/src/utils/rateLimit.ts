// src/utils/rateLimit.ts
import {RATE_LIMIT} from '../constants/api';

type QueueItem<T> = {
  request: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
};

/**
 * File d'attente pour les requêtes MangaDex.
 * Limite: 3 requêtes/seconde.
 * Backoff exponentiel sur 429: 1s → 2s → 4s (max 3 retries).
 */
class RequestQueue {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private queue: QueueItem<any>[] = [];
  private processing = false;
  private lastRequestTime = 0;

  async enqueue<T>(request: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({request, resolve, reject});
      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  private async processQueue(): Promise<void> {
    if (this.queue.length === 0) {
      this.processing = false;
      return;
    }

    this.processing = true;
    const item = this.queue.shift()!;

    // Respecter le rate limit
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < RATE_LIMIT.minIntervalMs) {
      await sleep(RATE_LIMIT.minIntervalMs - elapsed);
    }

    this.lastRequestTime = Date.now();

    try {
      const result = await withRetry(item.request);
      item.resolve(result);
    } catch (error) {
      item.reject(error);
    }

    this.processQueue();
  }
}

async function withRetry<T>(
  request: () => Promise<T>,
  attempt = 0,
): Promise<T> {
  try {
    return await request();
  } catch (error: unknown) {
    const isRateLimit =
      error instanceof Error &&
      'response' in error &&
      (error as {response?: {status?: number}}).response?.status === 429;

    if (isRateLimit && attempt < RATE_LIMIT.maxRetries) {
      const backoff = RATE_LIMIT.backoffMs[attempt] ?? 4000;
      await sleep(backoff);
      return withRetry(request, attempt + 1);
    }
    throw error;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Singleton exporté
export const requestQueue = new RequestQueue();

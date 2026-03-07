// src/services/mangadex/client.ts
import axios, {AxiosInstance, InternalAxiosRequestConfig} from 'axios';
import {MANGADEX_BASE} from '../../constants/api';
import {requestQueue} from '../../utils/rateLimit';

const mangadexClient: AxiosInstance = axios.create({
  baseURL: MANGADEX_BASE,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor: toutes les requêtes passent par la RequestQueue
mangadexClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Enqueue la requête pour respecter le rate limit
    // On retourne la config — la queue gère le timing
    await requestQueue.enqueue(() => Promise.resolve());
    return config;
  },
  error => Promise.reject(error),
);

// Interceptor: gestion des erreurs de réponse
mangadexClient.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 429) {
      // Le rate limiter dans RequestQueue gère le retry
      // On propage l'erreur pour que withRetry puisse la catcher
      return Promise.reject(error);
    }
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return Promise.reject(new Error('TIMEOUT'));
    }
    return Promise.reject(error);
  },
);

export {mangadexClient};

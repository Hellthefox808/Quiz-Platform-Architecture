import { QueryClient, Query } from '@tanstack/react-query';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { defaultRetryPolicy, defaultRetryDelay } from './queryPolicies';

const PERSISTENCE_KEY = 'APEX_QUERY_CACHE_V1';
const PERSISTENCE_MAX_AGE = 1000 * 60 * 60 * 24; // 24 hours

/**
 * Global QueryClient instance
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: defaultRetryPolicy,
      retryDelay: defaultRetryDelay,
      networkMode: 'online',
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: false, // Default mutations to not retry blindly unless explicitly safe
      networkMode: 'online',
    },
  },
});

/**
 * Storage wrapper with corruption recovery
 */
const safeLocalStorage: Storage = {
  get length() {
    return localStorage.length;
  },
  clear() {
    localStorage.clear();
  },
  getItem(key: string) {
    try {
      const item = localStorage.getItem(key);
      if (!item) return null;
      // Validate JSON parseability
      JSON.parse(item);
      return item;
    } catch (err) {
      console.warn(`[ApexQueryPersister] Corrupted cache detected for key "${key}". Discarding invalid cache.`, err);
      localStorage.removeItem(key);
      return null;
    }
  },
  key(index: number) {
    return localStorage.key(index);
  },
  removeItem(key: string) {
    localStorage.removeItem(key);
  },
  setItem(key: string, value: string) {
    try {
      localStorage.setItem(key, value);
    } catch (err) {
      console.warn('[ApexQueryPersister] Failed to save query cache to localStorage:', err);
    }
  },
};

/**
 * Synchronous Storage Persister for safe offline-first reference state
 */
export const persister = createSyncStoragePersister({
  storage: safeLocalStorage,
  key: PERSISTENCE_KEY,
  throttleTime: 1000,
});

/**
 * Dehydration filter ensuring sensitive assessment data or tokens are NEVER persisted
 */
export const persistOptions = {
  persister,
  maxAge: PERSISTENCE_MAX_AGE,
  buster: 'v2.1', // Increment to invalidate previous persisted caches on schema change
  dehydrateOptions: {
    shouldDehydrateQuery: (query: Query) => {
      const queryKey = query.queryKey;
      if (!Array.isArray(queryKey) || queryKey.length === 0) return false;

      const domain = queryKey[0];

      // Exclude active assessment attempts, answers, and authentication tokens from persistent cache
      if (domain === 'attempts' || domain === 'auth' || domain === 'notifications') {
        return false;
      }

      // Safe candidates for local persistent cache: categories, public quiz catalog
      if (domain === 'categories' || domain === 'quizzes') {
        return query.state.status === 'success';
      }

      return false;
    },
  },
};

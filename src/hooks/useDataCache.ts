import { useState, useCallback, useRef } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

interface CacheStore {
  [key: string]: CacheEntry<any>;
}

export const useDataCache = () => {
  const cacheRef = useRef<CacheStore>({});

  const get = useCallback(<T>(key: string): T | null => {
    const entry = cacheRef.current[key];
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      // Cache expired, remove entry
      delete cacheRef.current[key];
      return null;
    }

    return entry.data as T;
  }, []);

  const set = useCallback(<T>(key: string, data: T, ttl: number = 300000): void => {
    // Default TTL: 5 minutes
    cacheRef.current[key] = {
      data,
      timestamp: Date.now(),
      ttl
    };
  }, []);

  const invalidate = useCallback((key: string): void => {
    delete cacheRef.current[key];
  }, []);

  const invalidatePattern = useCallback((pattern: string): void => {
    const regex = new RegExp(pattern);
    Object.keys(cacheRef.current).forEach(key => {
      if (regex.test(key)) {
        delete cacheRef.current[key];
      }
    });
  }, []);

  const clear = useCallback((): void => {
    cacheRef.current = {};
  }, []);

  return {
    get,
    set,
    invalidate,
    invalidatePattern,
    clear
  };
};

// Singleton cache instance for global use
let globalCache: ReturnType<typeof useDataCache> | null = null;

export const getGlobalCache = () => {
  if (!globalCache) {
    // Create a minimal cache implementation for global use
    const cacheStore: CacheStore = {};
    
    globalCache = {
      get: <T>(key: string): T | null => {
        const entry = cacheStore[key];
        if (!entry) return null;
        
        const now = Date.now();
        if (now - entry.timestamp > entry.ttl) {
          delete cacheStore[key];
          return null;
        }
        
        return entry.data as T;
      },
      set: <T>(key: string, data: T, ttl: number = 300000): void => {
        cacheStore[key] = {
          data,
          timestamp: Date.now(),
          ttl
        };
      },
      invalidate: (key: string): void => {
        delete cacheStore[key];
      },
      invalidatePattern: (pattern: string): void => {
        const regex = new RegExp(pattern);
        Object.keys(cacheStore).forEach(key => {
          if (regex.test(key)) {
            delete cacheStore[key];
          }
        });
      },
      clear: (): void => {
        Object.keys(cacheStore).forEach(key => {
          delete cacheStore[key];
        });
      }
    };
  }
  
  return globalCache;
};
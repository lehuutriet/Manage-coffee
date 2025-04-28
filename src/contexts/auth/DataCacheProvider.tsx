import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";

interface CacheData {
  data: any;
  timestamp: number;
  expiresIn?: number;
}

interface DataCacheContextType {
  getCachedData: (key: string) => any;
  setCachedData: (key: string, data: any, expiresIn?: number) => void;
  clearCache: (key?: string) => void;
  isDataCached: (key: string) => boolean;
  invalidateCache: (key: string) => void;
  syncCache: (key: string, updateFn: (currentData: any) => any) => void;
}

const DataCacheContext = createContext<DataCacheContextType | null>(null);

export const DataCacheProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [cache, setCache] = useState<Map<string, CacheData>>(new Map());

  useEffect(() => {
    // Cleanup expired cache entries periodically
    const cleanup = setInterval(() => {
      const now = Date.now();
      setCache((prevCache) => {
        const newCache = new Map(prevCache);
        for (const [key, value] of newCache.entries()) {
          if (value.expiresIn && now - value.timestamp > value.expiresIn) {
            newCache.delete(key);
          }
        }
        return newCache;
      });
    }, 60000); // Run every minute

    return () => clearInterval(cleanup);
  }, []);

  const isDataCached = useCallback(
    (key: string): boolean => {
      if (!cache.has(key)) return false;

      const cachedData = cache.get(key);
      if (!cachedData) return false;

      if (cachedData.expiresIn) {
        const now = Date.now();
        if (now - cachedData.timestamp > cachedData.expiresIn) {
          setCache((prev) => {
            const newCache = new Map(prev);
            newCache.delete(key);
            return newCache;
          });
          return false;
        }
      }

      return true;
    },
    [cache]
  );

  const getCachedData = useCallback(
    (key: string): any => {
      if (!isDataCached(key)) return null;
      return cache.get(key)?.data;
    },
    [cache, isDataCached]
  );

  const setCachedData = useCallback(
    (key: string, data: any, expiresIn?: number) => {
      setCache((prev) => {
        const newCache = new Map(prev);
        newCache.set(key, {
          data,
          timestamp: Date.now(),
          expiresIn,
        });
        return newCache;
      });
    },
    []
  );

  const syncCache = useCallback(
    (key: string, updateFn: (currentData: any) => any) => {
      setCache((prev) => {
        const newCache = new Map(prev);
        const currentCacheEntry = newCache.get(key);

        if (currentCacheEntry) {
          const updatedData = updateFn(currentCacheEntry.data);
          newCache.set(key, {
            ...currentCacheEntry,
            data: updatedData,
            timestamp: Date.now(),
          });
        }

        return newCache;
      });
    },
    []
  );

  const invalidateCache = useCallback((key: string) => {
    setCache((prev) => {
      const newCache = new Map(prev);
      newCache.delete(key);
      return newCache;
    });
  }, []);

  const clearCache = useCallback((key?: string) => {
    if (key) {
      setCache((prev) => {
        const newCache = new Map(prev);
        newCache.delete(key);
        return newCache;
      });
    } else {
      setCache(new Map());
    }
  }, []);

  return (
    <DataCacheContext.Provider
      value={{
        getCachedData,
        setCachedData,
        clearCache,
        isDataCached,
        invalidateCache,
        syncCache,
      }}
    >
      {children}
    </DataCacheContext.Provider>
  );
};

export const useDataCache = () => {
  const context = useContext(DataCacheContext);
  if (!context) {
    throw new Error("useDataCache must be used within a DataCacheProvider");
  }
  return context;
};

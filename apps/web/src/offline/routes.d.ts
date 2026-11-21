// Types for routes.js, which stays plain JavaScript so it can be copied into sw.js.
export declare const CACHE_PREFIX: string;
export declare const SHELL: string;
export declare function cacheNameOf(version: string): string;
export declare function staleCaches(names: string[], current: string): string[];
export declare function routeOf(
  request: { method: string; url: string; mode: string },
  origin: string,
  precached: Set<string>,
): 'shell' | 'cached' | 'pass';

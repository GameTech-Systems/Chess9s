// Types for build-sw.mjs, which vite.config.ts and the browser script run as plain JavaScript.
export declare function precacheList(files: string[]): string[];
export declare function writeServiceWorker(dist: string): { version: string; files: string[] };

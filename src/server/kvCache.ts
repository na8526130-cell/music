import fs from 'fs';
import path from 'path';

interface CacheEntry<T> {
  value: T;
  expiresAt: number; // Unix timestamp ms
  createdAt: number;
}

export class PersistentKVCache {
  private memoryMap = new Map<string, CacheEntry<any>>();
  private filePath: string;
  private saveDebounceTimer: NodeJS.Timeout | null = null;
  private hits = 0;
  private misses = 0;

  constructor(filename = 'kv_store.json') {
    const cacheDir = path.resolve(process.cwd(), '.cache');
    if (!fs.existsSync(cacheDir)) {
      try {
        fs.mkdirSync(cacheDir, { recursive: true });
      } catch (e) {
        console.warn('[KVCache] Unable to create .cache directory:', e);
      }
    }
    this.filePath = path.join(cacheDir, filename);
    this.loadFromDisk();

    // Clean up expired keys every 15 minutes
    setInterval(() => this.cleanupExpired(), 15 * 60 * 1000);
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const data = JSON.parse(raw);
        const now = Date.now();
        let loaded = 0;
        for (const [key, entry] of Object.entries(data)) {
          const item = entry as CacheEntry<any>;
          if (item && item.expiresAt > now) {
            this.memoryMap.set(key, item);
            loaded++;
          }
        }
        console.log(`[KVCache] Successfully loaded ${loaded} active cached entries from ${this.filePath}`);
      }
    } catch (e) {
      console.warn('[KVCache] Error loading cache from disk:', e);
    }
  }

  private scheduleSave() {
    if (this.saveDebounceTimer) return;
    this.saveDebounceTimer = setTimeout(() => {
      this.saveDebounceTimer = null;
      this.saveToDisk();
    }, 2000); // 2 second debounce for disk writes
  }

  private saveToDisk() {
    try {
      const now = Date.now();
      const obj: Record<string, CacheEntry<any>> = {};
      for (const [k, v] of this.memoryMap.entries()) {
        if (v.expiresAt > now) {
          obj[k] = v;
        }
      }
      fs.writeFileSync(this.filePath, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (e) {
      console.warn('[KVCache] Error saving cache to disk:', e);
    }
  }

  public get<T>(key: string): T | null {
    const entry = this.memoryMap.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }
    if (Date.now() > entry.expiresAt) {
      this.memoryMap.delete(key);
      this.scheduleSave();
      this.misses++;
      return null;
    }
    this.hits++;
    return entry.value as T;
  }

  public set<T>(key: string, value: T, ttlSeconds: number): void {
    const now = Date.now();
    this.memoryMap.set(key, {
      value,
      createdAt: now,
      expiresAt: now + ttlSeconds * 1000,
    });
    this.scheduleSave();
  }

  public delete(key: string): boolean {
    const res = this.memoryMap.delete(key);
    if (res) this.scheduleSave();
    return res;
  }

  public clear(): void {
    this.memoryMap.clear();
    this.scheduleSave();
  }

  public cleanupExpired(): void {
    const now = Date.now();
    let deleted = 0;
    for (const [k, v] of this.memoryMap.entries()) {
      if (now > v.expiresAt) {
        this.memoryMap.delete(k);
        deleted++;
      }
    }
    if (deleted > 0) {
      this.scheduleSave();
    }
  }

  public getStats() {
    const now = Date.now();
    let activeKeys = 0;
    for (const [, v] of this.memoryMap.entries()) {
      if (v.expiresAt > now) activeKeys++;
    }
    return {
      activeKeys,
      hits: this.hits,
      misses: this.misses,
      hitRate: this.hits + this.misses > 0 ? ((this.hits / (this.hits + this.misses)) * 100).toFixed(1) + '%' : '0.0%',
      diskPath: this.filePath,
    };
  }
}

export const kvCache = new PersistentKVCache();

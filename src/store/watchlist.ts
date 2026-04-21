import { create } from 'zustand';
import { db } from '../data/local/dexie';
import type { WatchlistItem } from '../data/types';

interface WatchlistState {
  items: WatchlistItem[];
  loaded: boolean;
  load: () => Promise<void>;
  add: (code: string, name: string) => Promise<void>;
  remove: (code: string) => Promise<void>;
}

export const useWatchlist = create<WatchlistState>((set, get) => ({
  items: [],
  loaded: false,

  async load() {
    const items = await db.watchlist.orderBy('addedAt').toArray();
    set({ items, loaded: true });
  },

  async add(code, name) {
    await db.watchlist.put({ code, name, addedAt: Date.now() });
    await get().load();
  },

  async remove(code) {
    await db.watchlist.delete(code);
    await get().load();
  },
}));

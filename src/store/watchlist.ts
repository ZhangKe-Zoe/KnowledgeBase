import { create } from 'zustand';
import { db } from '../data/local/dexie';
import type { WatchlistItem } from '../data/types';

interface WatchlistState {
  items: WatchlistItem[];
  loaded: boolean;
  load: () => Promise<void>;
  add: (code: string, name: string, held?: boolean) => Promise<void>;
  bulkAdd: (picks: Array<{ code: string; name: string }>, held: boolean) => Promise<void>;
  toggleHeld: (code: string) => Promise<void>;
  remove: (code: string) => Promise<void>;
}

export const useWatchlist = create<WatchlistState>((set, get) => ({
  items: [],
  loaded: false,

  async load() {
    const items = await db.watchlist.orderBy('addedAt').toArray();
    set({ items, loaded: true });
  },

  async add(code, name, held) {
    const existing = await db.watchlist.get(code);
    await db.watchlist.put({
      code,
      name,
      addedAt: existing?.addedAt ?? Date.now(),
      held: held ?? existing?.held ?? false,
      amount: existing?.amount,
    });
    await get().load();
  },

  async bulkAdd(picks, held) {
    const now = Date.now();
    const items: WatchlistItem[] = await Promise.all(
      picks.map(async (p, i) => {
        const existing = await db.watchlist.get(p.code);
        return {
          code: p.code,
          name: p.name,
          addedAt: existing?.addedAt ?? now + i,
          held,
          amount: existing?.amount,
        };
      }),
    );
    await db.watchlist.bulkPut(items);
    await get().load();
  },

  async toggleHeld(code) {
    const it = await db.watchlist.get(code);
    if (!it) return;
    await db.watchlist.put({ ...it, held: !it.held });
    await get().load();
  },

  async remove(code) {
    await db.watchlist.delete(code);
    await get().load();
  },
}));

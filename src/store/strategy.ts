import { create } from 'zustand';
import { db } from '../data/local/dexie';
import type { StrategyDef, BacktestRun } from '../data/types';

interface StrategyState {
  strategies: StrategyDef[];
  runs: BacktestRun[];
  load: () => Promise<void>;
  save: (s: StrategyDef) => Promise<void>;
  saveRun: (r: BacktestRun) => Promise<void>;
  removeRun: (id: string) => Promise<void>;
}

export const useStrategy = create<StrategyState>((set, get) => ({
  strategies: [],
  runs: [],

  async load() {
    const [strategies, runs] = await Promise.all([
      db.strategies.toArray(),
      db.backtests.orderBy('ranAt').reverse().limit(50).toArray(),
    ]);
    set({ strategies, runs });
  },

  async save(s) {
    await db.strategies.put(s);
    await get().load();
  },

  async saveRun(r) {
    await db.backtests.put(r);
    await get().load();
  },

  async removeRun(id) {
    await db.backtests.delete(id);
    await get().load();
  },
}));

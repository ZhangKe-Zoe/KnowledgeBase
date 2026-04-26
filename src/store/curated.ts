import { create } from 'zustand';
import { CURATED_POOL, type CuratedCategory } from '../data/curated';
import type { FundProfile } from '../data/types';
import { fetchProfile } from '../data/remote/eastmoney';
import { loadProfile, saveProfile } from '../data/local/dexie';

// 共享 curated 池的 profile 加载状态。
// Market 页 / Recommend 页都要用，且加载耗时（首次约 1 分钟），
// 单独存到 zustand 避免重复请求。

export interface ProfileWithCategory extends FundProfile {
  category: CuratedCategory;
}

interface CuratedState {
  profiles: ProfileWithCategory[];
  loading: boolean;
  done: boolean;
  progress: { done: number; total: number };
  error: string | null;
  ensure: () => Promise<void>;
}

const CACHE_TTL = 24 * 3600_000;   // 24 小时

export const useCurated = create<CuratedState>((set, get) => ({
  profiles: [],
  loading: false,
  done: false,
  progress: { done: 0, total: CURATED_POOL.length },
  error: null,

  async ensure() {
    if (get().done || get().loading) return;
    set({ loading: true, error: null, progress: { done: 0, total: CURATED_POOL.length } });
    const out: ProfileWithCategory[] = [];
    let done = 0;

    try {
      // Pass 1: 命中 IndexedDB 缓存的先填进去
      for (const f of CURATED_POOL) {
        const cached = await loadProfile(f.code);
        if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
          out.push({ ...cached, category: f.category });
          done++;
        }
      }
      if (out.length > 0) set({ profiles: [...out], progress: { done, total: CURATED_POOL.length } });

      // Pass 2: 缓存缺失的从网络拉，串行 + 错峰避免触发限流
      for (const f of CURATED_POOL) {
        if (out.some((p) => p.code === f.code)) continue;
        try {
          const p = await fetchProfile(f.code);
          await saveProfile(p);
          out.push({ ...p, category: f.category });
          set({ profiles: [...out] });
        } catch (e) {
          // 单只失败跳过：基金可能清盘 / 改名 / 代码错误
          console.warn(`profile ${f.code} failed`, e);
        }
        done++;
        set({ progress: { done, total: CURATED_POOL.length } });
        await new Promise((r) => setTimeout(r, 150));
      }

      set({ done: true });
    } catch (e) {
      set({ error: (e as Error).message });
    } finally {
      set({ loading: false });
    }
  },
}));

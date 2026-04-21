import Dexie, { type Table } from 'dexie';
import pako from 'pako';
import type { FundProfile, FundMeta, WatchlistItem, StrategyDef, BacktestRun, NavPoint } from '../types';

// IndexedDB 表结构，仿 Qlib 的数据分层：raw fund meta / compressed nav history /
// user state (watchlist + strategy) / run artifacts (backtests).
// 净值历史使用 pako.deflate 压缩，10 年 × 200 基金约 8MB 以内。

export interface FundProfileRow {
  code: string;
  name: string;
  manager?: string;
  navGzip: Uint8Array;    // gzip-compressed JSON of NavPoint[]
  fetchedAt: number;
}

export interface FundListRow {
  id: number;             // 固定 1
  list: FundMeta[];
  fetchedAt: number;
}

class FundQuantDB extends Dexie {
  fundProfiles!: Table<FundProfileRow, string>;
  fundList!: Table<FundListRow, number>;
  watchlist!: Table<WatchlistItem, string>;
  strategies!: Table<StrategyDef, string>;
  backtests!: Table<BacktestRun, string>;

  constructor() {
    super('fundquant');
    this.version(1).stores({
      fundProfiles: 'code, fetchedAt',
      fundList: 'id',
      watchlist: 'code, addedAt',
      strategies: 'id',
      backtests: 'id, strategyId, ranAt',
    });
  }
}

export const db = new FundQuantDB();

// --- profile helpers (compress/decompress) -------------------------------

export async function saveProfile(p: FundProfile) {
  const json = JSON.stringify(p.nav);
  const navGzip = pako.deflate(json);
  await db.fundProfiles.put({
    code: p.code,
    name: p.name,
    manager: p.manager,
    navGzip,
    fetchedAt: p.fetchedAt,
  });
}

export async function loadProfile(code: string): Promise<FundProfile | null> {
  const row = await db.fundProfiles.get(code);
  if (!row) return null;
  const json = pako.inflate(row.navGzip, { to: 'string' });
  const nav = JSON.parse(json) as NavPoint[];
  return { code: row.code, name: row.name, manager: row.manager, nav, fetchedAt: row.fetchedAt };
}

export async function saveFundList(list: FundMeta[]) {
  await db.fundList.put({ id: 1, list, fetchedAt: Date.now() });
}

export async function loadFundList(maxAgeMs = 7 * 24 * 3600 * 1000): Promise<FundMeta[] | null> {
  const row = await db.fundList.get(1);
  if (!row) return null;
  if (Date.now() - row.fetchedAt > maxAgeMs) return null;
  return row.list;
}

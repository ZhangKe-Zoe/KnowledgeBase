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

// --- 备份 / 恢复（JSON）-----------------------------------------------
// 只导出用户产生的数据：自选、策略、回测。基金行情数据不导出（可从网络重新拉）。
export interface BackupBundle {
  version: 1;
  exportedAt: number;
  watchlist: WatchlistItem[];
  strategies: StrategyDef[];
  backtests: BacktestRun[];
}

export async function exportBackup(): Promise<BackupBundle> {
  const [watchlist, strategies, backtests] = await Promise.all([
    db.watchlist.toArray(),
    db.strategies.toArray(),
    db.backtests.toArray(),
  ]);
  return { version: 1, exportedAt: Date.now(), watchlist, strategies, backtests };
}

export async function importBackup(bundle: BackupBundle): Promise<{ watchlist: number; strategies: number; backtests: number }> {
  if (bundle.version !== 1) throw new Error(`不支持的备份版本: ${bundle.version}`);
  await db.transaction('rw', db.watchlist, db.strategies, db.backtests, async () => {
    if (bundle.watchlist?.length) await db.watchlist.bulkPut(bundle.watchlist);
    if (bundle.strategies?.length) await db.strategies.bulkPut(bundle.strategies);
    if (bundle.backtests?.length) await db.backtests.bulkPut(bundle.backtests);
  });
  return {
    watchlist: bundle.watchlist?.length ?? 0,
    strategies: bundle.strategies?.length ?? 0,
    backtests: bundle.backtests?.length ?? 0,
  };
}

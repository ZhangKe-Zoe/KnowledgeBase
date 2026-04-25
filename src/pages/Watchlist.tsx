import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useWatchlist } from '../store/watchlist';
import { fetchRealtime, fetchFundList } from '../data/remote/eastmoney';
import { loadFundList, saveFundList } from '../data/local/dexie';
import { FundCard } from '../components/FundCard';
import { ImportScreenshot } from '../components/ImportScreenshot';
import { HoldingDiagnosis } from '../components/HoldingDiagnosis';
import type { FundRealtime, FundMeta } from '../data/types';

export function Watchlist() {
  const { items, loaded, load, remove, toggleHeld, bulkAdd, setAmount } = useWatchlist();
  const [realtimeMap, setRealtimeMap] = useState<Record<string, FundRealtime>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [ocrOpen, setOcrOpen] = useState(false);
  const [fundList, setFundList] = useState<FundMeta[]>([]);

  useEffect(() => {
    if (!loaded) load();
  }, [loaded, load]);

  // OCR 需要用到 fundList，预加载
  async function ensureFundList(): Promise<FundMeta[]> {
    if (fundList.length > 0) return fundList;
    let list = await loadFundList();
    if (!list) {
      list = await fetchFundList();
      await saveFundList(list);
    }
    setFundList(list);
    return list;
  }

  async function refresh() {
    if (items.length === 0) return;
    setRefreshing(true);
    const out: Record<string, FundRealtime> = {};
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      try {
        out[it.code] = await fetchRealtime(it.code);
        setRealtimeMap({ ...out });
      } catch {
        /* ignore */
      }
      await new Promise((r) => setTimeout(r, 100));
    }
    setRefreshing(false);
  }

  useEffect(() => {
    if (loaded && items.length > 0) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, items.length]);

  const heldCount = items.filter((i) => i.held).length;

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">自选基金</h1>
        <div className="flex gap-2">
          <button
            className="btn-ghost"
            onClick={async () => { await ensureFundList(); setOcrOpen(true); }}
          >
            截图导入
          </button>
          <button className="btn-ghost" onClick={refresh} disabled={refreshing || items.length === 0}>
            {refreshing ? '刷新中…' : '刷新'}
          </button>
        </div>
      </div>

      {items.length > 0 && (
        <div className="text-xs text-slate-500">
          共 {items.length} 只 · 持有 {heldCount} 只
        </div>
      )}

      {heldCount > 0 && <HoldingDiagnosis items={items} />}

      {items.length === 0 && loaded && (
        <div className="card text-sm text-slate-400 text-center space-y-2">
          <div>尚未添加任何基金</div>
          <div className="flex gap-2 justify-center text-sky-400">
            <Link to="/market">搜索添加 ›</Link>
            <span>·</span>
            <button onClick={async () => { await ensureFundList(); setOcrOpen(true); }}>
              截图导入 ›
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {items.map((it) => (
          <div key={it.code} className="relative">
            <FundCard
              code={it.code}
              name={it.name}
              realtime={realtimeMap[it.code]}
              amount={it.amount}
              onAmountChange={it.held ? (v) => setAmount(it.code, v) : undefined}
              onRemove={() => remove(it.code)}
            />
            <button
              onClick={() => toggleHeld(it.code)}
              className={`absolute top-3 left-3 text-[10px] px-1.5 py-0.5 rounded ${
                it.held
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-slate-700/40 text-slate-500'
              }`}
            >
              {it.held ? '持有中' : '未持有'}
            </button>
          </div>
        ))}
      </div>

      {ocrOpen && (
        <ImportScreenshot
          fundList={fundList}
          onConfirm={async (picks) => { await bulkAdd(picks, true); }}
          onClose={() => setOcrOpen(false)}
        />
      )}
    </div>
  );
}

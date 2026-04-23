import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useWatchlist } from '../store/watchlist';
import { fetchRealtime } from '../data/remote/eastmoney';
import { FundCard } from '../components/FundCard';
import type { FundRealtime } from '../data/types';

export function Watchlist() {
  const { items, loaded, load, remove } = useWatchlist();
  const [realtimeMap, setRealtimeMap] = useState<Record<string, FundRealtime>>({});
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!loaded) load();
  }, [loaded, load]);

  async function refresh() {
    if (items.length === 0) return;
    setRefreshing(true);
    const out: Record<string, FundRealtime> = {};
    // 错峰 100ms 一只，避免被限流
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      try {
        out[it.code] = await fetchRealtime(it.code);
        setRealtimeMap({ ...out });
      } catch {
        /* ignore individual failures */
      }
      await new Promise((r) => setTimeout(r, 100));
    }
    setRefreshing(false);
  }

  useEffect(() => {
    if (loaded && items.length > 0) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, items.length]);

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">自选基金</h1>
        <button className="btn-ghost" onClick={refresh} disabled={refreshing || items.length === 0}>
          {refreshing ? '刷新中…' : '刷新'}
        </button>
      </div>

      {items.length === 0 && loaded && (
        <div className="card text-sm text-slate-400 text-center">
          <div>尚未添加任何基金</div>
          <Link to="/market" className="text-sky-400 mt-2 inline-block">
            去搜索添加 ›
          </Link>
        </div>
      )}

      <div className="space-y-2">
        {items.map((it) => (
          <FundCard
            key={it.code}
            code={it.code}
            name={it.name}
            realtime={realtimeMap[it.code]}
            onRemove={() => remove(it.code)}
          />
        ))}
      </div>
    </div>
  );
}

import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { fetchFundList, searchFunds } from '../data/remote/eastmoney';
import { loadFundList, saveFundList } from '../data/local/dexie';
import { MarketRegime } from '../components/MarketRegime';
import type { FundMeta } from '../data/types';

export function Market() {
  const [list, setList] = useState<FundMeta[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const cached = await loadFundList();
        if (cached) setList(cached);
        else {
          const fresh = await fetchFundList();
          setList(fresh);
          await saveFundList(fresh);
        }
      } catch (e) {
        setErr((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const results = useMemo(() => searchFunds(list, query, 40), [list, query]);

  return (
    <div className="p-4 space-y-3">
      <h1 className="text-lg font-semibold">基金行情</h1>

      {/* 市场风格仪表盘 — 基于内置主流基金池的近 60 日走势反推 */}
      <MarketRegime />

      <div className="pt-2 border-t border-slate-800">
        <div className="text-sm font-medium mb-2">基金搜索</div>
        <input
          className="input"
          placeholder="输入基金代码 / 名称 / 拼音"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {loading && <div className="text-sm text-slate-400 mt-2">加载基金列表…</div>}
        {err && <div className="text-sm text-red-400 mt-2">{err}</div>}
        {!loading && !query && (
          <div className="text-xs text-slate-500 mt-2">
            共 {list.length.toLocaleString()} 只基金可搜索。例如：110022、招商白酒、消费、hxgn
          </div>
        )}
        <div className="space-y-2 mt-2">
          {results.map((f) => (
            <Link key={f.code} to={`/fund/${f.code}`} className="card block">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{f.name}</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {f.code} · {f.type}
                  </div>
                </div>
                <div className="text-xs text-sky-400">查看 ›</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

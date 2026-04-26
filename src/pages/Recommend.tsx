import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CURATED_POOL, type CuratedCategory } from '../data/curated';
import { scoreFunds } from '../quant/recommend';
import { detectRegime } from '../quant/regime';
import { useWatchlist } from '../store/watchlist';
import { useCurated } from '../store/curated';
import { SmartRebalance } from '../components/SmartRebalance';

type CategoryFilter = 'all' | CuratedCategory;

// 推荐页：从内置主流基金池里，按近期动量 + Sharpe + 最大回撤综合打分。
// 同时根据当前市场风格（regime）显示一个智能调仓卡片，
// 把「该买什么 / 该用什么策略」一站式给出。
export function Recommend() {
  const { profiles, loading, progress, error, ensure } = useCurated();
  const [windowDays, setWindowDays] = useState(60);
  const [filter, setFilter] = useState<CategoryFilter>('all');

  const { items: watchlist, add, load: loadWatchlist } = useWatchlist();
  useEffect(() => { loadWatchlist(); }, [loadWatchlist]);
  useEffect(() => { ensure(); }, [ensure]);

  const analysis = useMemo(
    () => (profiles.length >= CURATED_POOL.length / 2 ? detectRegime(profiles) : null),
    [profiles],
  );

  const scored = useMemo(() => {
    if (profiles.length === 0) return [];
    const out = scoreFunds(profiles, { windowDays });
    const byCode = new Map(profiles.map((p) => [p.code, p]));
    return out.map((s) => ({ ...s, category: byCode.get(s.code)?.category as CuratedCategory }));
  }, [profiles, windowDays]);

  const filtered = filter === 'all' ? scored : scored.filter((s) => s.category === filter);
  const categories = useMemo(
    () => Array.from(new Set(CURATED_POOL.map((c) => c.category))),
    [],
  );

  return (
    <div className="p-4 space-y-3">
      <h1 className="text-lg font-semibold">基金推荐</h1>

      {/* 智能调仓 — 基于 regime + 持仓的一键策略 */}
      {analysis && <SmartRebalance analysis={analysis} />}

      <div className="text-xs text-slate-400 leading-relaxed">
        从 {CURATED_POOL.length} 只主流 ETF / 指数 / 老牌主动基金里，按近期收益、Sharpe、最大回撤综合排名。
        <span className="text-amber-300">⚠️ 历史指标不预示未来，谨慎决策。</span>
      </div>

      <div className="card !p-3 space-y-2">
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <span className="text-slate-400">回看窗口：</span>
          {[20, 60, 120, 250].map((d) => (
            <button
              key={d}
              onClick={() => setWindowDays(d)}
              className={`px-2 py-1 rounded ${windowDays === d ? 'bg-sky-500/20 text-sky-300' : 'bg-slate-800 text-slate-400'}`}
            >{d}日</button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <span className="text-slate-400">分类：</span>
          <button
            onClick={() => setFilter('all')}
            className={`px-2 py-1 rounded ${filter === 'all' ? 'bg-sky-500/20 text-sky-300' : 'bg-slate-800 text-slate-400'}`}
          >全部</button>
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={`px-2 py-1 rounded ${filter === c ? 'bg-sky-500/20 text-sky-300' : 'bg-slate-800 text-slate-400'}`}
            >{c}</button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="card text-sm text-slate-300">
          加载中 {progress.done}/{progress.total}（首次约 1 分钟，之后秒开）
        </div>
      )}

      {error && <div className="card text-sm text-red-400">{error}</div>}

      <div className="space-y-2">
        {filtered.map((s, i) => {
          const inWatch = watchlist.some((w) => w.code === s.code);
          return (
            <div key={s.code} className="card !p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 font-mono">
                  #{i + 1}
                </span>
                <Link to={`/fund/${s.code}`} className="text-sm flex-1 truncate">{s.name}</Link>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700/40 text-slate-400">
                  {s.category}
                </span>
              </div>
              <div className="flex items-baseline gap-3 text-xs">
                <div>
                  <span className="text-slate-500">{windowDays}日 </span>
                  <span className={s.recentReturn >= 0 ? 'text-up font-semibold' : 'text-down font-semibold'}>
                    {(s.recentReturn * 100).toFixed(2)}%
                  </span>
                </div>
                <div className="text-slate-400">Sharpe {s.sharpe.toFixed(2)}</div>
                <div className="text-slate-400">回撤 {(s.maxDD * 100).toFixed(1)}%</div>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                综合得分 {(s.composite * 100).toFixed(0)}/100
              </div>
              {!inWatch ? (
                <button
                  className="btn-ghost text-xs mt-2 w-full"
                  onClick={() => add(s.code, s.name)}
                >加入自选</button>
              ) : (
                <div className="text-xs text-slate-500 mt-2">已在自选</div>
              )}
            </div>
          );
        })}
        {!loading && filtered.length === 0 && (
          <div className="card text-sm text-slate-400">暂无数据</div>
        )}
      </div>
    </div>
  );
}

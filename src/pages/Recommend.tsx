import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CURATED_POOL, type CuratedCategory } from '../data/curated';
import { fetchProfile } from '../data/remote/eastmoney';
import { loadProfile, saveProfile } from '../data/local/dexie';
import { scoreFunds } from '../quant/recommend';
import { useWatchlist } from '../store/watchlist';
import type { FundProfile } from '../data/types';

type CategoryFilter = 'all' | CuratedCategory;

interface ProfileWithCategory extends FundProfile {
  category: CuratedCategory;
}

// 推荐页：从内置主流基金池里，按近期动量 + Sharpe + 最大回撤综合打分。
// 首次进入会拉所有 30 只基金的历史净值（~30 次 JSONP，约 1 分钟），之后缓存。
export function Recommend() {
  const [profiles, setProfiles] = useState<ProfileWithCategory[]>([]);
  const [progress, setProgress] = useState({ done: 0, total: CURATED_POOL.length });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [windowDays, setWindowDays] = useState(60);
  const [filter, setFilter] = useState<CategoryFilter>('all');

  const { items: watchlist, add, load: loadWatchlist } = useWatchlist();
  useEffect(() => { loadWatchlist(); }, [loadWatchlist]);

  useEffect(() => {
    let cancelled = false;
    const out: ProfileWithCategory[] = [];

    async function run() {
      setLoading(true);
      let done = 0;

      // 阶段 1：cache 命中先填进去
      for (const f of CURATED_POOL) {
        if (cancelled) return;
        const cached = await loadProfile(f.code);
        if (cached && Date.now() - cached.fetchedAt < 24 * 3600_000) {
          out.push({ ...cached, category: f.category });
          done++;
        }
      }
      if (out.length > 0) setProfiles([...out]);
      setProgress({ done, total: CURATED_POOL.length });

      // 阶段 2：剩下的从网络拉
      for (const f of CURATED_POOL) {
        if (cancelled) return;
        if (out.some((p) => p.code === f.code)) continue;
        try {
          const p = await fetchProfile(f.code);
          await saveProfile(p);
          out.push({ ...p, category: f.category });
          setProfiles([...out]);
        } catch (e) {
          // 单只失败跳过：基金可能清盘或代码失效
          console.warn(`profile ${f.code} failed`, e);
        }
        done++;
        setProgress({ done, total: CURATED_POOL.length });
        // 错峰避免触发限流
        await new Promise((r) => setTimeout(r, 150));
      }
      if (!cancelled) setLoading(false);
    }

    run().catch((e) => {
      if (!cancelled) {
        setError((e as Error).message);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

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

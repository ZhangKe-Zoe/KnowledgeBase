import { useEffect, useMemo } from 'react';
import { detectRegime } from '../quant/regime';
import { useCurated } from '../store/curated';

// 市场风格仪表盘：从内置 30+ 只主流基金的近 60 日走势反推
// 当前市场偏向(进攻/防守/均衡/极度防守)，并给出对应的策略模板。
//
// 这里的「分析」基于价格行为，不依赖外部新闻 / LLM。优点是离线可靠，
// 缺点是反映滞后于真实事件 — 截图里那种"中东局势缓和"这类宏观叙事，
// 价格通常已经先反映在走势里。

const REGIME_BADGE: Record<string, string> = {
  bull: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  bear: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  sideways: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  'risk-off': 'bg-amber-500/15 text-amber-300 border-amber-500/30',
};

export function MarketRegime() {
  const { profiles, loading, progress, ensure, error } = useCurated();

  useEffect(() => { ensure(); }, [ensure]);

  const analysis = useMemo(
    () => (profiles.length > 0 ? detectRegime(profiles) : null),
    [profiles],
  );

  if (error) {
    return <div className="card text-sm text-red-400">市场分析加载失败：{error}</div>;
  }

  if (!analysis) {
    return (
      <div className="card text-sm text-slate-300">
        正在加载市场数据 {progress.done}/{progress.total}（首次约 1 分钟，之后秒开）…
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Regime + reasoning */}
      <div className="card">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-medium">当前市场风格</div>
          <span className={`text-xs px-2 py-0.5 rounded border ${REGIME_BADGE[analysis.regime]}`}>
            {analysis.label}
          </span>
        </div>
        <div className="text-sm text-slate-200 leading-relaxed">{analysis.reasoning}</div>
        <div className="text-[11px] text-slate-500 mt-2">
          数据截止 {analysis.asOf || '—'}，基于 {analysis.categories.reduce((s, c) => s + c.fundCount, 0)} 只主流基金的 60 日走势。
        </div>
      </div>

      {/* 推荐策略 */}
      <div className="card">
        <div className="text-sm font-medium mb-1">建议策略</div>
        <div className="text-sm text-slate-200 mb-1">
          <span className="font-semibold">{analysis.template.name}</span>
          <span className="text-xs text-slate-400 ml-2">每 {analysis.template.rebalanceDays} 日调仓 · Top {analysis.template.topK}</span>
        </div>
        <div className="text-xs text-slate-400 mb-2">{analysis.template.desc}</div>
        <div className="text-[11px] text-slate-500 font-mono bg-slate-900/40 rounded p-2">
          {analysis.template.expr}
        </div>
        {analysis.template.preferredCategories && (
          <div className="text-[11px] text-slate-500 mt-2">
            偏好资产：{analysis.template.preferredCategories.join(' / ')}
          </div>
        )}
      </div>

      {/* 大类资产排行 */}
      <div className="card">
        <div className="text-sm font-medium mb-2">大类资产 60 日表现</div>
        <div className="space-y-1.5">
          {analysis.categories.map((c) => (
            <div key={c.category} className="flex items-center gap-2 text-xs">
              <div className="w-16 text-slate-300 truncate">{c.category}</div>
              <CategoryBar value={c.meanReturn60d} />
              <div className={`w-14 text-right font-mono font-semibold ${c.meanReturn60d >= 0 ? 'text-up' : 'text-down'}`}>
                {(c.meanReturn60d * 100).toFixed(1)}%
              </div>
              <div className="w-16 text-right text-slate-500">Sh {c.meanSharpe60d.toFixed(2)}</div>
            </div>
          ))}
        </div>
      </div>

      {loading && (
        <div className="text-[11px] text-slate-500 text-center">
          后台仍在加载剩余数据 {progress.done}/{progress.total} …
        </div>
      )}
    </div>
  );
}

// 横向条：以 ±20% 为坐标范围，正向往右、负向往左。
function CategoryBar({ value }: { value: number }) {
  const range = 0.2;
  const clipped = Math.max(-range, Math.min(range, value));
  const widthPct = (Math.abs(clipped) / range) * 50;
  const positive = clipped >= 0;
  return (
    <div className="flex-1 h-2 bg-slate-800 rounded relative">
      <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-700" />
      <div
        className={`absolute top-0 bottom-0 ${positive ? 'left-1/2 bg-up/80' : 'right-1/2 bg-down/80'}`}
        style={{ width: `${widthPct}%` }}
      />
    </div>
  );
}

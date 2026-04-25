import { useMemo } from 'react';
import type { WatchlistItem } from '../data/types';
import { CURATED_POOL, type CuratedCategory } from '../data/curated';

interface Props {
  items: WatchlistItem[];
}

// 给"持有中"的自选基金做一个简单组合诊断：
//  - 总持仓金额（仅当用户填写了 amount 才有意义）
//  - 集中度（最大单只占比 / 前 3 只占比 / Herfindahl 指数）
//  - 资产类别分布（用 curated 池的 category 推断；不在 curated 池里的归"其他"）
//  - 给出 1-3 条针对性建议
//
// 思路：让用户一眼看出"我是不是太集中""我有没有过度押注一个赛道"。
export function HoldingDiagnosis({ items }: Props) {
  const held = items.filter((i) => i.held);

  const stats = useMemo(() => {
    const withAmount = held.filter((h) => (h.amount ?? 0) > 0);
    const total = withAmount.reduce((s, h) => s + (h.amount ?? 0), 0);

    if (total === 0) {
      return null;
    }

    // 占比
    const weights = withAmount
      .map((h) => ({ code: h.code, name: h.name, weight: (h.amount ?? 0) / total, amount: h.amount ?? 0 }))
      .sort((a, b) => b.weight - a.weight);

    const top1 = weights[0]?.weight ?? 0;
    const top3 = weights.slice(0, 3).reduce((s, w) => s + w.weight, 0);
    // Herfindahl-Hirschman Index（HHI）：sum(w_i^2)，0..1，1 = 单一持仓
    const hhi = weights.reduce((s, w) => s + w.weight * w.weight, 0);

    // 资产类别（用 curated 池 category 映射）
    const codeToCat = new Map(CURATED_POOL.map((c) => [c.code, c.category]));
    const catWeights = new Map<string, number>();
    for (const w of weights) {
      const cat = codeToCat.get(w.code) ?? '其他';
      catWeights.set(cat, (catWeights.get(cat) ?? 0) + w.weight);
    }
    const cats = Array.from(catWeights.entries()).sort((a, b) => b[1] - a[1]);

    const advice: string[] = [];
    if (top1 > 0.4) advice.push(`单只基金占比 ${(top1 * 100).toFixed(0)}%，集中度偏高，建议拆分到 3 只以上。`);
    if (hhi > 0.4) advice.push(`组合赫芬达尔指数 ${hhi.toFixed(2)}，整体集中度高（>0.4 算偏高）。`);
    if (cats[0] && cats[0][1] > 0.6 && cats[0][0] !== '其他') {
      advice.push(`「${cats[0][0]}」资产类别占比 ${(cats[0][1] * 100).toFixed(0)}%，缺少跨资产对冲，可考虑加入${cats[0][0] === '黄金' ? 'A股 / 美股' : '黄金 / 债券'}。`);
    }
    const unknownPct = catWeights.get('其他') ?? 0;
    if (unknownPct > 0.3) advice.push(`${(unknownPct * 100).toFixed(0)}% 持仓未识别资产类别（不在内置主流池里），分散性难以评估。`);
    if (advice.length === 0) advice.push('持仓集中度合理，可重点关注因子推荐与行情变化。');

    return { total, weights, top1, top3, hhi, cats, advice };
  }, [held]);

  if (held.length === 0) {
    return null;
  }

  if (!stats) {
    return (
      <div className="card !p-3">
        <div className="text-sm font-medium mb-1">持仓诊断</div>
        <div className="text-xs text-slate-400">
          已标记 {held.length} 只持有，但未填写持仓金额。截图导入或长按基金可补充金额。
        </div>
      </div>
    );
  }

  return (
    <div className="card !p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">持仓诊断</div>
        <div className="text-xs text-slate-500">
          总市值 ¥{stats.total.toFixed(0)}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <Cell label="最大占比" value={`${(stats.top1 * 100).toFixed(0)}%`} warn={stats.top1 > 0.4} />
        <Cell label="前3占比" value={`${(stats.top3 * 100).toFixed(0)}%`} warn={stats.top3 > 0.7} />
        <Cell label="集中度HHI" value={stats.hhi.toFixed(2)} warn={stats.hhi > 0.4} />
      </div>

      <div className="text-xs">
        <div className="text-slate-400 mb-1">资产分布</div>
        <div className="space-y-1">
          {stats.cats.slice(0, 5).map(([cat, w]) => (
            <div key={cat} className="flex items-center gap-2">
              <span className="w-16 text-slate-300 truncate">{cat}</span>
              <div className="flex-1 h-1.5 bg-slate-800 rounded">
                <div className="h-full bg-sky-400 rounded" style={{ width: `${w * 100}%` }} />
              </div>
              <span className="w-10 text-right text-slate-400">{(w * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="text-xs text-slate-300 leading-relaxed bg-slate-900/40 rounded p-2 space-y-1">
        {stats.advice.map((a, i) => (
          <div key={i}>• {a}</div>
        ))}
      </div>
    </div>
  );
}

function Cell({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className={`rounded p-2 ${warn ? 'bg-rose-500/10 text-rose-300' : 'bg-slate-800/60 text-slate-300'}`}>
      <div className="text-[10px] text-slate-400">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}

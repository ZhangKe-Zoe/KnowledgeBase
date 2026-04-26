import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { RegimeAnalysis } from '../quant/regime';
import { useWatchlist } from '../store/watchlist';
import { db } from '../data/local/dexie';
import { CURATED_POOL } from '../data/curated';
import type { StrategyDef } from '../data/types';

interface Props {
  analysis: RegimeAnalysis;
}

// 智能调仓：把「当前市场风格」+「用户已持有」组合成一条具体建议。
//
// 行为：
//  1) 把 curated 池 + 用户持有的代码合并为 universe（去重）
//  2) 用 regime 推荐的策略表达式 + 调仓频率 + topK 创建一个临时 strategy
//  3) 跳到 Backtest 页跑一次回测，得到具体 buy/sell/hold 操作
//
// 这套流程比让用户自己写表达式 / 选基金池实用得多 — 整个智能化决策
// 链路只需要一键。
export function SmartRebalance({ analysis }: Props) {
  const navigate = useNavigate();
  const { items: watchlist } = useWatchlist();
  const [creating, setCreating] = useState(false);

  const heldCount = useMemo(() => watchlist.filter((w) => w.held).length, [watchlist]);
  const heldAmount = useMemo(
    () => watchlist.filter((w) => w.held).reduce((s, w) => s + (w.amount ?? 0), 0),
    [watchlist],
  );

  async function onApply() {
    setCreating(true);
    try {
      const universe = Array.from(new Set([
        ...CURATED_POOL.map((c) => c.code),
        ...watchlist.map((w) => w.code),
      ]));

      // 起始日期：取最近 3 年作回测窗口（够 60 日动量等因子收敛）
      const today = new Date();
      const start = new Date(today);
      start.setFullYear(today.getFullYear() - 3);

      const strategy: StrategyDef = {
        id: crypto.randomUUID(),
        name: `智能${analysis.label} · ${today.toLocaleDateString('zh-CN')}`,
        expr: analysis.template.expr,
        universe,
        topK: analysis.template.topK,
        rebalanceDays: analysis.template.rebalanceDays,
        startDate: start.toISOString().slice(0, 10),
        endDate: today.toISOString().slice(0, 10),
        buyFee: 0.0015,
        sellFee: 0.005,
        initialCash: heldAmount > 0 ? heldAmount : 10000,
      };
      await db.strategies.put(strategy);
      navigate(`/backtest/${strategy.id}`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="card border border-sky-500/30 bg-sky-500/5">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium">🧠 智能调仓建议</div>
        <span className="text-[11px] text-sky-300">{analysis.label}</span>
      </div>
      <div className="text-sm text-slate-200 leading-relaxed mb-2">
        基于「{analysis.template.name}」策略，从主流基金池
        {heldCount > 0 ? ` + 你持有的 ${heldCount} 只` : ''}里选 Top {analysis.template.topK}，
        每 {analysis.template.rebalanceDays} 日调一次。
      </div>
      <div className="text-xs text-slate-400 mb-3">{analysis.template.desc}</div>
      <button
        className="btn w-full"
        disabled={creating}
        onClick={onApply}
      >
        {creating ? '生成中…' : '一键回测并生成具体操作'}
      </button>
      <div className="text-[11px] text-slate-500 mt-2 leading-relaxed">
        {heldAmount > 0
          ? `回测以你当前 ¥${heldAmount.toFixed(0)} 持仓为初始资金，结果可与现在直接对比。`
          : '回测用 ¥10000 模拟初始资金（在自选页填写持仓金额可换成实际数）。'}
      </div>
    </div>
  );
}

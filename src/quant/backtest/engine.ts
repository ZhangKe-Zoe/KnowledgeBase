import type { FundProfile, StrategyDef, BacktestRun, RebalanceSnapshot } from '../../data/types';
import { buildDataset } from '../data/dataset';
import { parse } from '../expr/parser';
import { evaluateAll } from '../expr/evaluator';
import { Portfolio } from './portfolio';
import { annualReturn, sharpe, maxDrawdown, calmar, winRate, totalReturn } from '../metrics';

// 运行一次回测
// 主循环：每交易日
//   1) 估计当日组合净值
//   2) 若为调仓日：评估因子 → 选 topK → 按等权重分配 → 调仓
export function runBacktest(profiles: FundProfile[], strategy: StrategyDef): BacktestRun {
  if (profiles.length === 0) throw new Error('空基金池');

  const data = buildDataset(profiles, ['nav'], strategy.startDate, strategy.endDate);
  const factorAst = parse(strategy.expr);
  const factorPerCode = evaluateAll(factorAst, data);

  // code → name 映射，用于调仓快照里回填基金名
  const codeToName = new Map<string, string>();
  for (const p of profiles) codeToName.set(p.code, p.name);

  const navCols = data.fields.nav;
  const portfolio = new Portfolio(strategy.initialCash, {
    buyFee: strategy.buyFee,
    sellFee: strategy.sellFee,
  });

  const equity: Array<{ date: string; value: number }> = [];
  const rebalances: RebalanceSnapshot[] = [];
  let totalTrades = 0;
  const T = data.dates.length;

  for (let t = 0; t < T; t++) {
    const navByCode = new Map<string, number>();
    for (let i = 0; i < data.codes.length; i++) {
      const v = navCols[i][t];
      if (Number.isFinite(v)) navByCode.set(data.codes[i], v);
    }

    // 调仓：第 0 天 + 每 rebalanceDays 一次
    if (t % strategy.rebalanceDays === 0) {
      const scores: Array<{ code: string; score: number }> = [];
      for (let i = 0; i < data.codes.length; i++) {
        const s = factorPerCode[i][t];
        if (Number.isFinite(s) && navByCode.has(data.codes[i])) {
          scores.push({ code: data.codes[i], score: s });
        }
      }
      scores.sort((a, b) => b.score - a.score);
      const picks = scores.slice(0, strategy.topK);
      if (picks.length > 0) {
        const w = 1 / picks.length;
        const target = new Map<string, number>();
        for (const p of picks) target.set(p.code, w);
        totalTrades += portfolio.rebalance(target, navByCode);

        rebalances.push({
          date: data.dates[t],
          picks: picks.map((p) => ({
            code: p.code,
            name: codeToName.get(p.code) ?? p.code,
            score: p.score,
            weight: w,
          })),
        });
      }
    }

    equity.push({ date: data.dates[t], value: portfolio.value(navByCode) });
  }

  const values = equity.map((p) => p.value);
  return {
    id: crypto.randomUUID(),
    strategyId: strategy.id,
    strategyName: strategy.name,
    ranAt: Date.now(),
    equity,
    trades: totalTrades,
    rebalances,
    finalTargets: rebalances.length > 0 ? rebalances[rebalances.length - 1] : null,
    metrics: {
      totalReturn: totalReturn(values),
      annualReturn: annualReturn(values),
      sharpe: sharpe(values),
      maxDrawdown: maxDrawdown(values),
      calmar: calmar(values),
      winRate: winRate(values),
    },
  };
}

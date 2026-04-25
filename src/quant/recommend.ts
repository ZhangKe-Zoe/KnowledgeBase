import type { FundProfile } from '../data/types';
import { totalReturn, sharpe as sharpeMetric, maxDrawdown } from './metrics';

// 给定 N 只基金的历史净值，按"近 windowDays 天"的综合表现打分。
// 综合得分 = 0.4 * 收益率排名 + 0.3 * Sharpe 排名 + 0.3 * 回撤排名（小回撤=高分）
//
// 选这种 rank 加权而不是直接加权，是因为不同指标量纲差异大（Sharpe 0~3，
// 回撤 -50%~0%），rank 转 0..1 后才好按权重组合。

export interface FundScore {
  code: string;
  name: string;
  recentReturn: number;     // 近 N 日累计收益率（小数，0.05 = 5%）
  sharpe: number;           // 近 N 日年化 Sharpe
  maxDD: number;            // 近 N 日最大回撤（负数）
  composite: number;        // 综合得分 0..1
  reason: string;           // 给用户看的一句话理由
}

export interface ScoreOptions {
  windowDays?: number;
  riskFreeAnnual?: number;
}

// 按值排名转 0..1 百分位（1 = 最优）。NaN 视作最差。
function rankPercentile(values: number[], higherIsBetter = true): number[] {
  const n = values.length;
  if (n <= 1) return values.map(() => 0.5);
  const idx = values.map((v, i) => ({ v: Number.isFinite(v) ? v : (higherIsBetter ? -Infinity : Infinity), i }));
  idx.sort((a, b) => higherIsBetter ? b.v - a.v : a.v - b.v);
  const out = new Array(n);
  idx.forEach((x, rank) => { out[x.i] = 1 - rank / (n - 1); });
  return out;
}

export function scoreFunds(
  profiles: FundProfile[],
  opts: ScoreOptions = {},
): FundScore[] {
  const windowDays = opts.windowDays ?? 60;
  const rf = opts.riskFreeAnnual ?? 0.025;

  const stats = profiles.map((p) => {
    const tail = p.nav.slice(-windowDays);
    const equity = tail.map((x) => x.nav);
    if (equity.length < Math.floor(windowDays * 0.5)) {
      return { code: p.code, name: p.name, ret: NaN, sh: NaN, dd: NaN };
    }
    return {
      code: p.code,
      name: p.name,
      ret: totalReturn(equity),
      sh: sharpeMetric(equity, rf),
      dd: maxDrawdown(equity),
    };
  });

  const valid = stats.filter((s) => Number.isFinite(s.ret));
  if (valid.length === 0) return [];

  const rRet = rankPercentile(valid.map((s) => s.ret), true);
  const rSh = rankPercentile(valid.map((s) => s.sh), true);
  // dd 是负数，越大（越接近 0）越好 → higherIsBetter = true
  const rDd = rankPercentile(valid.map((s) => s.dd), true);

  return valid
    .map((s, i) => {
      const composite = rRet[i] * 0.4 + rSh[i] * 0.3 + rDd[i] * 0.3;
      const reason = `${windowDays}日收益 ${(s.ret * 100).toFixed(1)}% · Sharpe ${s.sh.toFixed(2)} · 回撤 ${(s.dd * 100).toFixed(1)}%`;
      return {
        code: s.code,
        name: s.name,
        recentReturn: s.ret,
        sharpe: s.sh,
        maxDD: s.dd,
        composite,
        reason,
      };
    })
    .sort((a, b) => b.composite - a.composite);
}

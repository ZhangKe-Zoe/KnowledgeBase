// 回测指标：年化、Sharpe、最大回撤、Calmar、胜率

export function annualReturn(equity: number[], tradingDaysPerYear = 252): number {
  if (equity.length < 2) return 0;
  const total = equity[equity.length - 1] / equity[0];
  const years = equity.length / tradingDaysPerYear;
  return total ** (1 / years) - 1;
}

export function dailyReturns(equity: number[]): number[] {
  const r: number[] = [];
  for (let i = 1; i < equity.length; i++) r.push(equity[i] / equity[i - 1] - 1);
  return r;
}

export function sharpe(equity: number[], rfAnnual = 0.025, tradingDaysPerYear = 252): number {
  const r = dailyReturns(equity);
  if (r.length < 2) return 0;
  const rfDaily = rfAnnual / tradingDaysPerYear;
  const excess = r.map((x) => x - rfDaily);
  const mean = excess.reduce((a, b) => a + b, 0) / excess.length;
  const sd = Math.sqrt(excess.reduce((a, b) => a + (b - mean) ** 2, 0) / (excess.length - 1));
  return sd === 0 ? 0 : (mean / sd) * Math.sqrt(tradingDaysPerYear);
}

export function maxDrawdown(equity: number[]): number {
  let peak = equity[0];
  let maxDD = 0;
  for (const v of equity) {
    if (v > peak) peak = v;
    const dd = v / peak - 1;
    if (dd < maxDD) maxDD = dd;
  }
  return maxDD; // 负数
}

export function calmar(equity: number[]): number {
  const dd = Math.abs(maxDrawdown(equity));
  if (dd === 0) return 0;
  return annualReturn(equity) / dd;
}

export function winRate(equity: number[]): number {
  const r = dailyReturns(equity);
  if (r.length === 0) return 0;
  const wins = r.filter((x) => x > 0).length;
  return wins / r.length;
}

export function totalReturn(equity: number[]): number {
  if (equity.length < 2) return 0;
  return equity[equity.length - 1] / equity[0] - 1;
}

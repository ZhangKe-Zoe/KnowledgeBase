import { NavChart } from './NavChart';
import type { BacktestRun } from '../data/types';

interface Props {
  run: BacktestRun;
}

const fmtPct = (v: number) => `${(v * 100).toFixed(2)}%`;
const fmtNum = (v: number) => v.toFixed(2);

export function BacktestReport({ run }: Props) {
  const dates = run.equity.map((p) => p.date);
  const values = run.equity.map((p) => p.value);

  const m = run.metrics;
  const items: Array<[string, string, boolean?]> = [
    ['总收益', fmtPct(m.totalReturn), m.totalReturn >= 0],
    ['年化收益', fmtPct(m.annualReturn), m.annualReturn >= 0],
    ['Sharpe', fmtNum(m.sharpe), m.sharpe >= 0],
    ['最大回撤', fmtPct(m.maxDrawdown), false],
    ['Calmar', fmtNum(m.calmar), m.calmar >= 0],
    ['胜率', fmtPct(m.winRate)],
    ['交易次数', String(run.trades)],
  ];

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="text-sm font-medium mb-2">{run.strategyName}</div>
        <div className="text-xs text-slate-400">
          运行于 {new Date(run.ranAt).toLocaleString('zh-CN')}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {items.map(([k, v, positive]) => (
          <div key={k} className="card !p-3">
            <div className="text-xs text-slate-400">{k}</div>
            <div className={`text-lg font-semibold mt-1 ${
              positive === undefined ? '' : positive ? 'text-up' : 'text-down'
            }`}>{v}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="text-sm font-medium mb-2">权益曲线</div>
        <NavChart dates={dates} series={[{ name: '组合净值', data: values }]} yLabel="¥" />
      </div>
    </div>
  );
}

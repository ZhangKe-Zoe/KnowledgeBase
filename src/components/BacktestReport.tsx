import { useEffect } from 'react';
import { NavChart } from './NavChart';
import type { BacktestRun } from '../data/types';
import { useWatchlist } from '../store/watchlist';

interface Props {
  run: BacktestRun;
}

const fmtPct = (v: number) => `${(v * 100).toFixed(2)}%`;
const fmtNum = (v: number) => v.toFixed(2);

type ActionKind = 'buy' | 'sell' | 'hold';

interface Action {
  kind: ActionKind;
  code: string;
  name: string;
  weight?: number;       // 目标权重（买入 / 持有）
  amount?: number;       // 当前持仓金额（卖出 / 持有）
}

export function BacktestReport({ run }: Props) {
  const dates = run.equity.map((p) => p.date);
  const values = run.equity.map((p) => p.value);
  const { items: watchlist, load, add } = useWatchlist();

  useEffect(() => { load(); }, [load]);

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

  // 根据 final targets vs 当前"持有中"的自选，生成买入/卖出/保留建议
  const actions: Action[] = [];
  const rebalances = run.rebalances ?? [];
  const finalTargets = run.finalTargets ?? (rebalances.length > 0 ? rebalances[rebalances.length - 1] : null);
  if (finalTargets) {
    const targetCodes = new Set(finalTargets.picks.map((p) => p.code));
    const heldCodes = new Set(watchlist.filter((w) => w.held).map((w) => w.code));

    for (const pick of finalTargets.picks) {
      if (heldCodes.has(pick.code)) {
        const w = watchlist.find((x) => x.code === pick.code);
        actions.push({ kind: 'hold', code: pick.code, name: pick.name, weight: pick.weight, amount: w?.amount });
      } else {
        actions.push({ kind: 'buy', code: pick.code, name: pick.name, weight: pick.weight });
      }
    }
    for (const w of watchlist) {
      if (w.held && !targetCodes.has(w.code)) {
        actions.push({ kind: 'sell', code: w.code, name: w.name, amount: w.amount });
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="text-sm font-medium mb-2">{run.strategyName}</div>
        <div className="text-xs text-slate-400">
          运行于 {new Date(run.ranAt).toLocaleString('zh-CN')}
        </div>
      </div>

      {/* 操作建议 */}
      {finalTargets && (
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium">操作建议</div>
            <div className="text-xs text-slate-500">
              调仓基准日 {finalTargets.date}
            </div>
          </div>
          {actions.length === 0 ? (
            <div className="text-xs text-slate-400">
              尚未标记任何"持有中"基金。先到"自选"标记当前实际持仓，或用截图导入。
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {actions.map((a) => (
                  <ActionRow key={`${a.kind}-${a.code}`} action={a} />
                ))}
              </div>
              <div className="text-[11px] text-slate-500 mt-3 leading-relaxed">
                说明：买入份额按等权重（共 {finalTargets.picks.length} 只，每只 {(100 / finalTargets.picks.length).toFixed(0)}%）。
                实盘下单前请核对数据，仅供学习研究，不构成投资建议。
              </div>
              {/* 一键把目标持仓补充到自选 */}
              {finalTargets.picks.some((p) => !watchlist.find((w) => w.code === p.code)) && (
                <button
                  className="btn-ghost w-full mt-3"
                  onClick={async () => {
                    for (const p of finalTargets.picks) {
                      if (!watchlist.find((w) => w.code === p.code)) {
                        await add(p.code, p.name);
                      }
                    }
                  }}
                >
                  把新建议标的加入自选
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* 历次调仓 */}
      {rebalances.length > 1 && (
        <details className="card">
          <summary className="text-sm font-medium cursor-pointer">
            历次调仓（{rebalances.length} 次）
          </summary>
          <div className="space-y-2 mt-2">
            {rebalances.slice().reverse().slice(0, 12).map((r) => (
              <div key={r.date} className="border-b border-slate-700/40 last:border-0 pb-2">
                <div className="text-xs text-slate-400">{r.date}</div>
                <div className="text-sm mt-1">
                  {r.picks.map((p) => p.name).join(' / ')}
                </div>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* 指标 */}
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

      {/* 权益曲线 */}
      <div className="card">
        <div className="text-sm font-medium mb-2">权益曲线</div>
        <NavChart dates={dates} series={[{ name: '组合净值', data: values }]} yLabel="¥" />
      </div>
    </div>
  );
}

function ActionRow({ action }: { action: Action }) {
  const cfg = {
    buy: { label: '买入', cls: 'bg-rose-500/15 text-rose-300 border-rose-500/30' },
    sell: { label: '卖出', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
    hold: { label: '保留', cls: 'bg-slate-500/15 text-slate-300 border-slate-500/30' },
  }[action.kind];

  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/60">
      <span className={`text-[11px] px-2 py-0.5 rounded border ${cfg.cls}`}>{cfg.label}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm truncate">{action.name}</div>
        <div className="text-xs text-slate-500">{action.code}</div>
      </div>
      <div className="text-right">
        {action.weight !== undefined && (
          <div className="text-xs text-slate-300">目标 {(action.weight * 100).toFixed(0)}%</div>
        )}
        {action.amount !== undefined && action.amount > 0 && (
          <div className="text-xs text-slate-500">持 ¥{action.amount.toFixed(0)}</div>
        )}
      </div>
    </div>
  );
}

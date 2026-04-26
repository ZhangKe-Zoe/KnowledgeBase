import { useEffect, useMemo } from 'react';
import { NavChart } from './NavChart';
import type { BacktestRun } from '../data/types';
import { useWatchlist } from '../store/watchlist';

interface Props {
  run: BacktestRun;
}

const fmtPct = (v: number) => `${(v * 100).toFixed(2)}%`;
const fmtPctSigned = (v: number) => `${v >= 0 ? '+' : ''}${(v * 100).toFixed(2)}%`;
const fmtNum = (v: number) => v.toFixed(2);

type ActionKind = 'buy' | 'sell' | 'hold';

interface Action {
  kind: ActionKind;
  code: string;
  name: string;
  weight?: number;       // 目标权重（买入 / 持有）
  amount?: number;       // 当前持仓金额（卖出 / 持有）
  score?: number;        // 因子得分（买/持）
  rank?: { n: number; total: number };
  reason: string;        // 一句话理由
}

export function BacktestReport({ run }: Props) {
  const dates = run.equity.map((p) => p.date);
  const values = run.equity.map((p) => p.value);
  const { items: watchlist, load, add } = useWatchlist();

  useEffect(() => { load(); }, [load]);

  const m = run.metrics;
  const items: Array<[string, string, boolean?, string?]> = [
    ['总收益', fmtPct(m.totalReturn), m.totalReturn >= 0, '回测期间组合赚的钱占初始资金的比例'],
    ['年化收益', fmtPct(m.annualReturn), m.annualReturn >= 0, '把回测期收益平均到 12 个月，越高越好'],
    ['Sharpe', fmtNum(m.sharpe), m.sharpe >= 0, '每承担 1 单位风险换来的超额收益，>1 算优秀'],
    ['最大回撤', fmtPct(m.maxDrawdown), false, '历史上某段时间从最高点跌到最低点的幅度，越接近 0 越好'],
    ['Calmar', fmtNum(m.calmar), m.calmar >= 0, '年化收益 ÷ 最大回撤，>1 通常算稳健'],
    ['胜率', fmtPct(m.winRate), undefined, '日收益为正的天数占比，参考意义有限'],
    ['交易次数', String(run.trades), undefined, '总买卖次数，越多手续费越高'],
  ];

  // 根据 final targets vs 当前"持有中"的自选，生成买入/卖出/保留建议
  const actions: Action[] = useMemo(() => {
    const out: Action[] = [];
    const rebalances = run.rebalances ?? [];
    const finalTargets = run.finalTargets ?? (rebalances.length > 0 ? rebalances[rebalances.length - 1] : null);
    if (!finalTargets) return out;

    const universeSize = finalTargets.universeSize ?? finalTargets.picks.length;
    const targetCodes = new Set(finalTargets.picks.map((p) => p.code));
    const heldCodes = new Set(watchlist.filter((w) => w.held).map((w) => w.code));

    finalTargets.picks.forEach((pick, i) => {
      const rank = { n: i + 1, total: universeSize };
      const reason = `因子得分 ${pick.score.toFixed(3)} · 排名 ${rank.n}/${rank.total}`;
      if (heldCodes.has(pick.code)) {
        const w = watchlist.find((x) => x.code === pick.code);
        out.push({ kind: 'hold', code: pick.code, name: pick.name, weight: pick.weight, amount: w?.amount, score: pick.score, rank, reason });
      } else {
        out.push({ kind: 'buy', code: pick.code, name: pick.name, weight: pick.weight, score: pick.score, rank, reason });
      }
    });
    for (const w of watchlist) {
      if (w.held && !targetCodes.has(w.code)) {
        out.push({ kind: 'sell', code: w.code, name: w.name, amount: w.amount, reason: '已不在 Top-K，不再符合策略条件' });
      }
    }
    return out;
  }, [run, watchlist]);

  // 当前总持仓 + 期望调仓后金额
  const totalHeld = watchlist.filter((w) => w.held).reduce((s, w) => s + (w.amount ?? 0), 0);
  const buyAmount = actions.filter((a) => a.kind === 'buy').reduce((s, a) => s + (totalHeld * (a.weight ?? 0)), 0);
  const sellAmount = actions.filter((a) => a.kind === 'sell').reduce((s, a) => s + (a.amount ?? 0), 0);

  const finalTargets = run.finalTargets ?? (run.rebalances && run.rebalances.length > 0 ? run.rebalances[run.rebalances.length - 1] : null);
  const rebalances = run.rebalances ?? [];

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="text-sm font-medium mb-2">{run.strategyName}</div>
        <div className="text-xs text-slate-400">
          运行于 {new Date(run.ranAt).toLocaleString('zh-CN')}
        </div>
      </div>

      {/* 预期收益参考（基于历史回测） */}
      <div className="card border border-amber-500/30 bg-amber-500/5">
        <div className="text-xs text-amber-300 font-medium mb-1">假设市场环境与历史相似</div>
        <div className="text-sm text-slate-200 leading-relaxed">
          年化预期 <span className="font-semibold">{fmtPctSigned(m.annualReturn)}</span>
          ，期间最差时段需承受 <span className="font-semibold">{fmtPct(m.maxDrawdown)}</span> 回撤。
          <span className="text-slate-400"> Sharpe {fmtNum(m.sharpe)}，每承担 1 元风险换 {fmtNum(m.sharpe)} 元超额收益。</span>
        </div>
        <div className="text-[11px] text-slate-500 mt-2">
          ⚠️ 历史结果不代表未来，市场风格切换时策略可能完全失效，且不构成投资建议。
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
              尚未标记任何「持有中」基金。先到「自选」标记当前实际持仓，或用截图导入。
            </div>
          ) : (
            <>
              {/* 调仓金额预算（仅当用户填了 amount 时有意义） */}
              {totalHeld > 0 && (
                <div className="text-xs text-slate-400 mb-2 leading-relaxed bg-slate-900/40 rounded p-2">
                  当前持仓 ¥{totalHeld.toFixed(0)} · 建议调入约 ¥{buyAmount.toFixed(0)} · 调出约 ¥{sellAmount.toFixed(0)}
                </div>
              )}
              <div className="space-y-2">
                {actions.map((a) => (
                  <ActionRow key={`${a.kind}-${a.code}`} action={a} />
                ))}
              </div>
              <div className="text-[11px] text-slate-500 mt-3 leading-relaxed">
                等权配置（{finalTargets.picks.length} 只 × {(100 / finalTargets.picks.length).toFixed(0)}%）。
                因子得分代表策略对该基金的偏好，排名越前越值得加仓。
              </div>
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

      {/* 指标（带白话解释） */}
      <div className="grid grid-cols-2 gap-2">
        {items.map(([k, v, positive, hint]) => (
          <div key={k} className="card !p-3">
            <div className="text-xs text-slate-400">{k}</div>
            <div className={`text-lg font-semibold mt-1 ${
              positive === undefined ? '' : positive ? 'text-up' : 'text-down'
            }`}>{v}</div>
            {hint && <div className="text-[10px] text-slate-500 mt-1 leading-snug">{hint}</div>}
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
    <div className="p-2 rounded-lg bg-slate-900/60">
      <div className="flex items-center gap-2">
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
      <div className="text-[11px] text-slate-400 mt-1 ml-[52px]">{action.reason}</div>
    </div>
  );
}

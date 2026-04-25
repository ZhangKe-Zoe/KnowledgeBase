import { Link } from 'react-router-dom';
import type { FundRealtime } from '../data/types';

interface Props {
  code: string;
  name: string;
  realtime?: FundRealtime;
  amount?: number;
  onAmountChange?: (amount: number | undefined) => void;
  onRemove?: () => void;
}

export function FundCard({ code, name, realtime, amount, onAmountChange, onRemove }: Props) {
  const pct = realtime?.estPct ?? 0;
  const positive = pct >= 0;
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <Link to={`/fund/${code}`} className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{name}</div>
          <div className="text-xs text-slate-400 mt-0.5">{code}</div>
        </Link>
        <div className="flex flex-col items-end ml-3">
          {realtime ? (
            <>
              <div className={`text-base font-semibold ${positive ? 'text-up' : 'text-down'}`}>
                {realtime.est.toFixed(4)}
              </div>
              <div className={`text-xs ${positive ? 'text-up' : 'text-down'}`}>
                {positive ? '+' : ''}{pct.toFixed(2)}%
              </div>
            </>
          ) : (
            <div className="text-xs text-slate-500">—</div>
          )}
          {onRemove && (
            <button
              onClick={onRemove}
              className="mt-1 text-xs text-slate-500 active:text-red-400"
            >
              移除
            </button>
          )}
        </div>
      </div>
      {onAmountChange && (
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-700/40">
          <span className="text-xs text-slate-500">持有金额</span>
          <input
            type="number"
            inputMode="decimal"
            value={amount ?? ''}
            placeholder="选填，单位元"
            className="flex-1 bg-slate-800/60 text-xs px-2 py-1 rounded text-right"
            onChange={(e) => {
              const v = e.target.value.trim() === '' ? undefined : Number(e.target.value);
              onAmountChange(Number.isFinite(v as number) ? (v as number) : undefined);
            }}
          />
          {amount !== undefined && amount > 0 && (
            <span className="text-xs text-slate-400 font-mono">¥{amount.toFixed(0)}</span>
          )}
        </div>
      )}
    </div>
  );
}

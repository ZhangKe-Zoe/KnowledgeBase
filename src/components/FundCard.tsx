import { Link } from 'react-router-dom';
import type { FundRealtime } from '../data/types';

interface Props {
  code: string;
  name: string;
  realtime?: FundRealtime;
  onRemove?: () => void;
}

export function FundCard({ code, name, realtime, onRemove }: Props) {
  const pct = realtime?.estPct ?? 0;
  const positive = pct >= 0;
  return (
    <div className="card flex items-center justify-between">
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
  );
}

import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../data/local/dexie';
import { BacktestReport } from '../components/BacktestReport';
import type { BacktestRun } from '../data/types';

export function Report() {
  const { runId } = useParams<{ runId: string }>();
  const [run, setRun] = useState<BacktestRun | null>(null);

  useEffect(() => {
    if (!runId) return;
    db.backtests.get(runId).then((r) => setRun(r ?? null));
  }, [runId]);

  return (
    <div className="p-4 space-y-3">
      <Link to="/strategy" className="text-xs text-sky-400">‹ 返回策略</Link>
      {!run ? (
        <div className="text-sm text-slate-400">加载回测结果…</div>
      ) : (
        <BacktestReport run={run} />
      )}
    </div>
  );
}

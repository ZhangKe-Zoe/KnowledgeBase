import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../data/local/dexie';
import { loadProfile, saveProfile } from '../data/local/dexie';
import { fetchProfile } from '../data/remote/eastmoney';
import { runBacktest } from '../quant/backtest/engine';
import { useStrategy } from '../store/strategy';
import type { StrategyDef, FundProfile } from '../data/types';

export function Backtest() {
  const { strategyId } = useParams<{ strategyId: string }>();
  const nav = useNavigate();
  const { saveRun } = useStrategy();

  const [strategy, setStrategy] = useState<StrategyDef | null>(null);
  const [progress, setProgress] = useState<string>('准备中…');
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!strategyId) return;
    (async () => {
      const s = await db.strategies.get(strategyId);
      if (!s) { setErr('策略不存在'); return; }
      setStrategy(s);

      try {
        setProgress('加载基金历史净值…');
        const profiles: FundProfile[] = [];
        for (let i = 0; i < s.universe.length; i++) {
          const code = s.universe[i];
          setProgress(`加载 ${code} (${i + 1}/${s.universe.length})`);
          let p = await loadProfile(code);
          if (!p || Date.now() - p.fetchedAt > 24 * 3600 * 1000) {
            p = await fetchProfile(code);
            await saveProfile(p);
          }
          profiles.push(p);
          await new Promise((r) => setTimeout(r, 150));
        }

        setProgress('运行回测引擎…');
        const run = runBacktest(profiles, s);
        await saveRun(run);
        nav(`/report/${run.id}`, { replace: true });
      } catch (e) {
        setErr((e as Error).message);
      }
    })();
  }, [strategyId, nav, saveRun]);

  return (
    <div className="p-4 space-y-3">
      <h1 className="text-lg font-semibold">回测运行</h1>
      {strategy && (
        <div className="card">
          <div className="text-sm font-medium">{strategy.name}</div>
          <div className="text-xs text-slate-400 mt-1 font-mono">{strategy.expr}</div>
          <div className="text-xs text-slate-500 mt-2">
            基金池 {strategy.universe.length} 只 · Top-{strategy.topK} · 每 {strategy.rebalanceDays} 日调仓
          </div>
        </div>
      )}
      {err ? (
        <div className="card text-sm text-red-400">{err}</div>
      ) : (
        <div className="card text-sm text-slate-300">{progress}</div>
      )}
    </div>
  );
}

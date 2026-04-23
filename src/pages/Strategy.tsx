import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStrategy } from '../store/strategy';
import { useWatchlist } from '../store/watchlist';
import { FACTORS } from '../quant/factors';
import { parse } from '../quant/expr/parser';
import { DataBackup } from '../components/DataBackup';
import type { StrategyDef } from '../data/types';

const DEFAULT_STRATEGY: Omit<StrategyDef, 'id' | 'universe'> = {
  name: '20 日动量 Top-3',
  expr: '$nav / Ref($nav, 20) - 1',
  topK: 3,
  rebalanceDays: 20,
  startDate: '2022-01-01',
  endDate: '2025-12-31',
  buyFee: 0.0015,
  sellFee: 0.005,
  initialCash: 100_000,
};

export function Strategy() {
  const nav = useNavigate();
  const { strategies, runs, load, save } = useStrategy();
  const { items: watchItems, load: loadWatch } = useWatchlist();

  const [form, setForm] = useState<Omit<StrategyDef, 'id' | 'universe'>>(DEFAULT_STRATEGY);
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());
  const [parseErr, setParseErr] = useState<string | null>(null);

  useEffect(() => { load(); loadWatch(); }, [load, loadWatch]);
  useEffect(() => {
    // 默认把自选全选为池
    if (watchItems.length > 0 && selectedCodes.size === 0) {
      setSelectedCodes(new Set(watchItems.map((w) => w.code)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchItems.length]);

  const exprOk = useMemo(() => {
    try { parse(form.expr); setParseErr(null); return true; }
    catch (e) { setParseErr((e as Error).message); return false; }
  }, [form.expr]);

  function toggleCode(code: string) {
    const next = new Set(selectedCodes);
    if (next.has(code)) next.delete(code); else next.add(code);
    setSelectedCodes(next);
  }

  async function onRun() {
    if (!exprOk) return;
    if (selectedCodes.size < 2) { alert('至少选择 2 只基金作为策略池'); return; }
    const strat: StrategyDef = {
      ...form,
      id: crypto.randomUUID(),
      universe: Array.from(selectedCodes),
    };
    await save(strat);
    nav(`/backtest/${strat.id}`);
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-lg font-semibold">策略回测</h1>

      <div className="card space-y-3">
        <div>
          <label className="text-xs text-slate-400">策略名称</label>
          <input
            className="input mt-1"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>

        <div>
          <label className="text-xs text-slate-400">因子表达式（Qlib 风格）</label>
          <textarea
            className="input mt-1 font-mono text-sm"
            rows={2}
            value={form.expr}
            onChange={(e) => setForm({ ...form, expr: e.target.value })}
          />
          {parseErr && <div className="text-xs text-red-400 mt-1">{parseErr}</div>}
        </div>

        <div>
          <label className="text-xs text-slate-400">预置因子（点击填入）</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {FACTORS.map((f) => (
              <button
                key={f.name}
                className="btn-ghost text-xs"
                onClick={() => setForm((s) => ({ ...s, expr: f.expr, name: f.name }))}
              >
                {f.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Num label="Top-K" value={form.topK} onChange={(v) => setForm({ ...form, topK: v })} />
          <Num label="调仓间隔（日）" value={form.rebalanceDays} onChange={(v) => setForm({ ...form, rebalanceDays: v })} />
          <Num label="申购费率" value={form.buyFee} step={0.0001} onChange={(v) => setForm({ ...form, buyFee: v })} />
          <Num label="赎回费率" value={form.sellFee} step={0.0001} onChange={(v) => setForm({ ...form, sellFee: v })} />
          <div>
            <label className="text-xs text-slate-400">起始日</label>
            <input type="date" className="input mt-1" value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-slate-400">结束日</label>
            <input type="date" className="input mt-1" value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
          </div>
          <Num label="初始资金" value={form.initialCash} step={1000} onChange={(v) => setForm({ ...form, initialCash: v })} />
        </div>
      </div>

      <div className="card">
        <div className="text-sm font-medium mb-2">基金池（从自选中选择）</div>
        {watchItems.length === 0 ? (
          <div className="text-xs text-slate-400">请先到"行情"添加自选基金</div>
        ) : (
          <div className="space-y-1">
            {watchItems.map((w) => (
              <label key={w.code} className="flex items-center gap-2 py-1 text-sm">
                <input
                  type="checkbox"
                  checked={selectedCodes.has(w.code)}
                  onChange={() => toggleCode(w.code)}
                />
                <span className="flex-1 truncate">{w.name}</span>
                <span className="text-xs text-slate-500">{w.code}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      <button className="btn w-full" disabled={!exprOk || selectedCodes.size < 2} onClick={onRun}>
        运行回测
      </button>

      {runs.length > 0 && (
        <div className="card">
          <div className="text-sm font-medium mb-2">最近回测</div>
          <div className="space-y-1">
            {runs.slice(0, 10).map((r) => (
              <button
                key={r.id}
                className="w-full text-left py-2 border-b border-slate-700/50 last:border-0"
                onClick={() => nav(`/report/${r.id}`)}
              >
                <div className="flex justify-between">
                  <span className="text-sm truncate">{r.strategyName}</span>
                  <span className={`text-xs ${r.metrics.totalReturn >= 0 ? 'text-up' : 'text-down'}`}>
                    {(r.metrics.totalReturn * 100).toFixed(2)}%
                  </span>
                </div>
                <div className="text-xs text-slate-500">{new Date(r.ranAt).toLocaleString('zh-CN')}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <DataBackup />

      {strategies.length === 0 && (
        <div className="text-xs text-slate-500 text-center">
          已保存策略数：{strategies.length}
        </div>
      )}
    </div>
  );
}

function Num(props: { label: string; value: number; step?: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="text-xs text-slate-400">{props.label}</label>
      <input
        type="number"
        step={props.step ?? 1}
        className="input mt-1"
        value={props.value}
        onChange={(e) => props.onChange(Number(e.target.value))}
      />
    </div>
  );
}

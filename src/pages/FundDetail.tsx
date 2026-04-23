import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchProfile, fetchRealtime } from '../data/remote/eastmoney';
import { loadProfile, saveProfile } from '../data/local/dexie';
import { useWatchlist } from '../store/watchlist';
import { NavChart } from '../components/NavChart';
import type { FundProfile, FundRealtime } from '../data/types';

export function FundDetail() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<FundProfile | null>(null);
  const [realtime, setRealtime] = useState<FundRealtime | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const { items, add, remove, load } = useWatchlist();

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!code) return;
    (async () => {
      try {
        const cached = await loadProfile(code);
        if (cached && Date.now() - cached.fetchedAt < 24 * 3600 * 1000) {
          setProfile(cached);
        } else {
          const fresh = await fetchProfile(code);
          setProfile(fresh);
          await saveProfile(fresh);
        }
        const rt = await fetchRealtime(code);
        setRealtime(rt);
      } catch (e) {
        setErr((e as Error).message);
      }
    })();
  }, [code]);

  if (!code) return null;
  const isWatched = items.some((i) => i.code === code);

  return (
    <div className="p-4 space-y-3">
      <button onClick={() => navigate(-1)} className="text-xs text-sky-400">‹ 返回</button>
      {err && <div className="card text-sm text-red-400">{err}</div>}
      {!profile && !err && <div className="text-sm text-slate-400">加载中…</div>}

      {profile && (
        <>
          <div className="card">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <div className="text-base font-medium truncate">{profile.name}</div>
                <div className="text-xs text-slate-400 mt-1">
                  {code} {profile.manager ? `· 基金经理 ${profile.manager}` : ''}
                </div>
              </div>
              <button
                className="btn"
                onClick={() =>
                  isWatched ? remove(code) : add(code, profile.name)
                }
              >
                {isWatched ? '已自选' : '加自选'}
              </button>
            </div>
          </div>

          {realtime && (
            <div className="card">
              <div className="text-xs text-slate-400">估算 · {realtime.estDate}</div>
              <div className="flex items-baseline gap-3 mt-1">
                <span className={`text-2xl font-semibold ${realtime.estPct >= 0 ? 'text-up' : 'text-down'}`}>
                  {realtime.est.toFixed(4)}
                </span>
                <span className={realtime.estPct >= 0 ? 'text-up' : 'text-down'}>
                  {realtime.estPct >= 0 ? '+' : ''}{realtime.estPct.toFixed(2)}%
                </span>
              </div>
              <div className="text-xs text-slate-400 mt-2">
                单位净值 {realtime.nav.toFixed(4)} · {realtime.navDate}
              </div>
            </div>
          )}

          <div className="card">
            <div className="text-sm font-medium mb-2">历史净值（{profile.nav.length} 个交易日）</div>
            <NavChart
              dates={profile.nav.map((p) => p.date)}
              series={[
                { name: '单位净值', data: profile.nav.map((p) => p.nav) },
                { name: '累计净值', data: profile.nav.map((p) => p.accNav) },
              ]}
              height={280}
            />
          </div>
        </>
      )}
    </div>
  );
}

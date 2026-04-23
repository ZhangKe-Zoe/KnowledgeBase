import type { FundMeta, FundRealtime, NavPoint, FundProfile } from '../types';

// --- JSONP / script-tag injection helpers ------------------------------
// iOS Safari blocks cross-origin fetch() for fund.eastmoney.com. We load
// these resources via <script> tags (bypassing CORS), then read the
// globals they assign to window.

// Load a raw JS file as text via fetch. Only works when CORS allows.
// For eastmoney pingzhongdata we rely on a Service Worker proxy (see
// vite.config workbox runtimeCaching) or a user-side CORS proxy in dev.
// Fallback: inject <script> and read assigned vars from window.
async function loadScriptVars(url: string, varNames: string[], timeout = 10_000): Promise<Record<string, unknown>> {
  // Try fetch first (works in some dev setups / via PWA SW). If CORS blocks,
  // fall back to script-tag injection reading globals off window.
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeout);
    const res = await fetch(url, { signal: ctrl.signal, mode: 'cors' });
    clearTimeout(t);
    if (res.ok) {
      const text = await res.text();
      return parseVars(text, varNames);
    }
  } catch {
    // fall through to script injection
  }
  return scriptTagVars(url, varNames, timeout);
}

// Parse `var Name = ...;` blocks from text — no eval, use regex + JSON.parse.
function parseVars(src: string, names: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const name of names) {
    const re = new RegExp(`var\\s+${name}\\s*=\\s*(\\[[\\s\\S]*?\\]|\\{[\\s\\S]*?\\}|"[^"]*"|\\d+(?:\\.\\d+)?);`);
    const m = src.match(re);
    if (!m) continue;
    try {
      out[name] = JSON.parse(m[1]);
    } catch {
      // Some fields may be non-strict JSON (e.g. single quotes). Skip.
    }
  }
  return out;
}

// Fallback: inject script, read globals. NOTE: this relies on the
// remote script assigning to window (which pingzhongdata does).
function scriptTagVars(url: string, names: string[], timeout: number): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const timer = window.setTimeout(() => {
      script.remove();
      reject(new Error(`script timeout: ${url}`));
    }, timeout);
    script.src = url;
    script.onload = () => {
      window.clearTimeout(timer);
      const out: Record<string, unknown> = {};
      const w = window as unknown as Record<string, unknown>;
      for (const name of names) if (name in w) out[name] = w[name];
      script.remove();
      resolve(out);
    };
    script.onerror = () => {
      window.clearTimeout(timer);
      script.remove();
      reject(new Error(`script error: ${url}`));
    };
    document.head.appendChild(script);
  });
}

// --- public API --------------------------------------------------------

// 实时估值（交易日内约每分钟更新一次）
export async function fetchRealtime(code: string): Promise<FundRealtime> {
  const url = `https://fundgz.1234567.com.cn/js/${code}.js?rt=${Date.now()}`;
  // fundgz uses a fixed callback name "jsonpgz". We install a one-shot.
  const data = await new Promise<Record<string, string>>((resolve, reject) => {
    const script = document.createElement('script');
    const timer = window.setTimeout(() => {
      delete window.jsonpgz;
      script.remove();
      reject(new Error('realtime timeout'));
    }, 10_000);
    window.jsonpgz = (obj: unknown) => {
      window.clearTimeout(timer);
      delete window.jsonpgz;
      script.remove();
      resolve(obj as Record<string, string>);
    };
    script.src = url;
    script.onerror = () => {
      window.clearTimeout(timer);
      delete window.jsonpgz;
      script.remove();
      reject(new Error('realtime script error'));
    };
    document.head.appendChild(script);
  });

  return {
    code: data.fundcode ?? code,
    name: data.name ?? '',
    navDate: data.jzrq ?? '',
    nav: Number(data.dwjz ?? 0),
    estDate: data.gztime ?? '',
    est: Number(data.gsz ?? 0),
    estPct: Number(data.gszzl ?? 0),
    fetchedAt: Date.now(),
  };
}

// 历史净值 + 基金画像
export async function fetchProfile(code: string): Promise<FundProfile> {
  const url = `https://fund.eastmoney.com/pingzhongdata/${code}.js?v=${Date.now()}`;
  const vars = await loadScriptVars(url, [
    'fS_name',
    'fS_code',
    'Data_netWorthTrend',
    'Data_ACWorthTrend',
    'Data_fundManagers',
  ]);

  const netTrend = (vars.Data_netWorthTrend as Array<{ x: number; y: number; equityReturn: number }>) ?? [];
  const accTrend = (vars.Data_ACWorthTrend as Array<[number, number]>) ?? [];
  const accMap = new Map<string, number>();
  for (const [x, y] of accTrend) accMap.set(new Date(x).toISOString().slice(0, 10), y);

  const nav: NavPoint[] = netTrend.map((p) => {
    const date = new Date(p.x).toISOString().slice(0, 10);
    return {
      date,
      nav: p.y,
      accNav: accMap.get(date) ?? p.y,
      pct: p.equityReturn ?? 0,
    };
  });

  const managers = vars.Data_fundManagers as Array<{ name: string }> | undefined;

  return {
    code: (vars.fS_code as string) ?? code,
    name: (vars.fS_name as string) ?? '',
    manager: managers?.[0]?.name,
    nav,
    fetchedAt: Date.now(),
  };
}

// 基金列表（~1.5MB，缓存 7 天）
let _fundList: FundMeta[] | null = null;
export async function fetchFundList(): Promise<FundMeta[]> {
  if (_fundList) return _fundList;
  const url = 'https://fund.eastmoney.com/js/fundcode_search.js';
  const vars = await loadScriptVars(url, ['r']);
  const raw = (vars.r as Array<[string, string, string, string, string]>) ?? [];
  _fundList = raw.map((row) => ({
    code: row[0],
    pinyin: row[1],
    name: row[2],
    type: row[3],
    pinyinFull: row[4],
  }));
  return _fundList;
}

export function searchFunds(list: FundMeta[], query: string, limit = 30): FundMeta[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const out: FundMeta[] = [];
  for (const f of list) {
    if (
      f.code.startsWith(q) ||
      f.name.toLowerCase().includes(q) ||
      f.pinyin.toLowerCase().includes(q) ||
      f.pinyinFull.toLowerCase().includes(q)
    ) {
      out.push(f);
      if (out.length >= limit) break;
    }
  }
  return out;
}


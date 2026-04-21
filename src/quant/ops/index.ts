// 时序算子与元素算子。输入输出均为 Float64Array，NaN 表示缺失。
// 所有窗口算子采用 "trailing window"：out[t] 用 x[t-N+1 .. t]。

const NaNfloat = Number.NaN;

export function ref(x: Float64Array, n: number): Float64Array {
  const out = new Float64Array(x.length);
  for (let i = 0; i < x.length; i++) out[i] = i - n >= 0 ? x[i - n] : NaNfloat;
  return out;
}

export function delta(x: Float64Array, n: number): Float64Array {
  const out = new Float64Array(x.length);
  for (let i = 0; i < x.length; i++) out[i] = i - n >= 0 ? x[i] - x[i - n] : NaNfloat;
  return out;
}

export function mean(x: Float64Array, n: number): Float64Array {
  const out = new Float64Array(x.length);
  let sum = 0, cnt = 0;
  const buf: number[] = [];
  for (let i = 0; i < x.length; i++) {
    const v = x[i];
    if (Number.isFinite(v)) { sum += v; cnt++; }
    buf.push(v);
    if (buf.length > n) {
      const old = buf.shift()!;
      if (Number.isFinite(old)) { sum -= old; cnt--; }
    }
    out[i] = buf.length === n && cnt > 0 ? sum / cnt : NaNfloat;
  }
  return out;
}

export function sum(x: Float64Array, n: number): Float64Array {
  const out = new Float64Array(x.length);
  let acc = 0;
  const buf: number[] = [];
  for (let i = 0; i < x.length; i++) {
    const v = x[i];
    if (Number.isFinite(v)) acc += v;
    buf.push(v);
    if (buf.length > n) {
      const old = buf.shift()!;
      if (Number.isFinite(old)) acc -= old;
    }
    out[i] = buf.length === n ? acc : NaNfloat;
  }
  return out;
}

export function std(x: Float64Array, n: number): Float64Array {
  const out = new Float64Array(x.length);
  const buf: number[] = [];
  for (let i = 0; i < x.length; i++) {
    buf.push(x[i]);
    if (buf.length > n) buf.shift();
    if (buf.length === n) {
      let m = 0, cnt = 0;
      for (const v of buf) if (Number.isFinite(v)) { m += v; cnt++; }
      if (cnt < 2) { out[i] = NaNfloat; continue; }
      m /= cnt;
      let s = 0;
      for (const v of buf) if (Number.isFinite(v)) s += (v - m) ** 2;
      out[i] = Math.sqrt(s / (cnt - 1));
    } else out[i] = NaNfloat;
  }
  return out;
}

export function rollingReduce(
  x: Float64Array,
  n: number,
  reducer: (arr: number[]) => number,
): Float64Array {
  const out = new Float64Array(x.length);
  const buf: number[] = [];
  for (let i = 0; i < x.length; i++) {
    buf.push(x[i]);
    if (buf.length > n) buf.shift();
    out[i] = buf.length === n ? reducer(buf) : NaNfloat;
  }
  return out;
}

export function rollingMax(x: Float64Array, n: number): Float64Array {
  return rollingReduce(x, n, (a) => {
    let m = -Infinity;
    for (const v of a) if (Number.isFinite(v) && v > m) m = v;
    return m === -Infinity ? NaNfloat : m;
  });
}

export function rollingMin(x: Float64Array, n: number): Float64Array {
  return rollingReduce(x, n, (a) => {
    let m = Infinity;
    for (const v of a) if (Number.isFinite(v) && v < m) m = v;
    return m === Infinity ? NaNfloat : m;
  });
}

// --- element-wise -------------------------------------------------------
export function elemwise(x: Float64Array, f: (v: number) => number): Float64Array {
  const out = new Float64Array(x.length);
  for (let i = 0; i < x.length; i++) out[i] = Number.isFinite(x[i]) ? f(x[i]) : NaNfloat;
  return out;
}

export function ewAbs(x: Float64Array) { return elemwise(x, Math.abs); }
export function ewLog(x: Float64Array) { return elemwise(x, Math.log); }
export function ewSign(x: Float64Array) { return elemwise(x, Math.sign); }

export function binop(a: Float64Array, b: Float64Array, f: (x: number, y: number) => number): Float64Array {
  const n = Math.max(a.length, b.length);
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const x = a[i], y = b[i];
    out[i] = Number.isFinite(x) && Number.isFinite(y) ? f(x, y) : NaNfloat;
  }
  return out;
}

export function ifSelect(cond: Float64Array, a: Float64Array, b: Float64Array): Float64Array {
  const out = new Float64Array(cond.length);
  for (let i = 0; i < cond.length; i++) {
    const c = cond[i];
    out[i] = Number.isFinite(c)
      ? c !== 0
        ? a[i]
        : b[i]
      : NaNfloat;
  }
  return out;
}

// Correlation over rolling window
export function corr(x: Float64Array, y: Float64Array, n: number): Float64Array {
  const out = new Float64Array(x.length);
  for (let i = 0; i < x.length; i++) {
    if (i < n - 1) { out[i] = NaNfloat; continue; }
    let sx = 0, sy = 0, sxy = 0, sxx = 0, syy = 0, cnt = 0;
    for (let k = i - n + 1; k <= i; k++) {
      const a = x[k], b = y[k];
      if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
      sx += a; sy += b; sxy += a * b; sxx += a * a; syy += b * b; cnt++;
    }
    if (cnt < 2) { out[i] = NaNfloat; continue; }
    const mx = sx / cnt, my = sy / cnt;
    const cov = sxy / cnt - mx * my;
    const varx = sxx / cnt - mx * mx;
    const vary = syy / cnt - my * my;
    out[i] = varx > 0 && vary > 0 ? cov / Math.sqrt(varx * vary) : NaNfloat;
  }
  return out;
}

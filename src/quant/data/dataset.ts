import type { FundProfile, NavPoint } from '../../data/types';

// Dataset: 对齐多只基金的时间轴，按字段给出列式 Float64Array。
// 类比 Qlib 的 D.features(universe, fields, start, end)。

export interface AlignedData {
  dates: string[];                          // 升序交易日列表
  codes: string[];                          // 基金代码
  fields: Record<string, Float64Array[]>;   // fieldName -> [ per-code Float64Array(dates.length) ]
}

// 字段取值器
export type FieldExtractor = (p: NavPoint) => number;

export const FIELDS: Record<string, FieldExtractor> = {
  nav: (p) => p.nav,
  acc_nav: (p) => p.accNav,
  return: (p) => p.pct / 100,  // 转小数
};

export function buildDataset(
  profiles: FundProfile[],
  fields: string[],
  startDate?: string,
  endDate?: string,
): AlignedData {
  // 1. 收集所有日期
  const dateSet = new Set<string>();
  for (const p of profiles) {
    for (const pt of p.nav) {
      if (startDate && pt.date < startDate) continue;
      if (endDate && pt.date > endDate) continue;
      dateSet.add(pt.date);
    }
  }
  const dates = Array.from(dateSet).sort();
  const dateIdx = new Map<string, number>();
  dates.forEach((d, i) => dateIdx.set(d, i));

  // 2. 按字段列式填充
  const out: AlignedData = { dates, codes: profiles.map((p) => p.code), fields: {} };
  for (const f of fields) {
    const extractor = FIELDS[f];
    if (!extractor) throw new Error(`Unknown field: $${f}`);
    const cols: Float64Array[] = [];
    for (const p of profiles) {
      const arr = new Float64Array(dates.length).fill(Number.NaN);
      for (const pt of p.nav) {
        const idx = dateIdx.get(pt.date);
        if (idx !== undefined) arr[idx] = extractor(pt);
      }
      cols.push(arr);
    }
    out.fields[f] = cols;
  }
  return out;
}

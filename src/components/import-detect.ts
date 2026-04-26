import type { FundMeta } from '../data/types';

// 截图识别的纯逻辑层 — 与 React 组件解耦，可被单测覆盖。
//
// 输入：tesseract.js 出来的整段中文文本 + 本地 fundList。
// 输出：检测到的基金（含来源 = 代码/名称匹配 + 估算的持有金额）。

export interface Detected {
  code: string;
  name: string;
  type: string;
  amount?: number;
  matchedBy: 'code' | 'name';
}

// 在锚点位置之后的 200 字符里，找第一个看起来像「持有金额」的数字。
// 触发模式：
//   9,241.68  / 5,229.02  （有千分位逗号）
//   3030.39   / 13581.22  （3-7 位整数 + 两位小数，无逗号）
// 排除：
//   8.14%（占比，2 位以内整数）
//   +457.07 / -2.59%（涨跌，匹配但被金额范围 [100, 1e7) 卡住时再做兜底）
//
// 注意：当截图布局是「持有金额 | 日收益 | 持有收益 | 累计收益」横向并列时，
// 第一个匹配通常就是持有金额，因为它最先出现在文本流里。
export function extractAmount(text: string, fromIdx: number): number | undefined {
  const window = text.substring(fromIdx, fromIdx + 200);
  const re = /(\d{1,3}(?:,\d{3})+\.\d{2}|\d{3,7}\.\d{2})/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(window)) !== null) {
    const v = parseFloat(m[1].replace(/,/g, ''));
    if (v >= 100 && v < 1e7) return v;
  }
  return undefined;
}

// 把 OCR 文本里的基金名 / 代码匹配回 fundList。
// 1) 6 位代码精确匹配（最可靠）
// 2) 中文名子串匹配（按名字长度倒序，避免短名误匹配）
//
// 投顾 / 组合产品（如「百分百进攻」「全球精选 70」）不在 fundcode_search 里，
// 会被自然跳过 — 它们没有 6 位天天基金代码。
export function detectFunds(text: string, fundList: FundMeta[]): Detected[] {
  const found = new Map<string, Detected>();
  const byCode = new Map<string, FundMeta>();
  for (const f of fundList) byCode.set(f.code, f);

  // 1) 代码匹配
  const codeRe = /\b\d{6}\b/g;
  let m: RegExpExecArray | null;
  while ((m = codeRe.exec(text)) !== null) {
    const f = byCode.get(m[0]);
    if (f && !found.has(f.code)) {
      found.set(f.code, {
        code: f.code,
        name: f.name,
        type: f.type,
        amount: extractAmount(text, m.index + 6),
        matchedBy: 'code',
      });
    }
  }

  // 2) 名称子串匹配
  const sorted = [...fundList]
    .filter((f) => f.name.length >= 5)
    .sort((a, b) => b.name.length - a.name.length);
  for (const f of sorted) {
    if (found.has(f.code)) continue;
    const idx = text.indexOf(f.name);
    if (idx >= 0) {
      found.set(f.code, {
        code: f.code,
        name: f.name,
        type: f.type,
        amount: extractAmount(text, idx + f.name.length),
        matchedBy: 'name',
      });
    }
  }

  return Array.from(found.values());
}

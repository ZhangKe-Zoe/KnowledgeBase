import type { FundMeta } from '../data/types';

// 截图识别的纯逻辑层 — 与 React 组件解耦，便于单测。
//
// 输入：tesseract.js 出来的整段中文文本 + 本地 fundList。
// 输出：检测到的基金（含来源 = 代码/名称匹配 + 估算的持有金额）。
//
// 鲁棒性设计（针对真实 tesseract 输出的常见问题）：
//   - 空白容忍：tesseract 中文常在字之间插空格。比对时去掉两侧空白。
//   - 括号归一：全角 `（）` 与半角 `()` 都接受。
//   - 大小写归一：字母 ETF / etf / Etf 视作相同。
//
// 不做模糊 / 公共子串 / 编辑距离匹配 —— 那些会带来大量误识别（"华安黄金 ETF
// 联接 C" 与 "华安黄金易 ETF 联接 A" 的 LCS 长达 7 字）。如果用户截图的基金
// 名跟天天基金 fundcode_search 的名字差异过大，宁可漏也不冤报。

export interface Detected {
  code: string;
  name: string;
  type: string;
  amount?: number;
  matchedBy: 'code' | 'name' | 'fuzzy';
}

// 把字符串规范成「可比较」形式：去空白、统一括号、统一英文大小写。
export function normalize(s: string): string {
  return s
    .replace(/[\s　]+/g, '')
    .replace(/（/g, '(')
    .replace(/）/g, ')')
    .replace(/【/g, '[')
    .replace(/】/g, ']')
    .toLowerCase();
}

// 把原文规范化的同时记录每个 normalized 字符在原文里的索引。匹配后用这个
// 索引数组定位回原文，便于在锚点附近抓持仓金额。
function buildCleanWithMap(text: string): { clean: string; orig: number[] } {
  let clean = '';
  const orig: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (/[\s　]/.test(ch)) continue;
    let normalized = ch;
    if (ch === '（') normalized = '(';
    else if (ch === '）') normalized = ')';
    else if (ch === '【') normalized = '[';
    else if (ch === '】') normalized = ']';
    else if (ch >= 'A' && ch <= 'Z') normalized = ch.toLowerCase();
    clean += normalized;
    orig.push(i);
  }
  return { clean, orig };
}

// 在锚点位置之后的 200 字符里，找第一个看起来像「持有金额」的数字。
// 触发模式：
//   9,241.68  / 5,229.02  （有千分位逗号）
//   3030.39   / 13581.22  （3-7 位整数 + 两位小数，无逗号）
// 排除：
//   8.14%（占比，2 位以内整数）
//   净值 1.23
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

export function detectFunds(text: string, fundList: FundMeta[]): Detected[] {
  const found = new Map<string, Detected>();
  const byCode = new Map<string, FundMeta>();
  for (const f of fundList) byCode.set(f.code, f);

  const cleanText = buildCleanWithMap(text);

  // 1) 6 位代码精确匹配（最可靠）
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

  // 2) 名称匹配（按长度倒序，长名优先避免短名误命中）
  const sorted = [...fundList]
    .filter((f) => f.name.length >= 5)
    .sort((a, b) => b.name.length - a.name.length);

  for (const f of sorted) {
    if (found.has(f.code)) continue;

    // a) 原文精确子串
    let anchorOrig = text.indexOf(f.name);
    let matchedBy: Detected['matchedBy'] = 'name';

    // b) normalize 后再试：容忍空白、全/半角括号、大小写
    if (anchorOrig < 0) {
      const cleanName = normalize(f.name);
      if (cleanName.length >= 5) {
        const idx = cleanText.clean.indexOf(cleanName);
        if (idx >= 0) {
          // 锚点：归一化串里 name 末尾对应的原文位置 + 1
          const lastIdxInOrig = idx + cleanName.length - 1;
          anchorOrig = cleanText.orig[Math.min(lastIdxInOrig, cleanText.orig.length - 1)] + 1;
          matchedBy = 'fuzzy';
        }
      }
    }

    if (anchorOrig >= 0) {
      found.set(f.code, {
        code: f.code,
        name: f.name,
        type: f.type,
        amount: extractAmount(text, anchorOrig),
        matchedBy,
      });
    }
  }

  return Array.from(found.values());
}

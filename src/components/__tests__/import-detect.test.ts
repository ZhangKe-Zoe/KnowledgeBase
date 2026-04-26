import { describe, it, expect } from 'vitest';
import { detectFunds, extractAmount } from '../import-detect';
import type { FundMeta } from '../../data/types';

// 用户在 2026-04 提供的三张持仓截图，作为 OCR 识别功能的回归测试。
// 这里的 text 模拟 tesseract.js (chi_sim+eng) 对截图的输出 — 字符可能被
// 重排为「行 → 行」的扫描序，标签和数值同行或邻行出现。
//
// 关键测试目标：
//  1) 真实基金（有 6 位代码）能被基金名子串匹配出来
//  2) 持有金额能从锚点附近正确抓出
//  3) 投顾/组合产品（无 6 位代码，不在 fundList 里）被自然跳过
//  4) 累计收益、占比、涨跌幅等不会被误识为持仓金额

function fund(code: string, name: string, type = '混合'): FundMeta {
  return { code, name, type, pinyin: '', pinyinFull: '' };
}

// 仓库的 fundList 一般有 1 万+ 条；这里只放截图里出现的基金 + 几个干扰项。
const FUND_LIST: FundMeta[] = [
  // —— 截图里出现的真实基金（codes 是示意值，匹配按名字进行）——
  fund('002613', '博时黄金ETF联接C', 'QDII'),
  fund('050025', '博时标普500ETF联接A', 'QDII'),
  fund('217021', '招商中证银行指数A', '指数'),
  fund('000217', '华安黄金ETF联接C', '黄金'),
  fund('006285', '金鹰科技创新股票A', '股票'),
  fund('008888', '天弘中证电网设备主题指数C', '指数'),
  fund('009999', '华富天鑫灵活配置混合A', '混合'),
  fund('011102', '易方达黄金ETF联接C', '黄金'),
  fund('012345', '华安智能装备主题股票C', '股票'),
  fund('008857', '天弘中证人工智能主题指数A', '指数'),
  fund('013456', '华夏国证半导体芯片ETF联接C', '指数'),
  fund('163406', '兴全合润混合(LOF)A', '混合'),
  // —— 干扰项：易混名字 ——
  fund('007777', '华安黄金易ETF联接A', '黄金'),
  fund('123456', '招商中证消费指数A', '指数'),
];

describe('detectFunds — 资产明细截图（3 只）', () => {
  // 模拟 tesseract 对支付宝「资产明细」页面的 OCR 输出
  const ocrText = `
资产明细 筛选 按持有金额排序

博时黄金ETF联接C
持有金额    持仓收益    昨日收益
9,241.68    +2,959.68   0.00
行情解读 中东局势缓和，黄金震荡筑底或可低位布局 详情

博时标普500ETF联接A
持有金额    持仓收益    昨日收益
5,229.02    +1,344.03   0.00

招商中证银行指数A
持有金额    持仓收益    昨日收益
3,030.39    +368.72     0.00
`;

  const hits = detectFunds(ocrText, FUND_LIST);
  const byName = new Map(hits.map((h) => [h.name, h]));

  it('识别全部 3 只真实基金', () => {
    expect(hits.length).toBe(3);
    expect(byName.has('博时黄金ETF联接C')).toBe(true);
    expect(byName.has('博时标普500ETF联接A')).toBe(true);
    expect(byName.has('招商中证银行指数A')).toBe(true);
  });

  it('正确抓取持有金额（不被持仓收益/累计收益误导）', () => {
    expect(byName.get('博时黄金ETF联接C')?.amount).toBe(9241.68);
    expect(byName.get('博时标普500ETF联接A')?.amount).toBe(5229.02);
    expect(byName.get('招商中证银行指数A')?.amount).toBe(3030.39);
  });

  it('不会把"华安黄金易ETF联接A"误识为"博时黄金ETF联接C"', () => {
    expect(byName.has('华安黄金易ETF联接A')).toBe(false);
  });
});

describe('detectFunds — 持有列表截图（含投顾产品）', () => {
  const ocrText = `
全部 持有收益排序

百分百进攻
帮你投 投资增值 投顾
6,457.17    0.00    +457.07    +457.42
占比 8.14%  今日收益更新   +7.63%

全球精选70
帮你投 投资增值 投顾
2,913.64    0.00    +13.62    +13.64
占比 3.67%  今日收益更新   +0.47%

金鹰科技创新股票A
基金 投资增值 金选 超额收益
2,545.68    0.00    -67.74    -108.09
占比 3.21%        -2.59%

华安黄金ETF联接C
黄金 投资增值 定投
3,174.70    0.00    -153.46    +1,296.63
占比 4.00%  今日收益更新   -4.61%

天弘中证电网设备主题指数C
基金 投资增值
4,596.55    0.00    -157.95    -201.79
占比 5.79%        -3.71%

华富天鑫灵活配置混合A
基金 投资增值 定投
4,027.96    0.00    -318.71    -570.23
占比 5.08%        -8.29%
`;

  const hits = detectFunds(ocrText, FUND_LIST);
  const byName = new Map(hits.map((h) => [h.name, h]));

  it('识别 4 只真实基金（金鹰/华安黄金/天弘电网/华富天鑫），跳过 2 个投顾产品', () => {
    expect(hits.length).toBe(4);
    expect(byName.has('金鹰科技创新股票A')).toBe(true);
    expect(byName.has('华安黄金ETF联接C')).toBe(true);
    expect(byName.has('天弘中证电网设备主题指数C')).toBe(true);
    expect(byName.has('华富天鑫灵活配置混合A')).toBe(true);
  });

  it('正确抓取持有金额（避免"占比"百分比和涨跌点数）', () => {
    expect(byName.get('金鹰科技创新股票A')?.amount).toBe(2545.68);
    expect(byName.get('华安黄金ETF联接C')?.amount).toBe(3174.70);
    expect(byName.get('天弘中证电网设备主题指数C')?.amount).toBe(4596.55);
    expect(byName.get('华富天鑫灵活配置混合A')?.amount).toBe(4027.96);
  });
});

describe('detectFunds — AI / 黄金 / 半导体主题截图', () => {
  const ocrText = `
全部 持有收益排序

博时黄金ETF联接C
黄金 投资增值 定投
13,581.22   0.00    +4,163.39   +4,163.39
占比 17.11%  今日收益更新   +44.21%

易方达黄金ETF联接C
黄金 投资增值 定投
9,199.13    0.00    +2,526.65   +2,853.67
占比 11.59%  今日收益更新   +37.87%

华安智能装备主题股票C
基金 投资增值 定投
5,265.76    0.00    +2,125.96   +3,031.44
占比 6.64%        +67.71%

天弘中证人工智能主题指数A
基金 投资增值 定投 金选 指数基金
7,442.82    0.00    +1,824.63   +4,454.08
占比 9.38%        +35.65%

华夏国证半导体芯片ETF联接C
基金 投资增值 定投 金选 指数基金
7,593.39    0.00    +1,486.29   +3,006.85
占比 9.57%        +24.34%

兴全合润混合(LOF)A
基金 投资增值 定投 金选 超额收益
3,166.65    0.00    +729.89     +727.50
占比 3.99%        +29.95%

百分百进攻
帮你投 投资增值 投顾
`;

  const hits = detectFunds(ocrText, FUND_LIST);
  const byName = new Map(hits.map((h) => [h.name, h]));

  it('识别全部 6 只真实基金，跳过 投顾「百分百进攻」', () => {
    expect(hits.length).toBe(6);
    expect(byName.has('博时黄金ETF联接C')).toBe(true);
    expect(byName.has('易方达黄金ETF联接C')).toBe(true);
    expect(byName.has('华安智能装备主题股票C')).toBe(true);
    expect(byName.has('天弘中证人工智能主题指数A')).toBe(true);
    expect(byName.has('华夏国证半导体芯片ETF联接C')).toBe(true);
    expect(byName.has('兴全合润混合(LOF)A')).toBe(true);
  });

  it('万元级金额（含千分位）能正确解析', () => {
    expect(byName.get('博时黄金ETF联接C')?.amount).toBe(13581.22);
    expect(byName.get('天弘中证人工智能主题指数A')?.amount).toBe(7442.82);
    expect(byName.get('华夏国证半导体芯片ETF联接C')?.amount).toBe(7593.39);
  });

  it('matchedBy 正确（这里都是按名称匹配）', () => {
    for (const h of hits) {
      expect(h.matchedBy).toBe('name');
    }
  });
});

describe('detectFunds — 代码优先于名称匹配', () => {
  const ocrText = '163406 兴全合润混合(LOF)A 持有金额 3,166.65';
  const hits = detectFunds(ocrText, FUND_LIST);

  it('识别一只，按代码匹配', () => {
    expect(hits.length).toBe(1);
    expect(hits[0].code).toBe('163406');
    expect(hits[0].matchedBy).toBe('code');
    expect(hits[0].amount).toBe(3166.65);
  });
});

describe('extractAmount — 边界', () => {
  it('排除 8.14% 占比之类小数', () => {
    expect(extractAmount('占比 8.14% 今日收益更新', 0)).toBeUndefined();
  });

  it('排除 0.00（小于 100 元）', () => {
    expect(extractAmount('日收益 0.00 持有收益 +457.42', 0)).toBe(457.42);
  });

  it('优先匹配带千分位的金额', () => {
    expect(extractAmount('9,241.68 +2,959.68 0.00', 0)).toBe(9241.68);
  });

  it('无千分位时也能识别 4-5 位金额', () => {
    expect(extractAmount('5229.02 +1344.03 0.00', 0)).toBe(5229.02);
  });
});

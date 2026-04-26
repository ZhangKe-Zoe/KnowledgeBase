import type { FundProfile } from '../data/types';
import type { CuratedCategory } from '../data/curated';
import { totalReturn, sharpe as sharpeMetric, maxDrawdown } from './metrics';

// 从 curated 池基金的近期走势反推「市场风格」(regime)，
// 为「该买什么 / 该用什么策略」提供可观测的依据。
//
// 不依赖任何新闻数据 / LLM —— 完全用价格行为做信号。规则如下：
//
//   1) 算每个 CuratedCategory 的近 60 日均收益 + 均 Sharpe
//   2) 把"权益类"(A股宽基/A股行业/科技AI/主动管理) 的均收益 + Sharpe 当作大盘信号
//   3) 黄金 + 债券的相对强弱当作避险信号
//   4) 用阈值映射到 4 类 regime：
//        bull       股市强势 + Sharpe 健康 → 进攻动量
//        risk-off   股市跌而黄金涨 → 极度防守
//        bear       股市跌但黄金不强 → 一般防守
//        sideways   震荡 → 均值回归
//
// 这套规则的设计意图：让用户在熊市/避险阶段不要继续追动量，因为动量策略
// 在风格切换时会大幅亏损。

export type Regime = 'bull' | 'bear' | 'sideways' | 'risk-off';

export interface CategoryStat {
  category: CuratedCategory;
  meanReturn60d: number;       // 近 60 日均收益
  meanReturn20d: number;       // 近 20 日均收益（可看出最近一个月加速度）
  meanSharpe60d: number;
  meanMaxDD60d: number;
  fundCount: number;
}

export interface RegimeTemplate {
  name: string;
  expr: string;
  rebalanceDays: number;
  topK: number;
  desc: string;
  preferredCategories?: CuratedCategory[];
}

export interface RegimeAnalysis {
  regime: Regime;
  label: string;          // 进攻 / 均衡 / 防守 / 极度防守
  reasoning: string;      // 一段话解释为什么是这个 regime
  asOf: string;           // 数据截止日期
  categories: CategoryStat[];   // 按 60 日均收益降序
  template: RegimeTemplate;     // 推荐的策略模板
}

interface ProfileWithCategory extends FundProfile {
  category: CuratedCategory;
}

const TEMPLATES: Record<Regime, RegimeTemplate> = {
  bull: {
    name: '动量进攻',
    expr: '$nav / Ref($nav, 60) - 1',
    rebalanceDays: 20,
    topK: 5,
    desc: '市场偏强：买入近 60 日涨幅 Top 5，月度调仓',
  },
  bear: {
    name: '低波防御',
    expr: '-Std($nav, 20) / Mean($nav, 20)',
    rebalanceDays: 30,
    topK: 5,
    desc: '市场偏弱：买入波动率最低的 Top 5（偏债券 / 红利 / 黄金）',
    preferredCategories: ['债券', '黄金', '红利价值'],
  },
  sideways: {
    name: '均值回归',
    expr: '-($nav - Mean($nav, 20)) / Std($nav, 20)',
    rebalanceDays: 10,
    topK: 5,
    desc: '震荡市：买入 20 日 Z-score 最低的 Top 5（短期超跌反弹）',
  },
  'risk-off': {
    name: '极度防守',
    expr: '$nav / Ref($nav, 20) - 1',
    rebalanceDays: 30,
    topK: 3,
    desc: '股市下跌叠加避险情绪：仅留黄金 / 债券里近期表现最强的 3 只',
    preferredCategories: ['债券', '黄金'],
  },
};

export const REGIME_LABEL: Record<Regime, string> = {
  bull: '进攻',
  bear: '防守',
  sideways: '均衡',
  'risk-off': '极度防守',
};

export function detectRegime(profiles: ProfileWithCategory[]): RegimeAnalysis {
  const byCat = new Map<CuratedCategory, ProfileWithCategory[]>();
  for (const p of profiles) {
    if (!byCat.has(p.category)) byCat.set(p.category, []);
    byCat.get(p.category)!.push(p);
  }

  const categories: CategoryStat[] = [];
  for (const [cat, group] of byCat) {
    const stats = group
      .map((p) => {
        const tail60 = p.nav.slice(-60).map((x) => x.nav);
        const tail20 = p.nav.slice(-20).map((x) => x.nav);
        if (tail60.length < 30) return null;
        return {
          ret60: totalReturn(tail60),
          ret20: totalReturn(tail20),
          sh60: sharpeMetric(tail60),
          dd60: maxDrawdown(tail60),
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    if (stats.length === 0) continue;
    const n = stats.length;
    categories.push({
      category: cat,
      meanReturn60d: stats.reduce((s, x) => s + x.ret60, 0) / n,
      meanReturn20d: stats.reduce((s, x) => s + x.ret20, 0) / n,
      meanSharpe60d: stats.reduce((s, x) => s + x.sh60, 0) / n,
      meanMaxDD60d: stats.reduce((s, x) => s + x.dd60, 0) / n,
      fundCount: n,
    });
  }

  // 权益类大盘信号
  const equityCats = categories.filter((c) =>
    (['A股宽基', 'A股行业', '科技AI', '主动管理'] as CuratedCategory[]).includes(c.category),
  );
  const equityRet = equityCats.length > 0
    ? equityCats.reduce((s, c) => s + c.meanReturn60d, 0) / equityCats.length
    : 0;
  const equitySh = equityCats.length > 0
    ? equityCats.reduce((s, c) => s + c.meanSharpe60d, 0) / equityCats.length
    : 0;

  const goldRet = categories.find((c) => c.category === '黄金')?.meanReturn60d ?? 0;

  let regime: Regime;
  let reasoning: string;

  if (equityRet > 0.05 && equitySh > 0.5) {
    regime = 'bull';
    reasoning = `权益类近 60 日平均上涨 ${pct(equityRet)}，Sharpe ${equitySh.toFixed(2)}，趋势仍在。`;
  } else if (equityRet < -0.05 && goldRet > 0.05) {
    regime = 'risk-off';
    reasoning = `权益类下跌 ${pct(equityRet)} 同时黄金上涨 ${pct(goldRet)}，资金避险信号明显。`;
  } else if (equityRet < -0.03) {
    regime = 'bear';
    reasoning = `权益类近 60 日平均下跌 ${pct(equityRet)}，建议降低风险敞口。`;
  } else {
    regime = 'sideways';
    reasoning = `权益类近 60 日平均收益 ${pct(equityRet)}，方向不明，适合做超跌反弹。`;
  }

  let asOf = '';
  for (const p of profiles) {
    const last = p.nav[p.nav.length - 1]?.date;
    if (last && last > asOf) asOf = last;
  }

  categories.sort((a, b) => b.meanReturn60d - a.meanReturn60d);

  return {
    regime,
    label: REGIME_LABEL[regime],
    reasoning,
    asOf,
    categories,
    template: TEMPLATES[regime],
  };
}

function pct(v: number): string {
  return `${v >= 0 ? '+' : ''}${(v * 100).toFixed(1)}%`;
}

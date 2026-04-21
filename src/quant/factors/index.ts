// Qlib 风格预置因子（可直接当策略表达式）

export const FACTORS: Array<{ name: string; expr: string; desc: string }> = [
  { name: '20 日动量', expr: '$nav / Ref($nav, 20) - 1', desc: '近 20 个交易日收益率，做多高动量基金' },
  { name: '60 日动量', expr: '$nav / Ref($nav, 60) - 1', desc: '中期动量，季度级别趋势' },
  { name: '均值回归(20)', expr: '-($nav - Mean($nav, 20)) / Std($nav, 20)', desc: 'Z-score 取反，低估值买入' },
  { name: '双均线差 5/20', expr: 'Mean($nav, 5) - Mean($nav, 20)', desc: '短均线高于长均线看多' },
  { name: '5 日波动率', expr: 'Std($nav, 5) / Mean($nav, 5)', desc: '相对波动率，反向做空高波动' },
  { name: '近期最大回撤', expr: '$nav / Max($nav, 60) - 1', desc: '相对 60 日最高点的回撤幅度' },
];

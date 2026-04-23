// 基金基础信息（来自 fundcode_search）
export interface FundMeta {
  code: string;       // 基金代码 6 位
  pinyin: string;     // 简拼
  name: string;       // 中文名
  type: string;       // 混合型 / 股票型 / 债券型 / 指数型 / ETF
  pinyinFull: string;
}

// 实时估值（来自 fundgz）
export interface FundRealtime {
  code: string;
  name: string;
  navDate: string;     // 单位净值日期 YYYY-MM-DD
  nav: number;         // 单位净值
  estDate: string;     // 估值时间 YYYY-MM-DD HH:mm
  est: number;         // 估算净值
  estPct: number;      // 估算涨跌幅 %
  fetchedAt: number;
}

// 单条历史净值（来自 pingzhongdata）
export interface NavPoint {
  date: string;        // YYYY-MM-DD
  nav: number;         // 单位净值
  accNav: number;      // 累计净值
  pct: number;         // 当日收益率 %
}

// 基金历史 + 基本画像
export interface FundProfile {
  code: string;
  name: string;
  type?: string;
  manager?: string;
  nav: NavPoint[];      // 按时间升序
  fetchedAt: number;
}

export interface WatchlistItem {
  code: string;
  name: string;
  addedAt: number;
}

export interface StrategyDef {
  id: string;
  name: string;
  expr: string;            // Qlib 风格因子表达式, e.g. $nav / Ref($nav, 20) - 1
  universe: string[];      // 基金代码池
  topK: number;            // 选前 K 名
  rebalanceDays: number;   // 调仓频率（交易日）
  startDate: string;
  endDate: string;
  buyFee: number;          // 申购费
  sellFee: number;         // 赎回费
  initialCash: number;
}

export interface BacktestRun {
  id: string;
  strategyId: string;
  strategyName: string;
  ranAt: number;
  equity: Array<{ date: string; value: number }>;
  metrics: {
    annualReturn: number;
    sharpe: number;
    maxDrawdown: number;
    calmar: number;
    winRate: number;
    totalReturn: number;
  };
  trades: number;
}

import { applyBuy, applySell, type CostModel } from './costs';

// 简单组合：记录每只基金的份额，现金账户，估值
export class Portfolio {
  cash: number;
  holdings = new Map<string, number>(); // code -> units
  private costModel: CostModel;

  constructor(initialCash: number, costModel: CostModel) {
    this.cash = initialCash;
    this.costModel = costModel;
  }

  value(navByCode: Map<string, number>): number {
    let v = this.cash;
    for (const [code, units] of this.holdings) {
      const nav = navByCode.get(code);
      if (nav !== undefined && Number.isFinite(nav)) v += units * nav;
    }
    return v;
  }

  // 目标权重调仓：targetWeights 的 key 是保留/买入的基金代码；未出现的卖出
  rebalance(targetWeights: Map<string, number>, navByCode: Map<string, number>): number {
    const totalValue = this.value(navByCode);
    let trades = 0;

    // 1. 卖出不在目标中的仓位
    for (const [code, units] of Array.from(this.holdings)) {
      if (!targetWeights.has(code)) {
        const nav = navByCode.get(code);
        if (nav && Number.isFinite(nav)) {
          this.cash += applySell(units, nav, this.costModel);
          this.holdings.delete(code);
          trades++;
        }
      }
    }

    // 2. 重估总值 + 计算目标金额
    for (const [code, w] of targetWeights) {
      const nav = navByCode.get(code);
      if (!nav || !Number.isFinite(nav)) continue;
      const targetValue = totalValue * w;
      const currentUnits = this.holdings.get(code) ?? 0;
      const currentValue = currentUnits * nav;
      const delta = targetValue - currentValue;

      if (delta > 1) {
        const { units, cashUsed } = applyBuy(this.cash, delta, nav, this.costModel);
        if (units > 0) {
          this.cash -= cashUsed;
          this.holdings.set(code, currentUnits + units);
          trades++;
        }
      } else if (delta < -1) {
        const sellUnits = Math.min(currentUnits, -delta / nav);
        if (sellUnits > 0) {
          this.cash += applySell(sellUnits, nav, this.costModel);
          const remaining = currentUnits - sellUnits;
          if (remaining < 1e-9) this.holdings.delete(code);
          else this.holdings.set(code, remaining);
          trades++;
        }
      }
    }
    return trades;
  }
}

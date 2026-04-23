// 交易成本模型：申购费 / 赎回费（按百分比）

export interface CostModel {
  buyFee: number;   // 买入费率，如 0.0015
  sellFee: number;  // 卖出费率，如 0.005
}

export function applyBuy(cash: number, targetValue: number, navPerUnit: number, model: CostModel): { units: number; cashUsed: number } {
  // 能买到的最大市值 = targetValue / (1 + buyFee)
  const grossValue = Math.min(cash, targetValue * (1 + model.buyFee));
  const valueAfterFee = grossValue / (1 + model.buyFee);
  const units = valueAfterFee / navPerUnit;
  return { units, cashUsed: grossValue };
}

export function applySell(units: number, navPerUnit: number, model: CostModel): number {
  const gross = units * navPerUnit;
  return gross * (1 - model.sellFee);
}

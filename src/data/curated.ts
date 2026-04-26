// 内置「主流基金池」用于推荐和持仓诊断。
// 选取标准：覆盖主要资产类别 / 行业 / 市场，规模较大、流动性较好的 ETF 联接、
// 指数基金或老牌主动基金。代码均为天天基金可查的 6 位代码。
//
// 注意：列表会过期（基金可能清盘 / 改名 / 合并），首次获取 profile 失败的会被自动跳过。

export interface CuratedFund {
  code: string;
  name: string;
  category: CuratedCategory;
}

export type CuratedCategory =
  | 'A股宽基'
  | 'A股行业'
  | '科技AI'
  | '红利价值'
  | '美股QDII'
  | '港股'
  | '黄金'
  | '债券'
  | '主动管理';

export const CURATED_POOL: CuratedFund[] = [
  // —— A股宽基 ——
  { code: '110020', name: '易方达沪深300ETF联接A', category: 'A股宽基' },
  { code: '000961', name: '天弘沪深300指数A', category: 'A股宽基' },
  { code: '161017', name: '富国中证500指数(LOF)A', category: 'A股宽基' },
  { code: '110026', name: '易方达创业板ETF联接A', category: 'A股宽基' },
  { code: '011609', name: '易方达科创板50ETF联接A', category: 'A股宽基' },
  { code: '519671', name: '银河行业优选混合', category: 'A股宽基' },

  // —— A股行业/主题 ——
  { code: '161725', name: '招商中证白酒指数(LOF)A', category: 'A股行业' },
  { code: '110022', name: '易方达消费行业股票', category: 'A股行业' },
  { code: '003095', name: '中欧医疗健康混合A', category: 'A股行业' },
  { code: '001508', name: '富国新能源汽车', category: 'A股行业' },
  { code: '217021', name: '招商中证银行指数A', category: 'A股行业' },

  // —— 科技 / AI / 半导体 ——
  { code: '012739', name: '天弘中证人工智能主题指数A', category: '科技AI' },
  { code: '008888', name: '华夏国证半导体芯片ETF联接C', category: '科技AI' },
  { code: '001595', name: '天弘中证电子A', category: '科技AI' },
  { code: '009829', name: '华安智能装备主题股票C', category: '科技AI' },
  { code: '011102', name: '天弘中证电网设备主题指数C', category: '科技AI' },

  // —— 红利价值 ——
  { code: '510880', name: '红利ETF', category: '红利价值' },
  { code: '161029', name: '富国中证红利指数增强(LOF)A', category: '红利价值' },
  { code: '100032', name: '富国中证红利指数增强A', category: '红利价值' },

  // —— 美股 QDII ——
  { code: '050025', name: '博时标普500ETF联接A', category: '美股QDII' },
  { code: '040046', name: '华安纳斯达克100联接A', category: '美股QDII' },
  { code: '000834', name: '大成纳斯达克100指数(QDII)A', category: '美股QDII' },
  { code: '003243', name: '易方达全球医药混合(QDII-FOF)A', category: '美股QDII' },

  // —— 港股 ——
  { code: '501301', name: '易方达恒生中国企业ETF联接(LOF)A', category: '港股' },
  { code: '160924', name: '大成恒生综合中小型股(QDII-LOF)', category: '港股' },

  // —— 黄金/商品 ——
  { code: '000216', name: '华安黄金易ETF联接A', category: '黄金' },
  { code: '320013', name: '诺安全球黄金(QDII)', category: '黄金' },
  { code: '002610', name: '博时黄金ETF联接C', category: '黄金' },
  { code: '012709', name: '易方达黄金ETF联接C', category: '黄金' },

  // —— 债券 ——
  { code: '110017', name: '易方达增强回报A', category: '债券' },
  { code: '210002', name: '金鹰增强债券A', category: '债券' },

  // —— 主动管理 ——
  { code: '005827', name: '易方达蓝筹精选混合', category: '主动管理' },
  { code: '161005', name: '富国天惠成长混合A', category: '主动管理' },
  { code: '519066', name: '汇添富蓝筹稳健混合', category: '主动管理' },
  { code: '163406', name: '兴全合润混合(LOF)', category: '主动管理' },
];

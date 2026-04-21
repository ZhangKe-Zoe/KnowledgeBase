# 基金量化 · FundQuant

一个**可直接安装到 iPhone 16 本地**的基金量化交易 PWA（渐进式 Web 应用）——
参考 [Microsoft Qlib](https://github.com/microsoft/qlib) 的 Alpha 因子 pipeline 风格，
在浏览器里完成**行情看盘 + 自选基金 + 策略回测**，**无需 Mac、无需 Xcode、无需 Apple Developer 账号**。

## 特性

| 模块 | 说明 |
|---|---|
| 行情看盘 | 1.2 万+ 公募基金搜索（代码 / 中文 / 拼音），实时估值，历史净值曲线 |
| 自选基金 | 本地持久化，30 秒刷新一次实时估值 |
| Qlib 风格因子 | 表达式 DSL：`$nav / Ref($nav, 20) - 1`、`Mean($nav, 5) - Mean($nav, 20)` …… |
| 策略回测 | Top-K + 周期调仓，含申购 / 赎回费模型，输出年化、Sharpe、最大回撤、Calmar、胜率 |
| 离线能力 | Service Worker 缓存代码 + pingzhongdata，飞行模式下已缓存基金仍可查看 |
| 纯客户端 | 所有计算在浏览器内完成，**没有服务器**，数据走天天基金 JSONP 端点 |

## 技术栈

- Vite 5 + React 18 + TypeScript 5
- Tailwind CSS（深色移动端优先）
- ECharts（按需 tree-shake，~250KB gzip）
- Zustand（状态）
- Dexie.js + pako（IndexedDB + gzip 压缩净值）
- vite-plugin-pwa + Workbox

## 快速开始

```bash
npm install
npm run dev          # 开发服务器，默认 0.0.0.0:5173
npm run build        # 生产构建到 dist/
npm run preview      # 本地预览 dist/
npm run test         # 单测（parser + evaluator）
```

## 部署到静态主机

把 `dist/` 目录丢到任意 HTTPS 静态主机即可：

- **GitHub Pages** — 推 `dist/` 到 `gh-pages` 分支
- **Vercel** — `vercel --prod`
- **Cloudflare Pages** — 连接仓库，构建命令 `npm run build`，输出目录 `dist`
- **自建**：任何支持 HTTPS + MIME 正确的静态服务器

> ⚠️ **必须 HTTPS**：iOS Safari 只有在 HTTPS 或 `localhost` 下才启用 Service Worker 和"添加到主屏幕"。

## 安装到 iPhone 16（核心流程）

1. 在 Mac / PC 上 `npm run build && npm run preview`，或部署到公网 HTTPS 站点
2. iPhone 16 的 **Safari**（非 Chrome）打开该链接
3. 点击底部**分享按钮** → **添加到主屏幕**
4. 回到主屏幕启动，独立窗口、全屏、带自定义图标

安装后 **不受 7 天证书过期限制**（这是原生 App 通过 Xcode/AltStore 侧载时才有的限制；PWA 走 Safari 路径没有此问题）。

### 开发时在 iPhone 上测试

```bash
npm run dev -- --host
```

在 Mac 上用 [`mkcert`](https://github.com/FiloSottile/mkcert) 生成本地 HTTPS 证书（iOS SW 要求 HTTPS），
然后 iPhone 与电脑同一 Wi-Fi，Safari 访问 `https://<你的局域网 IP>:5173`。

## 数据源

| 用途 | 端点 | 加载方式 |
|---|---|---|
| 实时估值 | `https://fundgz.1234567.com.cn/js/{code}.js` | JSONP（`jsonpgz` 回调） |
| 历史净值 | `https://fund.eastmoney.com/pingzhongdata/{code}.js` | `<script>` 注入 + 读取 `window.Data_*` 全局 |
| 基金列表 | `https://fund.eastmoney.com/js/fundcode_search.js` | 同上，本地缓存 7 天 |
| 交易日历 | `/public/calendar.json` | 随 App 打包 |

**注意**：代码**不使用 `eval`**，`pingzhongdata` 通过正则 + `JSON.parse` 解析每个 `var X = ...;`。

## Qlib 风格因子 DSL

```
# 字段
$nav         — 单位净值
$acc_nav     — 累计净值
$return      — 日收益率（小数）

# 时序算子（窗口 N）
Ref(x, N)    — N 日前的值
Delta(x, N)  — x - Ref(x, N)
Mean(x, N)   — 滑动平均
Sum(x, N)    — 滑动求和
Std(x, N)    — 滑动标准差
Max(x, N)    — 窗口最大
Min(x, N)    — 窗口最小

# 元素算子
Abs / Log / Sign
If(cond, a, b)

# 截面算子（仅限根节点）
Rank(x)      — 当日全市场百分位

# 配对时序
Corr(x, y, N)
```

### 预置因子

- 20 日动量：`$nav / Ref($nav, 20) - 1`
- 均值回归：`-($nav - Mean($nav, 20)) / Std($nav, 20)`
- 双均线差：`Mean($nav, 5) - Mean($nav, 20)`
- 近期回撤：`$nav / Max($nav, 60) - 1`

## 架构

```
src/
├── data/
│   ├── remote/eastmoney.ts    # JSONP 端点封装
│   ├── local/dexie.ts         # IndexedDB + pako 压缩
│   └── types.ts
├── quant/                     # 纯算法模块（无 DOM 依赖）
│   ├── expr/{lexer,parser,evaluator}.ts    # Qlib DSL
│   ├── ops/                   # Ref/Mean/Std/Rank/Corr/…
│   ├── factors/               # 预置因子库
│   ├── data/dataset.ts        # 列式对齐（仿 Qlib D.features）
│   ├── backtest/
│   │   ├── engine.ts          # 日线主循环
│   │   ├── portfolio.ts       # 组合 + 调仓
│   │   └── costs.ts           # 申购费 / 赎回费
│   ├── metrics/               # Sharpe / MaxDD / Calmar …
│   └── __tests__/expr.test.ts
├── components/                # NavChart / FundCard / BacktestReport
├── pages/                     # Market / Watchlist / FundDetail / Strategy / Backtest / Report
├── store/                     # Zustand + Dexie 同步
└── pwa/register.ts
```

## 风险与边界

- **数据合规**：天天基金数据仅供学习研究，生产环境请考虑 Tushare Pro / Wind 等合规源
- **真实下单**：本 App **不做任何真实交易**；要接证券柜台需券商 API 资质
- **限流**：自选 ≤ 20 只、每只间隔 100ms，日常使用不触发
- **iOS 存储**：iOS 17+ 已安装的 PWA 有约 1GB IndexedDB 配额，200 基金 × 10 年历史 ≈ 8MB，绰绰有余
- **Dynamic Island**：已用 `viewport-fit=cover` + `env(safe-area-inset-*)` 处理

## License

MIT — 仅供学习研究。

## 致谢

- [Microsoft Qlib](https://github.com/microsoft/qlib) — 因子 / Dataset / 策略设计范式
- [akshare](https://github.com/akfamily/akshare) — 天天基金数据解析参考
- [backtrader](https://github.com/mementum/backtrader) — 回测引擎设计范式

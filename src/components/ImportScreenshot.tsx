import { useMemo, useState } from 'react';
import type { FundMeta } from '../data/types';
import { detectFunds, type Detected as RawDetected } from './import-detect';

interface Detected extends RawDetected {
  selected: boolean;
}

interface Props {
  fundList: FundMeta[];
  onConfirm: (picks: Array<{ code: string; name: string; amount?: number }>) => Promise<void>;
  onClose: () => void;
}

// 从支付宝 / 微信 / 天天基金的持仓截图里识别多只基金。
// 方案：tesseract.js 中文 OCR (chi_sim+eng) → 6 位代码精确匹配 + 名称
// 子串匹配（含空白/括号/大小写归一化）→ 锚点附近抓持仓金额。
// 首次需要下载 ~25MB 中文模型，之后缓存在 IndexedDB。
//
// 调试入口：
//   1) 识别后顶部展开「OCR 原始文本」可看 tesseract 究竟看到了什么
//   2) 没截图也可以「手动粘贴文本」直接走匹配，便于回归调试
export function ImportScreenshot({ fundList, onConfirm, onClose }: Props) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [stage, setStage] = useState<'idle' | 'loading-model' | 'recognizing' | 'done' | 'error'>('idle');
  const [progress, setProgress] = useState<string>('');
  const [rawText, setRawText] = useState<string>('');
  const [detected, setDetected] = useState<Detected[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [manualText, setManualText] = useState<string>('');

  function runDetection(text: string) {
    setRawText(text);
    const hits: Detected[] = detectFunds(text, fundList).map((d) => ({ ...d, selected: true }));
    setDetected(hits);
    setStage('done');
    const fuzzyCount = hits.filter((h) => h.matchedBy === 'fuzzy').length;
    setProgress(
      hits.length === 0
        ? '未识别到基金 — 展开下方「OCR 原始文本」可看 tesseract 究竟读到了什么'
        : `识别到 ${hits.length} 只基金${hits.some((h) => h.amount) ? '（含金额）' : ''}${fuzzyCount > 0 ? ` · ${fuzzyCount} 只来自模糊匹配，请复核` : ''}`,
    );
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setDetected([]);
    setRawText('');
    setStage('loading-model');
    setErr(null);
    setProgress('加载中文 OCR 模型（首次约 25MB，缓存后秒开）...');

    try {
      const Tesseract = await import('tesseract.js');
      setStage('recognizing');

      // PSM=6 假设输入是单一 uniform block of text（持仓列表恰好就是这种结构）；
      // preserve_interword_spaces 让识别更不爱在中文字间插空格。
      const result = await Tesseract.recognize(file, 'chi_sim+eng', {
        logger: (m: { status?: string; progress?: number }) => {
          if (m.status === 'recognizing text' && typeof m.progress === 'number') {
            setProgress(`识别中 ${Math.round(m.progress * 100)}%`);
          } else if (m.status) {
            setProgress(m.status);
          }
        },
        tessedit_pageseg_mode: '6',
        preserve_interword_spaces: '1',
      } as Parameters<typeof Tesseract.recognize>[2]);

      runDetection(result.data.text);
    } catch (e) {
      setErr((e as Error).message);
      setStage('error');
    }
  }

  function toggle(code: string) {
    setDetected((d) => d.map((x) => (x.code === code ? { ...x, selected: !x.selected } : x)));
  }

  function editAmount(code: string, raw: string) {
    const v = raw.trim() === '' ? undefined : Number(raw);
    setDetected((d) =>
      d.map((x) => (x.code === code ? { ...x, amount: Number.isFinite(v as number) ? (v as number) : undefined } : x)),
    );
  }

  async function onAdd() {
    const picks = detected
      .filter((d) => d.selected)
      .map((d) => ({ code: d.code, name: d.name, amount: d.amount }));
    if (picks.length === 0) return;
    await onConfirm(picks);
    onClose();
  }

  const hasFundList = useMemo(() => fundList.length > 0, [fundList]);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-end z-50">
      <div className="w-full bg-slate-900 rounded-t-2xl p-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">截图识别持仓</h2>
          <button className="text-slate-400" onClick={onClose}>关闭</button>
        </div>

        <div className="card mb-3">
          <div className="text-xs text-slate-400 mb-2 leading-relaxed">
            支持支付宝 / 微信 / 天天基金等持仓截图。识别纯客户端执行，
            不上传任何数据。会同时尝试识别<span className="text-slate-200">基金名</span>和
            <span className="text-slate-200">持有金额</span>，导入后会被标记为「持有中」。
          </div>
          <label className="btn block text-center cursor-pointer">
            选择截图
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onFile}
            />
          </label>
        </div>

        {imageUrl && (
          <div className="card mb-3">
            <img src={imageUrl} alt="screenshot" className="max-h-48 mx-auto rounded" />
          </div>
        )}

        {(stage === 'loading-model' || stage === 'recognizing') && (
          <div className="card text-sm text-slate-300">{progress}</div>
        )}

        {stage === 'error' && (
          <div className="card text-sm text-red-400">{err}</div>
        )}

        {stage === 'done' && (
          <>
            <div className="text-sm text-slate-300 mb-2">{progress}</div>

            {/* OCR 原始文本（调试用，识别失败时排查 tesseract 输出） */}
            {rawText && (
              <details className="card mb-3 !p-3">
                <summary className="text-xs text-slate-400 cursor-pointer">
                  OCR 原始文本（{rawText.length} 字符，识别失败时点开排查）
                </summary>
                <pre className="text-[10px] text-slate-400 mt-2 whitespace-pre-wrap break-all max-h-40 overflow-y-auto bg-slate-950/60 rounded p-2 leading-snug">
                  {rawText}
                </pre>
              </details>
            )}

            <div className="space-y-1 mb-3">
              {detected.map((d) => (
                <label key={d.code} className="card !p-3 flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={d.selected}
                    onChange={() => toggle(d.code)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{d.name}</div>
                    <div className="text-xs text-slate-500">
                      {d.code} · {d.type}
                      <span className={`ml-2 ${d.matchedBy === 'fuzzy' ? 'text-amber-400' : ''}`}>
                        {d.matchedBy === 'code' ? '按代码匹配'
                          : d.matchedBy === 'name' ? '按名称匹配'
                          : '⚠ 模糊匹配，请复核'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-500">¥</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={d.amount ?? ''}
                      placeholder="持有"
                      className="w-20 bg-slate-800 text-xs px-2 py-1 rounded text-right"
                      onClick={(e) => e.preventDefault()}
                      onChange={(e) => editAmount(d.code, e.target.value)}
                    />
                  </div>
                </label>
              ))}
            </div>
            {detected.length > 0 && (
              <button className="btn w-full" onClick={onAdd}>
                加入自选并标记持有
              </button>
            )}
          </>
        )}

        {/* 手动粘贴：如果 OCR 失败 / 想直接贴名字 */}
        <details className="card mt-3 !p-3">
          <summary className="text-xs text-slate-400 cursor-pointer">手动粘贴文本（OCR 失败时备用）</summary>
          <textarea
            className="w-full mt-2 bg-slate-950/60 text-xs text-slate-300 rounded p-2 leading-snug"
            rows={6}
            placeholder="贴你已经复制的基金列表文本，或修正 OCR 输出后重新匹配"
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
          />
          <button
            className="btn-ghost w-full mt-2 text-xs"
            disabled={!hasFundList || !manualText.trim()}
            onClick={() => runDetection(manualText)}
          >
            从粘贴文本重新匹配
          </button>
        </details>
      </div>
    </div>
  );
}

import { useState } from 'react';
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
// 方案：tesseract.js 中文 OCR (chi_sim+eng) → 优先匹配 6 位代码 →
// 否则按基金名子串匹配 → 同时尝试在锚点附近抓持仓金额。
// 首次需要下载 ~25MB 中文模型，之后缓存在 IndexedDB。
export function ImportScreenshot({ fundList, onConfirm, onClose }: Props) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [stage, setStage] = useState<'idle' | 'loading-model' | 'recognizing' | 'done' | 'error'>('idle');
  const [progress, setProgress] = useState<string>('');
  const [detected, setDetected] = useState<Detected[]>([]);
  const [err, setErr] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setDetected([]);
    setStage('loading-model');
    setErr(null);
    setProgress('加载中文 OCR 模型（首次约 25MB，缓存后秒开）...');

    try {
      const Tesseract = await import('tesseract.js');
      setStage('recognizing');

      const result = await Tesseract.recognize(file, 'chi_sim+eng', {
        logger: (m: { status?: string; progress?: number }) => {
          if (m.status === 'recognizing text' && typeof m.progress === 'number') {
            setProgress(`识别中 ${Math.round(m.progress * 100)}%`);
          } else if (m.status) {
            setProgress(m.status);
          }
        },
      });

      const text = result.data.text;
      const hits: Detected[] = detectFunds(text, fundList).map((d) => ({ ...d, selected: true }));

      setDetected(hits);
      setStage('done');
      setProgress(
        hits.length === 0
          ? '未识别到基金 — 请截图更清晰，或确保截图里有完整的基金名称'
          : `识别到 ${hits.length} 只基金${hits.some((h) => h.amount) ? '（含持有金额）' : ''}`,
      );
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
                      {d.code} · {d.type} · 按{d.matchedBy === 'code' ? '代码' : '名称'}匹配
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
      </div>
    </div>
  );
}


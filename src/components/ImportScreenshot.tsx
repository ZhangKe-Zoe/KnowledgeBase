import { useState } from 'react';
import type { FundMeta } from '../data/types';

interface Detected {
  code: string;
  name: string;
  type: string;
  selected: boolean;
}

interface Props {
  fundList: FundMeta[];
  onConfirm: (picks: Array<{ code: string; name: string }>) => Promise<void>;
  onClose: () => void;
}

// 从支付宝/微信持仓截图里识别基金代码。
// 方案：tesseract.js 纯客户端 OCR → 正则提取 6 位数字 → 与本地 fundList 匹配。
// 首次使用需要下载 ~10MB 的 OCR 模型（之后缓存在 IndexedDB，复用）。
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
    setProgress('加载 OCR 模型（首次约 10MB）...');

    try {
      const Tesseract = await import('tesseract.js');
      setStage('recognizing');

      const result = await Tesseract.recognize(file, 'eng', {
        logger: (m: { status?: string; progress?: number }) => {
          if (m.status === 'recognizing text' && typeof m.progress === 'number') {
            setProgress(`识别中 ${Math.round(m.progress * 100)}%`);
          } else if (m.status) {
            setProgress(m.status);
          }
        },
      });

      const text = result.data.text;
      // 提取所有 6 位数字（可能被其他字符隔开，先按非数字切）
      const codes = new Set<string>();
      const re = /\b\d{6}\b/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) codes.add(m[0]);

      // 与本地 fundList 匹配
      const byCode = new Map<string, FundMeta>();
      for (const f of fundList) byCode.set(f.code, f);

      const hits: Detected[] = [];
      for (const code of codes) {
        const f = byCode.get(code);
        if (f) hits.push({ code: f.code, name: f.name, type: f.type, selected: true });
      }

      setDetected(hits);
      setStage('done');
      setProgress(hits.length === 0 ? '未识别到有效基金代码' : `识别到 ${hits.length} 只基金`);
    } catch (e) {
      setErr((e as Error).message);
      setStage('error');
    }
  }

  function toggle(code: string) {
    setDetected((d) => d.map((x) => (x.code === code ? { ...x, selected: !x.selected } : x)));
  }

  async function onAdd() {
    const picks = detected.filter((d) => d.selected).map((d) => ({ code: d.code, name: d.name }));
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
          <div className="text-xs text-slate-400 mb-2">
            支持支付宝 / 微信 / 天天基金的持仓截图。识别纯客户端执行，不上传任何数据。
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
                    <div className="text-xs text-slate-500">{d.code} · {d.type}</div>
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

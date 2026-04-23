import { useRef, useState } from 'react';
import { exportBackup, importBackup, type BackupBundle } from '../data/local/dexie';
import { useWatchlist } from '../store/watchlist';
import { useStrategy } from '../store/strategy';

// 导出所有用户数据为 JSON 文件，或从 JSON 文件恢复。
// 纯前端，无服务器。用于跨设备迁移与本地备份。
export function DataBackup() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const { load: loadWatch } = useWatchlist();
  const { load: loadStrat } = useStrategy();

  async function onExport() {
    const bundle = await exportBackup();
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fundquant-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg(`已导出：${bundle.watchlist.length} 自选 · ${bundle.strategies.length} 策略 · ${bundle.backtests.length} 回测`);
  }

  async function onImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const bundle = JSON.parse(text) as BackupBundle;
      const counts = await importBackup(bundle);
      await Promise.all([loadWatch(), loadStrat()]);
      setMsg(`已恢复：${counts.watchlist} 自选 · ${counts.strategies} 策略 · ${counts.backtests} 回测`);
    } catch (err) {
      setMsg(`导入失败：${(err as Error).message}`);
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div className="card">
      <div className="text-sm font-medium mb-2">数据备份</div>
      <div className="flex gap-2">
        <button className="btn-ghost flex-1" onClick={onExport}>导出 JSON</button>
        <label className="btn-ghost flex-1 text-center cursor-pointer">
          导入 JSON
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={onImport}
          />
        </label>
      </div>
      {msg && <div className="text-xs text-slate-400 mt-2">{msg}</div>}
    </div>
  );
}

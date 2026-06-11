import { useState, useEffect } from 'react';
import { GitCompare, ArrowLeftRight } from 'lucide-react';
import type { DiffLine } from '@/types';

export default function Diff() {
  const [oldConfig, setOldConfig] = useState('');
  const [newConfig, setNewConfig] = useState('');
  const [diffLines, setDiffLines] = useState<DiffLine[]>([]);
  const [stats, setStats] = useState({ added: 0, removed: 0, unchanged: 0 });
  const [comparing, setComparing] = useState(false);

  useEffect(() => {
    const old = sessionStorage.getItem('diff_old');
    const n = sessionStorage.getItem('diff_new');
    if (old) setOldConfig(old);
    if (n) setNewConfig(n);
    sessionStorage.removeItem('diff_old');
    sessionStorage.removeItem('diff_new');
  }, []);

  const handleCompare = async () => {
    if (!oldConfig || !newConfig) return;
    setComparing(true);
    try {
      const res = await fetch('/api/diff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ old_config: oldConfig, new_config: newConfig }),
      });
      const data = await res.json();
      setDiffLines(data.diff_lines || []);
      setStats(
        data.stats || { added: 0, removed: 0, unchanged: 0 }
      );
    } catch {
      // ignore
    }
    setComparing(false);
  };

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-6">
      <div>
        <h1 className="text-lg font-bold text-text-primary">版本对比</h1>
        <p className="text-sm text-text-muted mt-1">
          输入新旧配置文本，或从工作台的历史记录导入
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-text-secondary mb-2">
            旧配置
          </label>
          <textarea
            value={oldConfig}
            onChange={(e) => setOldConfig(e.target.value)}
            placeholder="在此粘贴旧版本的配置..."
            className="h-56 w-full rounded-lg border border-white/10 bg-surface px-4 py-3 text-sm font-mono text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none resize-none"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-text-secondary mb-2">
            新配置
          </label>
          <textarea
            value={newConfig}
            onChange={(e) => setNewConfig(e.target.value)}
            placeholder="在此粘贴新版本的配置..."
            className="h-56 w-full rounded-lg border border-white/10 bg-surface px-4 py-3 text-sm font-mono text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none resize-none"
          />
        </div>
      </div>

      <button
        onClick={handleCompare}
        disabled={!oldConfig || !newConfig || comparing}
        className="flex items-center gap-2 rounded bg-accent px-4 py-2 text-sm font-medium text-background hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        <ArrowLeftRight className="h-4 w-4" />
        {comparing ? '对比中...' : '对比差异'}
      </button>

      {diffLines.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1">
              <span className="h-3 w-3 rounded-sm bg-green-500/30" />
              <span className="text-green-400">+{stats.added}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="h-3 w-3 rounded-sm bg-red-500/30" />
              <span className="text-red-400">-{stats.removed}</span>
            </span>
            <span className="text-text-muted">
              {stats.unchanged} 行未变化
            </span>
          </div>

          <div className="rounded-lg border border-white/10 bg-surface overflow-hidden">
            <div className="font-mono text-sm">
              {diffLines.map((line, i) => (
                <div
                  key={i}
                  className={`flex ${
                    line.type === 'added'
                      ? 'bg-green-500/10 border-l-2 border-green-500'
                      : line.type === 'removed'
                        ? 'bg-red-500/10 border-l-2 border-red-500'
                        : ''
                  }`}
                >
                  <span className="w-10 shrink-0 text-right pr-3 py-0.5 text-xs text-text-muted select-none">
                    {line.line_number_old ?? ' '}
                  </span>
                  <span className="w-10 shrink-0 text-right pr-3 py-0.5 text-xs text-text-muted select-none">
                    {line.line_number_new ?? ' '}
                  </span>
                  <span
                    className={`flex-1 py-0.5 whitespace-pre ${
                      line.type === 'added'
                        ? 'text-green-400'
                        : line.type === 'removed'
                          ? 'text-red-400'
                          : 'text-text-secondary'
                    }`}
                  >
                    {line.type === 'added' ? '+ ' : line.type === 'removed' ? '- ' : '  '}
                    {line.content}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {diffLines.length === 0 && (oldConfig || newConfig) && (
        <p className="text-sm text-text-muted text-center py-4">
          <GitCompare className="inline h-4 w-4 mr-1" />
          输入两侧配置后点击"对比差异"
        </p>
      )}
    </div>
  );
}
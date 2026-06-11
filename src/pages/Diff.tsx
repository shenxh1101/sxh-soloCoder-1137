import { useState, useEffect } from 'react';
import { GitCompare, ArrowLeftRight, FileCode, Clock, Copy, Download, X } from 'lucide-react';
import type { DiffLine, HistoryEntry } from '@/types';

const DEVICE_NAME_MAP: Record<string, string> = {
  cisco_router: 'Cisco 路由器',
  huawei_switch: '华为交换机',
  linux_server: 'Linux 服务器',
  windows_firewall: 'Windows 防火墙',
};

export default function Diff() {
  const [oldConfig, setOldConfig] = useState('');
  const [newConfig, setNewConfig] = useState('');
  const [diffLines, setDiffLines] = useState<DiffLine[]>([]);
  const [stats, setStats] = useState({ added: 0, removed: 0, unchanged: 0 });
  const [comparing, setComparing] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showOldPicker, setShowOldPicker] = useState(false);
  const [showNewPicker, setShowNewPicker] = useState(false);

  useEffect(() => {
    const old = sessionStorage.getItem('diff_old');
    const n = sessionStorage.getItem('diff_new');
    if (old) setOldConfig(old);
    if (n) setNewConfig(n);
    sessionStorage.removeItem('diff_old');
    sessionStorage.removeItem('diff_new');
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const res = await fetch('/api/history');
      const data = await res.json();
      setHistory(data.history || []);
    } catch {
      // ignore
    }
  };

  const pickFromHistory = async (entry: HistoryEntry, side: 'old' | 'new') => {
    try {
      const res = await fetch(`/api/history/${entry.id}`);
      if (res.ok) {
        const data = await res.json();
        if (side === 'old') setOldConfig(data.config_text || '');
        else setNewConfig(data.config_text || '');
      }
    } catch {
      // ignore
    }
    setShowOldPicker(false);
    setShowNewPicker(false);
  };

  useEffect(() => {
    if (oldConfig && newConfig) {
      handleCompare();
    }
  }, [oldConfig, newConfig]);

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
      setStats(data.stats || { added: 0, removed: 0, unchanged: 0 });
    } catch {
      // ignore
    }
    setComparing(false);
  };

  const diffText = diffLines
    .map((l) => {
      const prefix = l.type === 'added' ? '+' : l.type === 'removed' ? '-' : ' ';
      return `${prefix} ${l.content}`;
    })
    .join('\n');

  const copyDiff = () => {
    navigator.clipboard.writeText(diffText);
  };

  const downloadDiff = () => {
    const blob = new Blob([diffText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'config_diff.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const HistoryPicker = ({
    side,
    show,
    onClose,
  }: {
    side: 'old' | 'new';
    show: boolean;
    onClose: () => void;
  }) => {
    if (!show) return null;
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="w-96 max-h-[60vh] rounded-lg border border-white/10 bg-background shadow-2xl flex flex-col">
          <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-accent" />
              <h4 className="text-sm font-semibold text-text-primary">
                选择{side === 'old' ? '旧' : '新'}版本
              </h4>
            </div>
            <button onClick={onClose} className="text-text-muted hover:text-text-primary">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-white/5">
            {history.map((entry) => (
              <button
                key={entry.id}
                onClick={() => pickFromHistory(entry, side)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors"
              >
                <FileCode className="h-4 w-4 text-text-muted shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-primary">
                    {DEVICE_NAME_MAP[entry.device_type] || entry.device_type}
                  </p>
                  <p className="text-xs text-text-muted">
                    {new Date(entry.created_at).toLocaleString()}
                    {entry.note ? ` · ${entry.note}` : ''}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-6">
      <HistoryPicker side="old" show={showOldPicker} onClose={() => setShowOldPicker(false)} />
      <HistoryPicker side="new" show={showNewPicker} onClose={() => setShowNewPicker(false)} />

      <div>
        <h1 className="text-lg font-bold text-text-primary">版本对比</h1>
        <p className="text-sm text-text-muted mt-1">
          输入配置文本或从历史记录选取，选好两侧后自动对比
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-text-secondary">旧配置</label>
            <button
              onClick={() => setShowOldPicker(true)}
              className="flex items-center gap-1 rounded border border-white/10 px-2 py-1 text-xs text-text-muted hover:text-accent hover:border-accent/30 transition-colors"
            >
              <Clock className="h-3 w-3" /> 从历史选取
            </button>
          </div>
          <textarea
            value={oldConfig}
            onChange={(e) => setOldConfig(e.target.value)}
            placeholder="在此粘贴旧版本的配置..."
            className="h-56 w-full rounded-lg border border-white/10 bg-surface px-4 py-3 text-sm font-mono text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none resize-none"
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-text-secondary">新配置</label>
            <button
              onClick={() => setShowNewPicker(true)}
              className="flex items-center gap-1 rounded border border-white/10 px-2 py-1 text-xs text-text-muted hover:text-accent hover:border-accent/30 transition-colors"
            >
              <Clock className="h-3 w-3" /> 从历史选取
            </button>
          </div>
          <textarea
            value={newConfig}
            onChange={(e) => setNewConfig(e.target.value)}
            placeholder="在此粘贴新版本的配置..."
            className="h-56 w-full rounded-lg border border-white/10 bg-surface px-4 py-3 text-sm font-mono text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none resize-none"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={handleCompare}
          disabled={!oldConfig || !newConfig || comparing}
          className="flex items-center gap-2 rounded bg-accent px-4 py-2 text-sm font-medium text-background hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <ArrowLeftRight className="h-4 w-4" />
          {comparing ? '对比中...' : '手动对比'}
        </button>
        {diffLines.length > 0 && (
          <>
            <button
              onClick={copyDiff}
              className="flex items-center gap-1.5 rounded border border-white/10 px-3 py-2 text-sm text-text-secondary hover:text-accent transition-colors"
            >
              <Copy className="h-4 w-4" /> 复制差异
            </button>
            <button
              onClick={downloadDiff}
              className="flex items-center gap-1.5 rounded border border-white/10 px-3 py-2 text-sm text-text-secondary hover:text-accent transition-colors"
            >
              <Download className="h-4 w-4" /> 导出差异
            </button>
          </>
        )}
      </div>

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
            <span className="text-text-muted">{stats.unchanged} 行未变化</span>
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
          两侧都输入配置后自动对比，或点击"手动对比"
        </p>
      )}
    </div>
  );
}
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DeviceSelector from '@/components/DeviceSelector';
import ConfigBlockForm from '@/components/ConfigBlockForm';
import ConfigBlockList from '@/components/ConfigBlockList';
import ConfigPreview from '@/components/ConfigPreview';
import WarningPanel from '@/components/WarningPanel';
import ExportBar from '@/components/ExportBar';
import { useConfigStore } from '@/store/configStore';
import type { HistoryEntry, FullHistoryEntry } from '@/types';
import {
  Plus,
  X,
  PenLine,
  FileCode,
  Clock,
  ArrowRightLeft,
  Copy,
  Eye,
} from 'lucide-react';

const DEVICE_NAME_MAP: Record<string, string> = {
  cisco_router: 'Cisco 路由器',
  huawei_switch: '华为交换机',
  linux_server: 'Linux 服务器',
  windows_firewall: 'Windows 防火墙',
};

export default function Home() {
  const navigate = useNavigate();
  const {
    sessions,
    activeSessionId,
    templates,
    history,
    loadDeviceTypes,
    loadTemplates,
    loadHistory,
    addSession,
    removeSession,
    setActiveSession,
    renameSession,
  } = useConfigStore();

  const [editingLabel, setEditingLabel] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyDetail, setHistoryDetail] = useState<FullHistoryEntry | null>(null);

  useEffect(() => {
    loadDeviceTypes();
    loadTemplates();
    loadHistory();
  }, [loadDeviceTypes, loadTemplates, loadHistory]);

  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];
  const sid = activeSession?.id || '';

  const handleLabelEdit = (sId: string, label: string) => {
    setEditingLabel(sId);
    setEditValue(label);
  };

  const handleLabelSave = () => {
    if (editingLabel && editValue.trim()) {
      renameSession(editingLabel, editValue.trim());
    }
    setEditingLabel(null);
  };

  const loadHistoryDetail = async (entry: HistoryEntry) => {
    try {
      const res = await fetch(`/api/history/${entry.id}`);
      if (res.ok) {
        const data = await res.json();
        setHistoryDetail(data);
      }
    } catch {
      // ignore
    }
  };

  const sendToDiff = (text: string, side: 'old' | 'new') => {
    sessionStorage.setItem(`diff_${side}`, text);
    navigate('/diff');
  };

  const filteredTemplates = templates.filter(
    (t) => !t.device_type || t.device_type === activeSession.deviceType
  );

  return (
    <div className="flex h-[calc(100vh-3rem)]">
      {/* Device Tabs Sidebar */}
      <div className="flex w-12 flex-col border-r border-white/5 bg-surface/50">
        {sessions.map((s) => {
          const isActive = s.id === activeSession.id;
          return (
            <button
              key={s.id}
              onClick={() => setActiveSession(s.id)}
              className={`group relative flex h-12 w-12 items-center justify-center border-l-2 transition-all ${
                isActive
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-transparent text-text-muted hover:text-text-secondary hover:bg-white/5'
              }`}
              title={s.label}
            >
              <span className="text-xs font-mono font-bold">
                {sessions.indexOf(s) + 1}
              </span>
              {isActive && (
                <div className="absolute -right-px top-0 bottom-0 w-0.5 bg-accent/30" />
              )}
            </button>
          );
        })}
        <button
          onClick={addSession}
          className="flex h-12 w-12 items-center justify-center text-text-muted hover:text-accent hover:bg-accent/5 transition-all"
          title="添加设备"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Main Workspace */}
      <div className="flex w-full flex-col lg:flex-row">
        {/* Left Config Panel */}
        <div className="flex flex-col gap-3 overflow-y-auto border-r border-white/5 bg-surface/30 p-4 w-full lg:w-[420px] lg:min-w-[380px]">
          {/* Session Header */}
          <div className="flex items-center gap-2">
            {editingLabel === activeSession.id ? (
              <input
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleLabelSave}
                onKeyDown={(e) => e.key === 'Enter' && handleLabelSave()}
                autoFocus
                className="flex-1 rounded border border-accent bg-background px-2 py-1 text-sm text-text-primary focus:outline-none"
              />
            ) : (
              <button
                onDoubleClick={() => handleLabelEdit(activeSession.id, activeSession.label)}
                className="flex items-center gap-1 text-sm font-semibold text-text-primary hover:text-accent transition-colors"
              >
                {activeSession.label}
                <PenLine className="h-3 w-3 text-text-muted" />
              </button>
            )}
            <div className="flex-1" />
            {activeSession.deviceType && (
              <span className="rounded bg-accent/10 px-2 py-0.5 text-xs text-accent">
                {DEVICE_NAME_MAP[activeSession.deviceType] || activeSession.deviceType}
              </span>
            )}
            <button
              onClick={() => setHistoryOpen(!historyOpen)}
              className={`rounded p-1.5 transition-colors ${
                historyOpen ? 'bg-accent/10 text-accent' : 'text-text-muted hover:text-text-secondary'
              }`}
              title="历史记录"
            >
              <Clock className="h-4 w-4" />
            </button>
            {sessions.length > 1 && (
              <button
                onClick={() => removeSession(activeSession.id)}
                className="rounded p-1.5 text-text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors"
                title="删除设备"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Template Selector */}
          <div>
            <label className="block text-xs font-semibold text-text-muted mb-1.5">
              配置模板
            </label>
            <select
              value={activeSession.templateId || ''}
              onChange={(e) =>
                useConfigStore.getState().setTemplateId(sid, e.target.value || null)
              }
              className="w-full rounded border border-white/10 bg-background px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
            >
              <option value="">默认内置模板</option>
              {filteredTemplates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                  {t.source === 'user'
                    ? ` (自定义 · ${DEVICE_NAME_MAP[t.device_type] || t.device_type})`
                    : ` (内置)`}
                </option>
              ))}
            </select>
          </div>

          {/* Device Selector */}
          <div>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-text-muted">
              选择设备类型
            </h2>
            <DeviceSelector sid={sid} />
          </div>

          <div className="border-t border-white/5 pt-3">
            <ConfigBlockForm sid={sid} />
          </div>

          <div className="border-t border-white/5 pt-3 flex-1 overflow-y-auto">
            <ConfigBlockList sid={sid} />
          </div>

          <div className="border-t border-white/5 pt-3">
            <WarningPanel warnings={activeSession.warnings} />
          </div>

          <div className="border-t border-white/5 pt-3">
            <ExportBar sid={sid} />
          </div>
        </div>

        {/* Right Preview Panel */}
        <div className="flex-1 p-4 min-h-0">
          <ConfigPreview configText={activeSession.configText} />
        </div>
      </div>

      {/* History Drawer */}
      {historyOpen && (
        <div className="absolute right-0 top-12 bottom-0 z-40 w-80 border-l border-white/10 bg-background/95 backdrop-blur-xl shadow-2xl overflow-y-auto">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/5 bg-background/95 px-4 py-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-accent" />
              <h3 className="text-sm font-semibold text-text-primary">
                历史记录 ({history.length})
              </h3>
            </div>
            <button
              onClick={() => {
                setHistoryOpen(false);
                setHistoryDetail(null);
              }}
              className="rounded p-1 text-text-muted hover:text-text-primary transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {historyDetail ? (
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setHistoryDetail(null)}
                  className="text-xs text-accent hover:underline"
                >
                  &larr; 返回列表
                </button>
              </div>
              <div className="text-xs text-text-muted">
                {DEVICE_NAME_MAP[historyDetail.device_type] || historyDetail.device_type}
                &middot; {new Date(historyDetail.created_at).toLocaleString()}
              </div>
              <pre className="rounded border border-white/10 bg-surface p-3 text-xs font-mono text-text-primary max-h-80 overflow-auto whitespace-pre-wrap">
                {historyDetail.config_text}
              </pre>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(historyDetail.config_text);
                  }}
                  className="flex items-center gap-1 rounded border border-white/10 px-2 py-1 text-xs text-text-secondary hover:text-accent transition-colors"
                >
                  <Copy className="h-3 w-3" /> 复制
                </button>
                <button
                  onClick={() => sendToDiff(historyDetail.config_text, 'old')}
                  className="flex items-center gap-1 rounded border border-white/10 px-2 py-1 text-xs text-text-secondary hover:text-accent transition-colors"
                >
                  <ArrowRightLeft className="h-3 w-3" /> 作为旧版本
                </button>
                <button
                  onClick={() => sendToDiff(historyDetail.config_text, 'new')}
                  className="flex items-center gap-1 rounded border border-white/10 px-2 py-1 text-xs text-text-secondary hover:text-accent transition-colors"
                >
                  <ArrowRightLeft className="h-3 w-3" /> 作为新版本
                </button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {history.length === 0 && (
                <p className="px-4 py-8 text-center text-xs text-text-muted">暂无历史记录</p>
              )}
              {history.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => loadHistoryDetail(entry)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors"
                >
                  <FileCode className="h-4 w-4 text-text-muted shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary truncate">
                      {DEVICE_NAME_MAP[entry.device_type] || entry.device_type}
                    </p>
                    <p className="text-xs text-text-muted">
                      {new Date(entry.created_at).toLocaleString()}
                    </p>
                  </div>
                  <Eye className="h-3.5 w-3.5 text-text-muted" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
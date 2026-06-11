import { useEffect, useState, useCallback } from 'react';
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
  RotateCcw,
  Filter,
  Check,
  FileText,
  Trash2,
  Tag,
  Search,
  Square,
  CheckSquare,
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
    loadHistoryWithFilter,
    loadHistoryWithSearch,
    updateHistoryNote,
    updateHistoryTag,
    deleteHistoryEntry,
    batchDeleteHistory,
    restoreFromHistory,
    addSession,
    removeSession,
    setActiveSession,
    renameSession,
  } = useConfigStore();

  const [editingLabel, setEditingLabel] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyDetail, setHistoryDetail] = useState<FullHistoryEntry | null>(null);
  const [historyFilter, setHistoryFilter] = useState('');
  const [keyword, setKeyword] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteValue, setNoteValue] = useState('');
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [tagValue, setTagValue] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [templatePreview, setTemplatePreview] = useState<string | null>(null);

  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];
  const sid = activeSession?.id || '';

  useEffect(() => {
    loadDeviceTypes();
    loadTemplates();
    loadHistory();
  }, [loadDeviceTypes, loadTemplates, loadHistory]);

  const openHistory = useCallback(() => {
    loadHistory();
    setHistoryOpen(true);
    setSelectedIds(new Set());
  }, [loadHistory]);

  const doSearch = useCallback(() => {
    loadHistoryWithSearch({
      deviceType: historyFilter || undefined,
      keyword: keyword || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    });
  }, [loadHistoryWithSearch, historyFilter, keyword, dateFrom, dateTo]);

  const handleFilterChange = (dt: string) => {
    setHistoryFilter(dt);
    loadHistoryWithSearch({
      deviceType: dt || undefined,
      keyword: keyword || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    });
  };

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

  const handleRestore = async (entry: HistoryEntry) => {
    await restoreFromHistory(entry.id, sid);
    setHistoryDetail(null);
  };

  const handleNoteEdit = (id: string, currentNote: string) => {
    setEditingNote(id);
    setNoteValue(currentNote);
  };

  const handleNoteSave = async () => {
    if (editingNote) {
      await updateHistoryNote(editingNote, noteValue);
      if (historyDetail && historyDetail.id === editingNote) {
        setHistoryDetail({ ...historyDetail, note: noteValue });
      }
    }
    setEditingNote(null);
  };

  const handleTagEdit = (id: string, currentTag: string) => {
    setEditingTag(id);
    setTagValue(currentTag);
  };

  const handleTagSave = async () => {
    if (editingTag) {
      await updateHistoryTag(editingTag, tagValue);
      if (historyDetail && historyDetail.id === editingTag) {
        setHistoryDetail({ ...historyDetail, tag: tagValue });
      }
    }
    setEditingTag(null);
  };

  const handleDelete = async (id: string) => {
    await deleteHistoryEntry(id);
    if (historyDetail?.id === id) {
      setHistoryDetail(null);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === history.length && history.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(history.map((h) => h.id)));
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    await batchDeleteHistory([...selectedIds]);
    setSelectedIds(new Set());
    setHistoryDetail(null);
  };

  const sendToDiff = (text: string, side: 'old' | 'new') => {
    sessionStorage.setItem(`diff_${side}`, text);
    navigate('/diff');
  };

  const handleTemplatePreview = async (templateId: string) => {
    try {
      const res = await fetch(`/api/templates/${templateId}`);
      if (res.ok) {
        const data = await res.json();
        setTemplatePreview(data.content || '');
      }
    } catch {
      setTemplatePreview('无法加载模板内容');
    }
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
              onClick={openHistory}
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
            <div className="flex gap-1">
              <select
                value={activeSession.templateId || ''}
                onChange={(e) =>
                  useConfigStore.getState().setTemplateId(sid, e.target.value || null)
                }
                className="flex-1 rounded border border-white/10 bg-background px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
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
              {activeSession.templateId && (
                <button
                  onClick={() => handleTemplatePreview(activeSession.templateId!)}
                  className="rounded border border-white/10 px-2 text-text-muted hover:text-accent hover:border-accent/30 transition-colors"
                  title="预览模板"
                >
                  <Eye className="h-4 w-4" />
                </button>
              )}
            </div>
            {activeSession.templateId && (
              <p className="mt-1 text-xs text-accent/60">
                当前使用: {activeSession.templateId.startsWith('user:') ? '自定义模板' : '内置模板'}
              </p>
            )}
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
        <div className="absolute right-0 top-12 bottom-0 z-40 w-96 border-l border-white/10 bg-background/95 backdrop-blur-xl shadow-2xl flex flex-col">
          <div className="shrink-0 border-b border-white/5 bg-background/95 px-4 py-3 space-y-2">
            <div className="flex items-center justify-between">
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
                  setSelectedIds(new Set());
                }}
                className="rounded p-1 text-text-muted hover:text-text-primary transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {!historyDetail && (
              <>
                <div className="flex items-center gap-2">
                  <Filter className="h-3.5 w-3.5 text-text-muted" />
                  <select
                    value={historyFilter}
                    onChange={(e) => handleFilterChange(e.target.value)}
                    className="flex-1 rounded border border-white/10 bg-surface px-2 py-1 text-xs text-text-primary focus:border-accent focus:outline-none"
                  >
                    <option value="">全部设备类型</option>
                    <option value="cisco_router">Cisco 路由器</option>
                    <option value="huawei_switch">华为交换机</option>
                    <option value="linux_server">Linux 服务器</option>
                    <option value="windows_firewall">Windows 防火墙</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <Search className="h-3.5 w-3.5 text-text-muted shrink-0" />
                  <input
                    type="text"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && doSearch()}
                    placeholder="搜索备注/标签..."
                    className="flex-1 rounded border border-white/10 bg-surface px-2 py-1 text-xs text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="flex-1 rounded border border-white/10 bg-surface px-2 py-1 text-xs text-text-primary focus:border-accent focus:outline-none"
                  />
                  <span className="text-xs text-text-muted">至</span>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="flex-1 rounded border border-white/10 bg-surface px-2 py-1 text-xs text-text-primary focus:border-accent focus:outline-none"
                  />
                  <button
                    onClick={doSearch}
                    className="rounded border border-accent/30 bg-accent/10 px-2 py-1 text-xs text-accent hover:bg-accent/20"
                  >
                    搜索
                  </button>
                </div>
                {selectedIds.size > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-muted">已选 {selectedIds.size} 项</span>
                    <button
                      onClick={handleBatchDelete}
                      className="rounded bg-red-500/10 px-2 py-1 text-xs text-red-400 hover:bg-red-500/20"
                    >
                      <Trash2 className="inline h-3 w-3 mr-1" />
                      批量删除
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {historyDetail ? (
              <div className="p-4 space-y-3">
                <button
                  onClick={() => setHistoryDetail(null)}
                  className="text-xs text-accent hover:underline"
                >
                  &larr; 返回列表
                </button>
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <span className="rounded bg-white/5 px-1.5 py-0.5">
                    {DEVICE_NAME_MAP[historyDetail.device_type] || historyDetail.device_type}
                  </span>
                  <span>{new Date(historyDetail.created_at).toLocaleString()}</span>
                  {historyDetail.tag && (
                    <span className="rounded bg-accent/10 px-1.5 py-0.5 text-accent">
                      {historyDetail.tag}
                    </span>
                  )}
                </div>

                {/* Tag editor */}
                <div className="rounded border border-white/10 bg-surface p-2">
                  <label className="text-xs text-text-muted">版本标签</label>
                  {editingTag === historyDetail.id ? (
                    <div className="flex gap-1 mt-1">
                      <input
                        value={tagValue}
                        onChange={(e) => setTagValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleTagSave()}
                        onBlur={handleTagSave}
                        autoFocus
                        className="flex-1 rounded border border-accent bg-background px-2 py-1 text-xs text-text-primary focus:outline-none"
                      />
                      <button
                        onClick={handleTagSave}
                        className="rounded bg-accent/20 p-1 text-accent"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 mt-1">
                      <Tag className="h-3 w-3 text-text-muted" />
                      <span className="flex-1 text-xs text-text-secondary">
                        {historyDetail.tag || '点击设置标签...'}
                      </span>
                      <button
                        onClick={() => handleTagEdit(historyDetail.id, historyDetail.tag || '')}
                        className="text-text-muted hover:text-accent"
                      >
                        <PenLine className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Note editor */}
                <div className="rounded border border-white/10 bg-surface p-2">
                  <label className="text-xs text-text-muted">备注</label>
                  {editingNote === historyDetail.id ? (
                    <div className="flex gap-1 mt-1">
                      <input
                        value={noteValue}
                        onChange={(e) => setNoteValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleNoteSave()}
                        onBlur={handleNoteSave}
                        autoFocus
                        className="flex-1 rounded border border-accent bg-background px-2 py-1 text-xs text-text-primary focus:outline-none"
                      />
                      <button
                        onClick={handleNoteSave}
                        className="rounded bg-accent/20 p-1 text-accent"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 mt-1">
                      <span className="flex-1 text-xs text-text-secondary">
                        {historyDetail.note || '点击编辑添加备注...'}
                      </span>
                      <button
                        onClick={() => handleNoteEdit(historyDetail.id, historyDetail.note || '')}
                        className="text-text-muted hover:text-accent"
                      >
                        <PenLine className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>

                <pre className="rounded border border-white/10 bg-surface p-3 text-xs font-mono text-text-primary max-h-64 overflow-auto whitespace-pre-wrap">
                  {historyDetail.config_text}
                </pre>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleRestore(historyDetail)}
                    className="flex items-center gap-1 rounded bg-accent/20 px-2 py-1.5 text-xs text-accent hover:bg-accent/30 transition-colors"
                  >
                    <RotateCcw className="h-3 w-3" /> 恢复到当前设备
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(historyDetail.config_text);
                    }}
                    className="flex items-center gap-1 rounded border border-white/10 px-2 py-1.5 text-xs text-text-secondary hover:text-accent transition-colors"
                  >
                    <Copy className="h-3 w-3" /> 复制
                  </button>
                  <button
                    onClick={() => sendToDiff(historyDetail.config_text, 'old')}
                    className="flex items-center gap-1 rounded border border-white/10 px-2 py-1.5 text-xs text-text-secondary hover:text-accent transition-colors"
                  >
                    <ArrowRightLeft className="h-3 w-3" /> 作为旧版本
                  </button>
                  <button
                    onClick={() => sendToDiff(historyDetail.config_text, 'new')}
                    className="flex items-center gap-1 rounded border border-white/10 px-2 py-1.5 text-xs text-text-secondary hover:text-accent transition-colors"
                  >
                    <ArrowRightLeft className="h-3 w-3" /> 作为新版本
                  </button>
                  <button
                    onClick={() => handleDelete(historyDetail.id)}
                    className="flex items-center gap-1 rounded border border-red-500/20 px-2 py-1.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="h-3 w-3" /> 删除
                  </button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {history.length === 0 && (
                  <p className="px-4 py-8 text-center text-xs text-text-muted">暂无历史记录</p>
                )}
                <div className="flex items-center gap-1 px-4 py-2 border-b border-white/5">
                  <button
                    onClick={selectAll}
                    className="text-text-muted hover:text-accent transition-colors"
                  >
                    {selectedIds.size === history.length && history.length > 0 ? (
                      <CheckSquare className="h-4 w-4" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </button>
                  <span className="text-xs text-text-muted">全选</span>
                </div>
                {history.map((entry) => (
                  <div key={entry.id} className="flex items-stretch">
                    <button
                      onClick={() => toggleSelect(entry.id)}
                      className="px-2 text-text-muted hover:text-accent transition-colors shrink-0"
                    >
                      {selectedIds.has(entry.id) ? (
                        <CheckSquare className="h-3.5 w-3.5" />
                      ) : (
                        <Square className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => loadHistoryDetail(entry)}
                      className="flex flex-1 items-center gap-3 py-3 pr-4 text-left hover:bg-white/5 transition-colors min-w-0"
                    >
                      <FileCode className="h-4 w-4 text-text-muted shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm text-text-primary truncate">
                            {DEVICE_NAME_MAP[entry.device_type] || entry.device_type}
                          </p>
                          {entry.tag && (
                            <span className="text-xs rounded bg-accent/10 px-1 text-accent truncate">
                              {entry.tag}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-text-muted">
                          <span>{new Date(entry.created_at).toLocaleString()}</span>
                          {entry.note && (
                            <span className="truncate text-accent/70">· {entry.note}</span>
                          )}
                        </div>
                      </div>
                      <Eye className="h-3.5 w-3.5 text-text-muted shrink-0" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRestore(entry);
                      }}
                      className="px-2 text-text-muted hover:text-accent hover:bg-accent/5 transition-colors shrink-0"
                      title="恢复到当前设备"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(entry.id);
                      }}
                      className="px-2 text-text-muted hover:text-red-400 hover:bg-red-400/5 transition-colors shrink-0"
                      title="删除"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Template Preview Modal */}
      {templatePreview !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setTemplatePreview(null)}
        >
          <div
            className="w-full max-w-2xl max-h-[70vh] rounded-lg border border-white/10 bg-background shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-accent" />
                <h3 className="text-sm font-semibold text-text-primary">模板预览</h3>
              </div>
              <button
                onClick={() => setTemplatePreview(null)}
                className="rounded p-1 text-text-muted hover:text-text-primary transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <pre className="p-4 text-sm font-mono text-text-primary overflow-auto max-h-[60vh] whitespace-pre-wrap">
              {templatePreview}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
import { useConfigStore } from '@/store/configStore';
import { Download, Copy, Package, Check, Loader2, Play, X, FileText, FileCheck, AlertTriangle, Shield } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { ZipFilePreview } from '@/types';

const DEVICE_NAME_MAP: Record<string, string> = {
  cisco_router: 'Cisco 路由器',
  huawei_switch: '华为交换机',
  linux_server: 'Linux 服务器',
  windows_firewall: 'Windows 防火墙',
};

interface Props {
  sid: string;
}

export default function ExportBar({ sid }: Props) {
  const { sessions, generate, previewZip } = useConfigStore();
  const session = sessions.find((s) => s.id === sid);
  const [copied, setCopied] = useState(false);
  const [zipModalOpen, setZipModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [includeManifest, setIncludeManifest] = useState(true);
  const [previewFiles, setPreviewFiles] = useState<ZipFilePreview[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  if (!session || !session.deviceType) return null;

  const { configText, configBlocks, deviceType, isLoading } = session;

  const eligibleSessions = sessions.filter(
    (s) => s.deviceType && s.configBlocks.length > 0
  );

  const selectedCount = [...selectedIds].filter((id) =>
    eligibleSessions.some((s) => s.id === id)
  ).length;

  useEffect(() => {
    if (!zipModalOpen) return;
    const ids = [...selectedIds].filter((id) =>
      eligibleSessions.some((s) => s.id === id)
    );
    if (ids.length === 0) {
      setPreviewFiles([]);
      return;
    }
    loadPreview(ids);
  }, [zipModalOpen]);

  const loadPreview = async (ids: string[]) => {
    setPreviewLoading(true);
    try {
      const files = await previewZip(ids, includeManifest);
      setPreviewFiles(files);
    } catch {
      setPreviewFiles([]);
    }
    setPreviewLoading(false);
  };

  const handleCopy = async () => {
    if (!configText) return;
    await navigator.clipboard.writeText(configText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!configText) return;
    const blob = new Blob([configText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${session.label}_${deviceType}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openZipModal = () => {
    setSelectedIds(new Set(eligibleSessions.map((s) => s.id)));
    setZipModalOpen(true);
  };

  const toggleDevice = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      if (next.size === 0) return prev;
      loadPreview([...next].filter((i) =>
        eligibleSessions.some((s) => s.id === i)
      ));
      return next;
    });
  };

  const handleManifestToggle = () => {
    setIncludeManifest((prev) => {
      const next = !prev;
      const ids = [...selectedIds].filter((i) =>
        eligibleSessions.some((s) => s.id === i)
      );
      if (ids.length > 0) {
        loadPreviewWithManifest(ids, next);
      }
      return next;
    });
  };

  const loadPreviewWithManifest = async (ids: string[], manifest: boolean) => {
    setPreviewLoading(true);
    try {
      const files = await previewZip(ids, manifest);
      setPreviewFiles(files);
    } catch {
      setPreviewFiles([]);
    }
    setPreviewLoading(false);
  };

  const handleZipDownload = async () => {
    const selected = eligibleSessions.filter((s) => selectedIds.has(s.id));
    if (selected.length === 0) return;
    setDownloading(true);

    const devices = selected.map((s) => ({
      device_type: s.deviceType,
      template_id: s.templateId,
      config_blocks: s.configBlocks,
    }));
    const labels = selected.map((s) => s.label);

    try {
      const res = await fetch('/api/generate/zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          devices,
          labels,
          include_manifest: includeManifest,
        }),
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'network_configs.zip';
      a.click();
      URL.revokeObjectURL(url);
      setZipModalOpen(false);
    } catch {
      // ignore
    }
    setDownloading(false);
  };

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => generate(sid)}
          disabled={configBlocks.length === 0 || isLoading}
          className="flex items-center gap-1.5 rounded bg-accent px-3 py-2 text-sm font-medium text-background hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-3.5 w-3.5" />
          )}
          生成配置
        </button>

        {configText && (
          <>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded border border-white/10 px-3 py-2 text-sm text-text-secondary hover:border-white/20 hover:text-text-primary transition-all"
            >
              {copied ? <Check className="h-4 w-4 text-accent" /> : <Copy className="h-4 w-4" />}
              {copied ? '已复制' : '复制'}
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 rounded border border-white/10 px-3 py-2 text-sm text-text-secondary hover:border-white/20 hover:text-text-primary transition-all"
            >
              <Download className="h-4 w-4" />
              下载
            </button>
            <button
              onClick={openZipModal}
              className="flex items-center gap-1.5 rounded border border-white/10 px-3 py-2 text-sm text-text-secondary hover:border-accent hover:text-accent transition-all"
              title={`打包 ${eligibleSessions.length} 台设备`}
            >
              <Package className="h-4 w-4" />
              ZIP
              {eligibleSessions.length > 1 ? ` (${eligibleSessions.length})` : ''}
            </button>
          </>
        )}
      </div>

      {zipModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-[520px] max-h-[80vh] rounded-lg border border-white/10 bg-background shadow-2xl flex flex-col">
            <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-accent" />
                <h3 className="text-sm font-semibold text-text-primary">ZIP 打包交付</h3>
              </div>
              <button
                onClick={() => setZipModalOpen(false)}
                className="rounded p-1 text-text-muted hover:text-text-primary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <p className="text-xs text-text-muted">选择要打包的设备：</p>
              {eligibleSessions.map((s) => (
                <label
                  key={s.id}
                  className="flex items-center gap-3 rounded border border-white/10 bg-surface px-3 py-2.5 cursor-pointer hover:border-white/20 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(s.id)}
                    onChange={() => toggleDevice(s.id)}
                    className="accent-accent h-4 w-4"
                  />
                  <div className="flex-1">
                    <p className="text-sm text-text-primary">{s.label}</p>
                    <p className="text-xs text-text-muted">
                      {DEVICE_NAME_MAP[s.deviceType] || s.deviceType} &middot;{' '}
                      {s.configBlocks.length} 个配置块
                    </p>
                  </div>
                </label>
              ))}

              {eligibleSessions.length === 0 && (
                <p className="text-xs text-text-muted text-center py-4">暂无可打包的设备</p>
              )}

              <div className="rounded border border-white/10 bg-surface p-3 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeManifest}
                    onChange={handleManifestToggle}
                    className="accent-accent h-4 w-4"
                  />
                  <span className="text-xs text-text-primary">
                    附带交付清单 (MANIFEST.csv)
                  </span>
                </label>
                <p className="text-xs text-text-muted pl-6">
                  清单包含设备标签、类型、模板、生成时间和校验值，方便交付后核对
                </p>
              </div>

              {previewLoading ? (
                <div className="flex items-center justify-center py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-accent" />
                  <span className="ml-2 text-xs text-text-muted">计算文件列表...</span>
                </div>
              ) : previewFiles.length > 0 ? (
                <div className="rounded border border-white/10 bg-surface p-3 space-y-1.5">
                  <div className="flex items-center gap-1.5 mb-2">
                    <FileCheck className="h-3.5 w-3.5 text-accent" />
                    <span className="text-xs text-text-muted">
                      将生成 {previewFiles.filter((f) => !f.is_manifest).length} 个配置文件
                      {previewFiles.some((f) => f.is_manifest) ? ' + 1 个清单' : ''}：
                    </span>
                  </div>
                  {previewFiles.map((f, i) => (
                    <div
                      key={f.filename || i}
                      className={`rounded px-2 py-1.5 ${
                        f.is_manifest ? 'bg-accent/5 border border-accent/20' : 'bg-background/50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {f.is_manifest ? (
                          <FileText className="h-3.5 w-3.5 text-accent shrink-0" />
                        ) : f.valid ? (
                          <FileCheck className="h-3.5 w-3.5 text-accent shrink-0" />
                        ) : (
                          <AlertTriangle className="h-3.5 w-3.5 text-yellow-400 shrink-0" />
                        )}
                        <span className={`text-xs font-mono truncate flex-1 ${
                          f.is_manifest ? 'text-accent' : 'text-text-primary'
                        }`}>
                          {f.filename}
                        </span>
                        {!f.is_manifest && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            {f.warnings_count > 0 && (
                              <span className="text-xs text-yellow-400">
                                {f.warnings_count}⚠
                              </span>
                            )}
                            <span className="text-xs text-text-muted">
                              {DEVICE_NAME_MAP[f.device_type] || f.device_type}
                            </span>
                          </div>
                        )}
                      </div>
                      {f.label && !f.is_manifest && (
                        <p className="text-xs text-text-muted pl-5.5 mt-0.5">
                          标签: {f.label} &middot; {f.config_blocks_count} 个配置块
                        </p>
                      )}
                      {f.is_manifest && (
                        <p className="text-xs text-text-muted pl-5.5 mt-0.5">
                          记录校验值、标签、类型、模板和生成时间
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : selectedCount > 0 ? (
                <p className="text-xs text-text-muted text-center py-2">无法生成文件预览</p>
              ) : null}

              {!previewLoading && previewFiles.length > 0 && (
                <div className="rounded border border-white/10 bg-surface p-2.5 flex items-center gap-2">
                  <Shield className="h-3.5 w-3.5 text-text-muted" />
                  <p className="text-xs text-text-muted">
                    每个配置文件将附带 SHA256 校验值，文件名已自动处理特殊字符
                  </p>
                </div>
              )}
            </div>

            <div className="border-t border-white/5 px-4 py-3">
              <button
                onClick={handleZipDownload}
                disabled={selectedCount === 0 || downloading}
                className="flex w-full items-center justify-center gap-2 rounded bg-accent px-4 py-2 text-sm font-medium text-background hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {downloading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Package className="h-4 w-4" />
                )}
                {downloading
                  ? '打包中...'
                  : `下载 ZIP (${
                      previewFiles.filter((f) => !f.is_manifest).length
                    } 个配置${
                      previewFiles.some((f) => f.is_manifest) ? ' + 清单' : ''
                    })`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
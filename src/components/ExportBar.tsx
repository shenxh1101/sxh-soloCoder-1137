import { useConfigStore } from '@/store/configStore';
import { Download, Copy, Package, Check, Loader2, Play, X, FileText } from 'lucide-react';
import { useState } from 'react';

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
  const { sessions, generate } = useConfigStore();
  const session = sessions.find((s) => s.id === sid);
  const [copied, setCopied] = useState(false);
  const [zipModalOpen, setZipModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  if (!session || !session.deviceType) return null;

  const { configText, configBlocks, deviceType, isLoading } = session;

  const eligibleSessions = sessions.filter(
    (s) => s.deviceType && s.configBlocks.length > 0
  );

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
      return next;
    });
  };

  const getPreviewFiles = () => {
    const selected = eligibleSessions.filter((s) => selectedIds.has(s.id));
    return selected.map((s) => ({
      id: s.id,
      label: s.label,
      filename: `${s.label}_${s.deviceType}.txt`,
    }));
  };

  const handleZipDownload = async () => {
    const selected = eligibleSessions.filter((s) => selectedIds.has(s.id));
    const devices = selected.map((s) => ({
      device_type: s.deviceType,
      template_id: s.templateId,
      config_blocks: s.configBlocks,
    }));
    const labels = selected.map((s) => s.label);
    const filenames = selected.map((s) => `${s.label}_${s.deviceType}.txt`);

    try {
      const res = await fetch('/api/generate/zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ devices, labels, filenames }),
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
  };

  const previewFiles = getPreviewFiles();

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

      {/* ZIP Modal */}
      {zipModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-[480px] max-h-[80vh] rounded-lg border border-white/10 bg-background shadow-2xl flex flex-col">
            <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-accent" />
                <h3 className="text-sm font-semibold text-text-primary">ZIP 打包下载</h3>
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

              {previewFiles.length > 0 && (
                <div className="rounded border border-white/10 bg-surface p-3 space-y-1">
                  <div className="flex items-center gap-1.5 mb-2">
                    <FileText className="h-3.5 w-3.5 text-text-muted" />
                    <span className="text-xs text-text-muted">
                      将生成 {previewFiles.length} 个文件：
                    </span>
                  </div>
                  {previewFiles.map((f) => (
                    <div key={f.id} className="text-xs font-mono text-text-secondary pl-5">
                      {f.filename}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-white/5 px-4 py-3">
              <button
                onClick={handleZipDownload}
                disabled={previewFiles.length === 0}
                className="flex w-full items-center justify-center gap-2 rounded bg-accent px-4 py-2 text-sm font-medium text-background hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Package className="h-4 w-4" />
                下载 ZIP ({previewFiles.length} 个文件)
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
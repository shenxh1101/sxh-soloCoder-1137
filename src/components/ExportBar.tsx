import { useConfigStore } from '@/store/configStore';
import { Download, Copy, Package, Check, Loader2, Play } from 'lucide-react';
import { useState } from 'react';

interface Props {
  sid: string;
}

export default function ExportBar({ sid }: Props) {
  const { sessions, generate } = useConfigStore();
  const session = sessions.find((s) => s.id === sid);
  const [copied, setCopied] = useState(false);

  if (!session || !session.deviceType) return null;

  const { configText, configBlocks, deviceType, templateId, isLoading } = session;

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
    a.download = `${deviceType}_config.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleZipDownload = async () => {
    const allSessions = useConfigStore.getState().sessions.filter(
      (s) => s.deviceType && s.configBlocks.length > 0
    );
    const devices = allSessions.map((s) => ({
      device_type: s.deviceType,
      template_id: s.templateId,
      config_blocks: s.configBlocks,
    }));

    try {
      const res = await fetch('/api/generate/zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ devices }),
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'network_configs.zip';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
  };

  const deviceCount = useConfigStore.getState().sessions.filter(
    (s) => s.deviceType && s.configBlocks.length > 0
  ).length;

  return (
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
            onClick={handleZipDownload}
            className="flex items-center gap-1.5 rounded border border-white/10 px-3 py-2 text-sm text-text-secondary hover:border-accent hover:text-accent transition-all"
            title={`打包 ${deviceCount} 台设备`}
          >
            <Package className="h-4 w-4" />
            ZIP{deviceCount > 1 ? ` (${deviceCount})` : ''}
          </button>
        </>
      )}
    </div>
  );
}
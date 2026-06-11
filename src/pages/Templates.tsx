import { useEffect, useState } from 'react';
import { FileCode, Upload, Trash2, Eye, X } from 'lucide-react';
import type { TemplateInfo } from '@/types';

export default function Templates() {
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [uploadDevice, setUploadDevice] = useState('');
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  const loadTemplates = async () => {
    try {
      const res = await fetch('/api/templates');
      const data = await res.json();
      setTemplates(data.templates || []);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadDevice) return;
    setUploading(true);
    setMessage('');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('device_type', uploadDevice);
    try {
      const res = await fetch('/api/templates/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok) {
        setMessage('上传成功');
        loadTemplates();
      } else {
        setMessage(data.error || '上传失败');
      }
    } catch {
      setMessage('上传失败');
    }
    setUploading(false);
    e.target.value = '';
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/templates/${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadTemplates();
      }
    } catch {
      // ignore
    }
  };

  const handlePreview = async (id: string) => {
    try {
      const res = await fetch(`/api/templates/${id}`);
      const data = await res.json();
      setPreviewContent(data.content);
    } catch {
      setPreviewContent('无法加载模板内容');
    }
  };

  const deviceName = (dt: string) => {
    const map: Record<string, string> = {
      cisco_router: 'Cisco 路由器',
      huawei_switch: '华为交换机',
      linux_server: 'Linux 服务器',
      windows_firewall: 'Windows 防火墙',
    };
    return map[dt] || dt;
  };

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-6">
      <div>
        <h1 className="text-lg font-bold text-text-primary">配置模板管理</h1>
        <p className="text-sm text-text-muted mt-1">
          管理内置模板和上传自定义 Jinja2 模板
        </p>
      </div>

      <div className="rounded-lg border border-white/10 bg-surface p-4 space-y-3">
        <h3 className="text-sm font-semibold text-text-secondary">上传自定义模板</h3>
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={uploadDevice}
            onChange={(e) => setUploadDevice(e.target.value)}
            className="rounded border border-white/10 bg-background px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
          >
            <option value="">选择设备类型...</option>
            <option value="cisco_router">Cisco 路由器</option>
            <option value="huawei_switch">华为交换机</option>
            <option value="linux_server">Linux 服务器</option>
            <option value="windows_firewall">Windows 防火墙</option>
          </select>
          <label className="cursor-pointer rounded border border-white/10 bg-background px-3 py-2 text-sm text-text-secondary hover:border-accent hover:text-accent transition-colors">
            <Upload className="inline h-4 w-4 mr-1" />
            {uploading ? '上传中...' : '选择 .j2 文件'}
            <input
              type="file"
              accept=".j2"
              onChange={handleUpload}
              className="hidden"
              disabled={uploading}
            />
          </label>
          {message && (
            <span
              className={`text-xs ${message.includes('成功') ? 'text-accent' : 'text-red-400'}`}
            >
              {message}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-text-secondary">
          模板列表 ({templates.length})
        </h3>

        {templates.map((t) => (
          <div
            key={t.id}
            className="flex items-center gap-3 rounded-lg border border-white/10 bg-surface px-4 py-3"
          >
            <FileCode className="h-5 w-5 text-accent shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-text-primary truncate">{t.name}</p>
              <p className="text-xs text-text-muted">
                {t.device_type ? deviceName(t.device_type) : '通用'} &middot;{' '}
                {t.source === 'builtin' ? '内置模板' : '自定义'}
              </p>
            </div>
            <button
              onClick={() => handlePreview(t.id)}
              className="rounded p-1.5 text-text-muted hover:text-accent hover:bg-accent/10 transition-colors"
              title="预览"
            >
              <Eye className="h-4 w-4" />
            </button>
            {t.source === 'user' && (
              <button
                onClick={() => handleDelete(t.id)}
                className="rounded p-1.5 text-text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors"
                title="删除"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}

        {templates.length === 0 && (
          <p className="text-sm text-text-muted text-center py-8">暂无模板</p>
        )}
      </div>

      {previewContent !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[70vh] rounded-lg border border-white/10 bg-background shadow-xl">
            <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
              <h3 className="text-sm font-semibold text-text-primary">模板预览</h3>
              <button
                onClick={() => setPreviewContent(null)}
                className="rounded p-1 text-text-muted hover:text-text-primary transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <pre className="p-4 text-sm font-mono text-text-primary overflow-auto max-h-[60vh] whitespace-pre-wrap">
              {previewContent}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
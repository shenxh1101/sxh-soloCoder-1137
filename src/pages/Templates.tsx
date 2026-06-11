import { useEffect, useState } from 'react';
import { FileCode, Upload, Trash2, Eye, X, Play, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import type { TemplateInfo, TemplateTestResult } from '@/types';
import { useConfigStore } from '@/store/configStore';

const DEVICE_NAME_MAP: Record<string, string> = {
  cisco_router: 'Cisco 路由器',
  huawei_switch: '华为交换机',
  linux_server: 'Linux 服务器',
  windows_firewall: 'Windows 防火墙',
};

export default function Templates() {
  const { testTemplate } = useConfigStore();
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [uploadDevice, setUploadDevice] = useState('');
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  const [testModal, setTestModal] = useState<TemplateInfo | null>(null);
  const [testDeviceType, setTestDeviceType] = useState('cisco_router');
  const [testJson, setTestJson] = useState(
    '[\n  {"type": "hostname", "id": "h1", "properties": {"hostname": "MY-DEVICE"}},\n  {"type": "interface", "id": "i1", "properties": {"name": "GigabitEthernet0/0", "ip": "192.168.1.1"}}\n]'
  );
  const [testRunning, setTestRunning] = useState(false);
  const [testResult, setTestResult] = useState<TemplateTestResult | null>(null);
  const [testError, setTestError] = useState('');

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

  const openTestModal = (t: TemplateInfo) => {
    setTestModal(t);
    setTestDeviceType(t.device_type || 'cisco_router');
    setTestJson(
      '[\n  {"type": "hostname", "id": "h1", "properties": {"hostname": "MY-DEVICE"}},\n  {"type": "interface", "id": "i1", "properties": {"name": "GigabitEthernet0/0", "ip": "192.168.1.1"}}\n]'
    );
    setTestResult(null);
    setTestError('');
  };

  const handleTestRun = async () => {
    if (!testModal) return;
    setTestRunning(true);
    setTestError('');
    setTestResult(null);

    let blocks;
    try {
      blocks = JSON.parse(testJson);
      if (!Array.isArray(blocks)) throw new Error('必须是 JSON 数组');
    } catch (e) {
      setTestError('JSON 格式错误: ' + (e instanceof Error ? e.message : ''));
      setTestRunning(false);
      return;
    }

    try {
      const result = await testTemplate(testModal.id, testDeviceType, blocks);
      setTestResult(result);
    } catch (e) {
      setTestError('试运行请求失败: ' + (e instanceof Error ? e.message : ''));
    }
    setTestRunning(false);
  };

  const deviceName = (dt: string) => DEVICE_NAME_MAP[dt] || dt;

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
              onClick={() => openTestModal(t)}
              className="rounded p-1.5 text-text-muted hover:text-accent hover:bg-accent/10 transition-colors"
              title="试运行"
            >
              <Play className="h-4 w-4" />
            </button>
            <button
              onClick={() => handlePreview(t.id)}
              className="rounded p-1.5 text-text-muted hover:text-accent hover:bg-accent/10 transition-colors"
              title="预览模板源码"
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

      {/* Template Source Preview Modal */}
      {previewContent !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[70vh] rounded-lg border border-white/10 bg-background shadow-xl">
            <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
              <h3 className="text-sm font-semibold text-text-primary">模板源代码预览</h3>
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

      {/* Template Test / Sandbox Modal */}
      {testModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-3xl max-h-[85vh] rounded-lg border border-white/10 bg-background shadow-xl flex flex-col">
            <div className="shrink-0 flex items-center justify-between border-b border-white/5 px-4 py-3">
              <div className="flex items-center gap-2">
                <Play className="h-4 w-4 text-accent" />
                <h3 className="text-sm font-semibold text-text-primary">
                  试运行: {testModal.name}
                </h3>
                <span className="text-xs text-text-muted">
                  ({testModal.source === 'builtin' ? '内置' : '自定义'})
                </span>
              </div>
              <button
                onClick={() => setTestModal(null)}
                className="rounded p-1 text-text-muted hover:text-text-primary transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="flex items-center gap-3">
                <label className="text-xs font-semibold text-text-muted">设备类型:</label>
                <select
                  value={testDeviceType}
                  onChange={(e) => setTestDeviceType(e.target.value)}
                  className="rounded border border-white/10 bg-surface px-3 py-1.5 text-sm text-text-primary focus:border-accent focus:outline-none"
                >
                  <option value="cisco_router">Cisco 路由器</option>
                  <option value="huawei_switch">华为交换机</option>
                  <option value="linux_server">Linux 服务器</option>
                  <option value="windows_firewall">Windows 防火墙</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1.5">
                  示例配置数据 (JSON)
                </label>
                <textarea
                  value={testJson}
                  onChange={(e) => setTestJson(e.target.value)}
                  rows={6}
                  className="w-full rounded border border-white/10 bg-surface px-3 py-2 text-sm font-mono text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none resize-none"
                  placeholder='[{"type": "interface", "id": "i1", "properties": ...}]'
                />
                {testError && (
                  <p className="mt-1 text-xs text-red-400">{testError}</p>
                )}
              </div>

              <button
                onClick={handleTestRun}
                disabled={testRunning}
                className="flex items-center gap-2 rounded bg-accent px-4 py-2 text-sm font-medium text-background hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {testRunning ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                {testRunning ? '运行中...' : '试运行'}
              </button>

              {testResult && (
                <div className="space-y-3">
                  {testResult.success ? (
                    <div className="flex items-center gap-2 text-xs text-accent">
                      <CheckCircle className="h-4 w-4" />
                      渲染成功
                    </div>
                  ) : (
                    <div className="rounded border border-red-500/20 bg-red-500/5 p-3">
                      <div className="flex items-center gap-2 text-xs text-red-400 mb-1">
                        <AlertTriangle className="h-4 w-4" />
                        渲染失败
                      </div>
                      <pre className="text-xs font-mono text-red-300 whitespace-pre-wrap">
                        {testResult.error}
                      </pre>
                    </div>
                  )}

                  {testResult.warnings && testResult.warnings.length > 0 && (
                    <div className="rounded border border-yellow-500/20 bg-yellow-500/5 p-3 space-y-1">
                      <div className="flex items-center gap-2 text-xs text-yellow-400 mb-1">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {testResult.warnings.length} 个校验警告
                      </div>
                      {testResult.warnings.map((w, i) => (
                        <p key={i} className="text-xs text-yellow-300/80">
                          {w.type}: {w.message}
                        </p>
                      ))}
                    </div>
                  )}

                  {testResult.config_text && (
                    <div className="rounded border border-white/10 bg-surface p-3">
                      <label className="block text-xs font-semibold text-text-muted mb-2">
                        渲染结果
                      </label>
                      <pre className="text-xs font-mono text-text-primary whitespace-pre-wrap max-h-64 overflow-auto">
                        {testResult.config_text}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
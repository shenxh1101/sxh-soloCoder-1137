import { useEffect, useRef } from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-bash';
import 'prismjs/themes/prism-tomorrow.css';
import { useConfigStore } from '@/store/configStore';

const CISCO_KEYWORDS =
  /\b(hostname|interface|ip|address|no|shutdown|switchport|access|vlan|router|ospf|bgp|network|area|route|neighbor|remote-as|snmp-server|community|ntp|dhcp|pool|default-router|dns-server|permit|deny|any|eq|established|log)\b/g;

function highlightCisco(text: string): string {
  let html = escapeHtml(text);
  html = html.replace(CISCO_KEYWORDS, '<span class="token keyword">$&</span>');
  html = html.replace(
    /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(\/\d{1,2})?)/g,
    '<span class="token number">$&</span>'
  );
  html = html.replace(
    /(GigabitEthernet\d[\d\/\.]*|FastEthernet\d[\d\/\.]*|Loopback\d+|Vlan\d+)/g,
    '<span class="token string">$&</span>'
  );
  return html;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export default function ConfigPreview() {
  const { configText } = useConfigStore();
  const preRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (preRef.current && configText) {
      try {
        Prism.highlightElement(preRef.current);
      } catch {
        // fallback to custom highlight
      }
    }
  }, [configText]);

  if (!configText) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-text-muted">
        <div className="mb-3 rounded-full bg-white/5 p-4">
          <svg
            className="h-8 w-8 opacity-30"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <p className="text-sm">选择设备并添加配置块后</p>
        <p className="text-xs mt-1 opacity-60">点击"生成配置"查看预览</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto rounded-lg border border-white/10 bg-[#1a1b26]">
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-white/5 bg-[#1a1b26] px-4 py-2">
        <div className="flex gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-red-400/60" />
          <div className="h-2.5 w-2.5 rounded-full bg-yellow-400/60" />
          <div className="h-2.5 w-2.5 rounded-full bg-green-400/60" />
        </div>
        <span className="ml-2 text-xs text-text-muted">config-preview.txt</span>
      </div>
      <pre className="p-4 text-sm leading-relaxed font-mono overflow-auto">
        <code className="language-bash">{configText}</code>
      </pre>
    </div>
  );
}
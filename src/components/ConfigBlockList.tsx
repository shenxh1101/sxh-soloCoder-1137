import { useState } from 'react';
import { useConfigStore } from '@/store/configStore';
import { BLOCK_TYPE_LABELS, type ConfigBlock } from '@/types';
import {
  Trash2,
  Copy,
  ClipboardPaste,
  GripVertical,
  ChevronDown,
  ChevronRight,
  Tag,
  Cable,
  Route,
  Layers,
  Shield,
  Network,
  Globe,
  Wifi,
  Server,
  Clock,
  Activity,
} from 'lucide-react';

const ICONS: Record<string, typeof Tag> = {
  hostname: Tag,
  interface: Cable,
  static_route: Route,
  vlan: Layers,
  acl: Shield,
  ospf: Network,
  bgp: Globe,
  dhcp: Wifi,
  dns: Server,
  ntp: Clock,
  snmp: Activity,
};

interface BlockCardProps {
  block: ConfigBlock;
  index: number;
}

function BlockCard({ block, index }: BlockCardProps) {
  const { updateBlock, removeBlock, copyBlock } = useConfigStore();
  const [expanded, setExpanded] = useState(true);
  const IconComponent = ICONS[block.type] || Tag;
  const label = BLOCK_TYPE_LABELS[block.type as keyof typeof BLOCK_TYPE_LABELS] || block.type;

  return (
    <div className="group rounded-lg border border-white/10 bg-surface transition-all hover:border-white/20">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <GripVertical className="h-4 w-4 text-text-muted cursor-grab shrink-0" />
        <button onClick={() => setExpanded(!expanded)} className="shrink-0">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-text-secondary" />
          ) : (
            <ChevronRight className="h-4 w-4 text-text-secondary" />
          )}
        </button>
        <IconComponent className="h-4 w-4 text-accent shrink-0" />
        <span className="flex-1 text-sm font-medium text-text-primary">{label}</span>
        <span className="text-xs text-text-muted">#{index + 1}</span>
        <button
          onClick={() => copyBlock(block.id)}
          className="shrink-0 rounded p-1 text-text-muted hover:text-accent hover:bg-accent/10 opacity-0 group-hover:opacity-100 transition-all"
          title="复制"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => removeBlock(block.id)}
          className="shrink-0 rounded p-1 text-text-muted hover:text-red-400 hover:bg-red-400/10 opacity-0 group-hover:opacity-100 transition-all"
          title="删除"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {expanded && Object.keys(block.properties).length > 0 && (
        <div className="border-t border-white/5 px-3 py-2 space-y-1.5">
          {Object.entries(block.properties).map(([key, value]) => (
            <div key={key} className="flex items-center gap-2">
              <label className="text-xs text-text-muted w-24 shrink-0">{key}</label>
              <input
                type="text"
                value={String(value)}
                onChange={(e) => updateBlock(block.id, { [key]: e.target.value })}
                className="flex-1 rounded border border-white/5 bg-background px-2 py-1 text-xs text-text-primary focus:border-accent focus:outline-none"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ConfigBlockList() {
  const { configBlocks, pasteBlock, clipboard } = useConfigStore();

  if (configBlocks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-text-muted">
        <Layers className="h-8 w-8 mb-2 opacity-40" />
        <p className="text-xs">暂无配置块，请添加配置</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
          配置块 ({configBlocks.length})
        </h3>
        {clipboard && (
          <button
            onClick={pasteBlock}
            className="flex items-center gap-1 rounded bg-blue-500/10 px-2 py-1 text-xs text-blue-400 hover:bg-blue-500/20 transition-colors"
          >
            <ClipboardPaste className="h-3.5 w-3.5" />
            粘贴已复制
          </button>
        )}
      </div>

      <div className="space-y-2">
        {configBlocks.map((block, idx) => (
          <BlockCard key={block.id} block={block} index={idx} />
        ))}
      </div>
    </div>
  );
}
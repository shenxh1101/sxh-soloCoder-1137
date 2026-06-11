import { useState } from 'react';
import { useConfigStore } from '@/store/configStore';
import { BLOCK_TYPE_LABELS, type BlockType, type ConfigBlock } from '@/types';
import { Plus } from 'lucide-react';

const BLOCK_FIELDS: Record<string, { label: string; key: string; placeholder?: string }[]> = {
  hostname: [{ label: '主机名', key: 'hostname', placeholder: '例如: Core-Router-01' }],
  interface: [
    { label: '接口名称', key: 'name', placeholder: '例如: GigabitEthernet0/1' },
    { label: 'IP 地址/掩码', key: 'ip_address', placeholder: '例如: 10.0.0.1/24' },
    { label: '描述', key: 'description', placeholder: '例如: Uplink to Core' },
    { label: 'VLAN ID', key: 'vlan_id', placeholder: '例如: 10' },
    { label: '网关', key: 'gateway', placeholder: '例如: 10.0.0.254' },
  ],
  static_route: [
    { label: '目标网络', key: 'destination', placeholder: '例如: 192.168.1.0' },
    { label: '子网掩码', key: 'subnet_mask', placeholder: '例如: 255.255.255.0' },
    { label: '下一跳', key: 'next_hop', placeholder: '例如: 10.0.0.1' },
    { label: '出接口', key: 'interface', placeholder: '例如: GigabitEthernet0/1' },
  ],
  vlan: [
    { label: 'VLAN ID', key: 'vlan_id', placeholder: '例如: 10' },
    { label: '名称', key: 'name', placeholder: '例如: Management' },
  ],
  acl: [
    { label: '类型', key: 'type', placeholder: 'standard 或 extended' },
    { label: '编号', key: 'number', placeholder: '例如: 10' },
    { label: '动作', key: 'action', placeholder: 'permit 或 deny' },
    { label: '协议', key: 'protocol', placeholder: 'tcp / udp / ip' },
    { label: '源地址', key: 'source', placeholder: '例如: 192.168.1.0 0.0.0.255' },
    { label: '目标地址', key: 'destination', placeholder: '例如: any' },
  ],
  ospf: [
    { label: '进程 ID', key: 'process_id', placeholder: '例如: 1' },
    { label: 'Area', key: 'area', placeholder: '例如: 0' },
    { label: '网络 (逗号分隔)', key: 'networks', placeholder: '例如: 10.0.0.0/24' },
  ],
  bgp: [
    { label: 'AS 号', key: 'as_number', placeholder: '例如: 65001' },
    { label: '网络 (逗号分隔)', key: 'networks', placeholder: '例如: 10.0.0.0/24' },
  ],
  dhcp: [
    { label: '地址池名称', key: 'name', placeholder: '例如: LAN-Pool' },
    { label: '网络地址', key: 'network', placeholder: '例如: 192.168.1.0' },
    { label: '子网掩码', key: 'subnet_mask', placeholder: '例如: 255.255.255.0' },
    { label: '默认网关', key: 'default_router', placeholder: '例如: 192.168.1.1' },
    { label: 'DNS 服务器', key: 'dns_server', placeholder: '例如: 8.8.8.8' },
  ],
  dns: [
    { label: 'DNS 服务器', key: 'server', placeholder: '例如: 8.8.8.8' },
  ],
  ntp: [
    { label: 'NTP 服务器', key: 'server', placeholder: '例如: pool.ntp.org' },
  ],
  snmp: [
    { label: 'Community', key: 'community', placeholder: '例如: public' },
    { label: '权限', key: 'access', placeholder: 'RO 或 RW' },
  ],
};

const dsid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

interface Props {
  sid: string;
}

export default function ConfigBlockForm({ sid }: Props) {
  const { sessions, addBlock } = useConfigStore();
  const session = sessions.find((s) => s.id === sid);
  const selectedDevice = session?.deviceType || '';

  const [blockType, setBlockType] = useState<BlockType | ''>('');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [showForm, setShowForm] = useState(false);

  if (!selectedDevice) return null;

  const fieldsList = blockType ? BLOCK_FIELDS[blockType] || [] : [];

  const handleSubmit = () => {
    if (!blockType) return;
    const block: ConfigBlock = {
      type: blockType,
      id: dsid(),
      properties: { ...fields },
    };
    addBlock(sid, block);
    setBlockType('');
    setFields({});
    setShowForm(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
          添加配置块
        </h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 rounded bg-accent/10 px-2 py-1 text-xs text-accent hover:bg-accent/20 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          {showForm ? '取消' : '新增'}
        </button>
      </div>

      {showForm && (
        <div className="rounded-lg border border-white/10 bg-surface p-4 space-y-3 animate-in fade-in slide-in-from-top-2">
          <div>
            <label className="block text-xs text-text-secondary mb-1">配置类型</label>
            <select
              value={blockType}
              onChange={(e) => {
                setBlockType(e.target.value as BlockType);
                setFields({});
              }}
              className="w-full rounded border border-white/10 bg-background px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
            >
              <option value="">选择类型...</option>
              {Object.entries(BLOCK_TYPE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {fieldsList.map((field) => (
            <div key={field.key}>
              <label className="block text-xs text-text-secondary mb-1">
                {field.label}
              </label>
              <input
                type="text"
                value={fields[field.key] || ''}
                onChange={(e) =>
                  setFields((prev) => ({ ...prev, [field.key]: e.target.value }))
                }
                placeholder={field.placeholder}
                className="w-full rounded border border-white/10 bg-background px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
              />
            </div>
          ))}

          <button
            onClick={handleSubmit}
            disabled={!blockType}
            className="w-full rounded bg-accent px-3 py-2 text-sm font-medium text-background hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            添加配置块
          </button>
        </div>
      )}
    </div>
  );
}
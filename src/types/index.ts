export interface DeviceType {
  id: string;
  name: string;
  icon: string;
}

export interface ConfigBlock {
  type: string;
  id: string;
  properties: Record<string, string | number | boolean>;
}

export interface ValidationWarning {
  type: 'missing_vlan' | 'missing_interface' | 'ip_conflict' | 'unknown';
  message: string;
  block_id?: string;
}

export interface GenerateResponse {
  success: boolean;
  config_text: string;
  warnings: ValidationWarning[];
  history_id: string;
  template_used: string;
}

export interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  content: string;
  line_number_old?: number;
  line_number_new?: number;
}

export interface DiffResponse {
  diff_lines: DiffLine[];
  stats: {
    added: number;
    removed: number;
    unchanged: number;
  };
}

export interface TemplateInfo {
  id: string;
  name: string;
  device_type: string;
  source: 'builtin' | 'user';
}

export interface HistoryEntry {
  id: string;
  device_type: string;
  created_at: string;
  version: number;
}

export type BlockType =
  | 'hostname'
  | 'interface'
  | 'static_route'
  | 'vlan'
  | 'acl'
  | 'ospf'
  | 'bgp'
  | 'dhcp'
  | 'dns'
  | 'ntp'
  | 'snmp';

export const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  hostname: '主机名',
  interface: '接口配置',
  static_route: '静态路由',
  vlan: 'VLAN',
  acl: '访问控制列表',
  ospf: 'OSPF 路由',
  bgp: 'BGP 路由',
  dhcp: 'DHCP 地址池',
  dns: 'DNS 服务器',
  ntp: 'NTP 时间同步',
  snmp: 'SNMP 配置',
};

export const BLOCK_TYPE_ICONS: Record<BlockType, string> = {
  hostname: 'Tag',
  interface: 'Cable',
  static_route: 'Route',
  vlan: 'Layers',
  acl: 'Shield',
  ospf: 'Network',
  bgp: 'Globe',
  dhcp: 'Wifi',
  dns: 'Server',
  ntp: 'Clock',
  snmp: 'Activity',
};
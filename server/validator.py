from typing import List, Dict, Any


class ValidationWarning:
    def __init__(self, type: str, message: str, block_id: str = None):
        self.type = type
        self.message = message
        self.block_id = block_id


class DependencyValidator:
    def validate(
        self, device_type: str, config_blocks: List[Dict[str, Any]]
    ) -> List[ValidationWarning]:
        warnings: List[ValidationWarning] = []

        if not config_blocks:
            return warnings

        declared_vlans: Dict[str, str] = {}
        declared_interfaces: Dict[str, str] = {}
        assigned_ips: Dict[str, str] = {}

        for block in config_blocks:
            block_type = block.get('type', '')
            props = block.get('properties', {})
            block_id = block.get('id', '')

            if block_type == 'vlan':
                vlan_id = str(props.get('vlan_id', ''))
                if vlan_id:
                    declared_vlans[vlan_id] = block_id
            elif block_type == 'interface':
                iface_name = props.get('name', '')
                ip_addr = props.get('ip_address', '')
                vlan_id = str(props.get('vlan_id', ''))
                if iface_name:
                    declared_interfaces[iface_name] = block_id
                if ip_addr:
                    if ip_addr in assigned_ips:
                        warnings.append(ValidationWarning(
                            'ip_conflict',
                            f'IP 地址 {ip_addr} 已被 {assigned_ips[ip_addr]} 使用',
                            block_id,
                        ))
                    else:
                        assigned_ips[ip_addr] = block_id
                if vlan_id and vlan_id not in declared_vlans:
                    warnings.append(ValidationWarning(
                        'missing_vlan',
                        f'接口 {iface_name} 引用了未创建的 VLAN {vlan_id}',
                        block_id,
                    ))

        for block in config_blocks:
            block_type = block.get('type', '')
            props = block.get('properties', {})
            block_id = block.get('id', '')

            if block_type == 'static_route':
                interface = props.get('interface', '')
                if interface and interface not in declared_interfaces:
                    warnings.append(ValidationWarning(
                        'missing_interface',
                        f'静态路由引用了未配置的接口 {interface}',
                        block_id,
                    ))
            elif block_type == 'ospf':
                networks = props.get('networks', [])
                if isinstance(networks, str):
                    networks = [n.strip() for n in networks.split(',') if n.strip()]
                for net in networks:
                    if '/' not in net:
                        warnings.append(ValidationWarning(
                            'unknown',
                            f'OSPF 网络 {net} 缺少子网掩码',
                            block_id,
                        ))

        return warnings
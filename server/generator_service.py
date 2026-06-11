import os
from jinja2 import Environment, FileSystemLoader, BaseLoader, TemplateNotFound, TemplateSyntaxError, UndefinedError
from typing import List, Dict, Any, Optional, Tuple


class GeneratorService:
    def __init__(self):
        base_dir = os.path.dirname(__file__)
        self.template_dir = os.path.join(base_dir, 'templates')
        self.user_template_dir = os.path.join(base_dir, 'user_templates')

    def generate(
        self,
        device_type: str,
        config_blocks: List[Dict[str, Any]],
        template_id: Optional[str] = None,
    ) -> str:
        template = self._load_template(device_type, template_id)
        context = self._build_context(device_type, config_blocks)
        return template.render(**context).strip()

    def test_template(
        self,
        template_id: str,
        device_type: str,
        config_blocks: List[Dict[str, Any]],
    ) -> str:
        template = self._load_template(device_type, template_id)
        context = self._build_context(device_type, config_blocks)
        return template.render(**context).strip()

    def _load_template(self, device_type: str, template_id: Optional[str] = None):
        if template_id and template_id.startswith('user:'):
            loader = FileSystemLoader(self.user_template_dir)
            env = Environment(loader=loader, trim_blocks=True, lstrip_blocks=True)
            filename = template_id.replace('user:', '')
            return env.get_template(filename)
        else:
            loader = FileSystemLoader(self.template_dir)
            env = Environment(loader=loader, trim_blocks=True, lstrip_blocks=True)
            try:
                return env.get_template(f'{device_type}/default.j2')
            except TemplateNotFound:
                return env.from_string('')

    def _build_context(
        self, device_type: str, config_blocks: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        context: Dict[str, Any] = {
            'device_type': device_type,
            'hostname': '',
            'interfaces': [],
            'static_routes': [],
            'vlans': [],
            'acls': [],
            'ospf': None,
            'bgp': None,
            'dhcp_pools': [],
            'dns_servers': [],
            'ntp_servers': [],
            'snmp': None,
        }

        for block in config_blocks:
            block_type = block.get('type', '')
            props = block.get('properties', {})

            if block_type == 'hostname':
                context['hostname'] = props.get('hostname', '')
            elif block_type == 'interface':
                context['interfaces'].append(props)
            elif block_type == 'static_route':
                context['static_routes'].append(props)
            elif block_type == 'vlan':
                context['vlans'].append(props)
            elif block_type == 'acl':
                context['acls'].append(props)
            elif block_type == 'ospf':
                context['ospf'] = props
            elif block_type == 'bgp':
                context['bgp'] = props
            elif block_type == 'dhcp':
                context['dhcp_pools'].append(props)
            elif block_type == 'dns':
                context['dns_servers'].append(props)
            elif block_type == 'ntp':
                context['ntp_servers'].append(props)
            elif block_type == 'snmp':
                context['snmp'] = props

        return context
import os
import re
import uuid
from typing import List, Dict, Optional


class TemplateService:
    def __init__(self):
        base_dir = os.path.dirname(__file__)
        self.template_dir = os.path.join(base_dir, 'templates')
        self.user_template_dir = os.path.join(base_dir, 'user_templates')
        os.makedirs(self.user_template_dir, exist_ok=True)

    def _read_user_template_device_type(self, filename: str) -> str:
        filepath = os.path.join(self.user_template_dir, filename)
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            match = re.search(r'\{#\s*device_type:\s*(\w+)\s*#\}', content)
            if match:
                return match.group(1)
        except Exception:
            pass
        return ''

    def list_templates(self) -> List[Dict]:
        templates = []
        for device_type in os.listdir(self.template_dir):
            device_path = os.path.join(self.template_dir, device_type)
            if os.path.isdir(device_path):
                for filename in os.listdir(device_path):
                    if filename.endswith('.j2'):
                        template_id = f'{device_type}/{filename}'
                        templates.append({
                            'id': template_id,
                            'name': filename,
                            'device_type': device_type,
                            'source': 'builtin',
                        })

        for filename in os.listdir(self.user_template_dir):
            if filename.endswith('.j2'):
                template_id = f'user:{filename}'
                dt = self._read_user_template_device_type(filename)
                templates.append({
                    'id': template_id,
                    'name': filename,
                    'device_type': dt,
                    'source': 'user',
                })

        return templates

    def get_template_content(self, template_id: str) -> Optional[str]:
        if template_id.startswith('user:'):
            filename = template_id.replace('user:', '')
            filepath = os.path.join(self.user_template_dir, filename)
        else:
            filepath = os.path.join(self.template_dir, template_id)

        if os.path.exists(filepath):
            with open(filepath, 'r', encoding='utf-8') as f:
                return f.read()
        return None

    def save_user_template(self, file, device_type: str) -> str:
        unique_name = f'{uuid.uuid4().hex[:8]}_{file.filename}'
        filepath = os.path.join(self.user_template_dir, unique_name)
        file.save(filepath)

        with open(filepath, 'a', encoding='utf-8') as f:
            f.write(f'\n{{# device_type: {device_type} #}}\n')

        return f'user:{unique_name}'

    def delete_template(self, template_id: str) -> bool:
        if not template_id.startswith('user:'):
            return False
        filename = template_id.replace('user:', '')
        filepath = os.path.join(self.user_template_dir, filename)
        if os.path.exists(filepath):
            os.remove(filepath)
            return True
        return False
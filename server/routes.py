import uuid
import json
import os
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, send_file
from pydantic import BaseModel, Field, ValidationError
from typing import Optional, List, Dict, Any

from server.generator_service import GeneratorService
from server.template_service import TemplateService
from server.diff_service import DiffService
from server.validator import DependencyValidator

api = Blueprint('api', __name__)

generator = GeneratorService()
template_svc = TemplateService()
diff_svc = DiffService()
validator = DependencyValidator()

HISTORY_DIR = os.path.join(os.path.dirname(__file__), 'config_history')


class ConfigBlockModel(BaseModel):
    type: str
    id: str
    properties: Dict[str, Any] = Field(default_factory=dict)


class GenerateRequestModel(BaseModel):
    device_type: str
    template_id: Optional[str] = None
    config_blocks: List[ConfigBlockModel] = Field(default_factory=list)


class ZipRequestModel(BaseModel):
    devices: List[GenerateRequestModel]
    labels: Optional[List[str]] = None
    filenames: Optional[List[str]] = None


class DiffRequestModel(BaseModel):
    old_config: str
    new_config: str


class ValidateRequestModel(BaseModel):
    device_type: str
    config_blocks: List[ConfigBlockModel] = Field(default_factory=list)


@api.route('/device-types', methods=['GET'])
def get_device_types():
    return jsonify({
        'device_types': [
            {'id': 'cisco_router', 'name': 'Cisco 路由器', 'icon': 'router'},
            {'id': 'huawei_switch', 'name': '华为交换机', 'icon': 'server'},
            {'id': 'linux_server', 'name': 'Linux 服务器', 'icon': 'monitor'},
            {'id': 'windows_firewall', 'name': 'Windows 防火墙', 'icon': 'shield'},
        ]
    })


@api.route('/templates', methods=['GET'])
def get_templates():
    templates = template_svc.list_templates()
    return jsonify({'templates': templates})


@api.route('/templates/<template_id>', methods=['GET'])
def get_template(template_id):
    content = template_svc.get_template_content(template_id)
    if content is None:
        return jsonify({'error': 'Template not found'}), 404
    return jsonify({'id': template_id, 'content': content})


@api.route('/templates/upload', methods=['POST'])
def upload_template():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    file = request.files['file']
    device_type = request.form.get('device_type', '')
    if not file.filename or not file.filename.endswith('.j2'):
        return jsonify({'error': 'Only .j2 files are allowed'}), 400
    if device_type not in ('cisco_router', 'huawei_switch', 'linux_server', 'windows_firewall'):
        return jsonify({'error': 'Invalid device type'}), 400
    template_id = template_svc.save_user_template(file, device_type)
    return jsonify({'id': template_id, 'message': 'Template uploaded successfully'})


@api.route('/templates/<template_id>', methods=['DELETE'])
def delete_template(template_id):
    if template_svc.delete_template(template_id):
        return jsonify({'message': 'Template deleted'})
    return jsonify({'error': 'Cannot delete built-in template'}), 403


@api.route('/generate', methods=['POST'])
def generate_config():
    try:
        data = GenerateRequestModel(**request.get_json())
    except ValidationError as e:
        return jsonify({'error': 'Invalid request', 'details': e.errors()}), 400

    blocks = [b.model_dump() for b in data.config_blocks]
    warnings = validator.validate(data.device_type, blocks)

    config_text = generator.generate(data.device_type, blocks, data.template_id)

    history_id = str(uuid.uuid4())
    history_entry = {
        'id': history_id,
        'device_type': data.device_type,
        'config_text': config_text,
        'config_blocks': blocks,
        'created_at': datetime.now(timezone.utc).isoformat(),
        'version': 1,
        'note': '',
    }
    os.makedirs(HISTORY_DIR, exist_ok=True)
    with open(os.path.join(HISTORY_DIR, f'{history_id}.json'), 'w', encoding='utf-8') as f:
        json.dump(history_entry, f, ensure_ascii=False, indent=2)

    return jsonify({
        'success': True,
        'config_text': config_text,
        'warnings': [w.__dict__ for w in warnings],
        'history_id': history_id,
        'template_used': data.template_id or 'default',
        'history_entry': {
            'id': history_entry['id'],
            'device_type': history_entry['device_type'],
            'created_at': history_entry['created_at'],
            'version': history_entry['version'],
            'note': history_entry['note'],
        },
    })


@api.route('/generate/zip', methods=['POST'])
def generate_zip():
    try:
        data = ZipRequestModel(**request.get_json())
    except ValidationError as e:
        return jsonify({'error': 'Invalid request', 'details': e.errors()}), 400

    import io
    import zipfile

    labels = data.labels or []
    filenames = data.filenames or []

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as zf:
        for i, device in enumerate(data.devices):
            blocks = [b.model_dump() for b in device.config_blocks]
            config_text = generator.generate(device.device_type, blocks, device.template_id)
            if i < len(filenames) and filenames[i]:
                filename = filenames[i]
            elif i < len(labels) and labels[i]:
                filename = f'{labels[i]}_{device.device_type}.txt'
            else:
                filename = f'{device.device_type}_{i+1}.txt'
            zf.writestr(filename, config_text)

    buf.seek(0)
    return send_file(
        buf,
        mimetype='application/zip',
        as_attachment=True,
        download_name='network_configs.zip',
    )


@api.route('/diff', methods=['POST'])
def diff_configs():
    try:
        data = DiffRequestModel(**request.get_json())
    except ValidationError as e:
        return jsonify({'error': 'Invalid request', 'details': e.errors()}), 400

    result = diff_svc.compare(data.old_config, data.new_config)
    return jsonify(result)


@api.route('/validate', methods=['POST'])
def validate_config():
    try:
        data = ValidateRequestModel(**request.get_json())
    except ValidationError as e:
        return jsonify({'error': 'Invalid request', 'details': e.errors()}), 400

    blocks = [b.model_dump() for b in data.config_blocks]
    warnings = validator.validate(data.device_type, blocks)
    return jsonify({
        'valid': len(warnings) == 0,
        'warnings': [w.__dict__ for w in warnings],
    })


@api.route('/history', methods=['GET'])
def get_history():
    device_filter = request.args.get('device_type', '')
    history = []
    if os.path.exists(HISTORY_DIR):
        for filename in os.listdir(HISTORY_DIR):
            if filename.endswith('.json'):
                with open(os.path.join(HISTORY_DIR, filename), 'r', encoding='utf-8') as f:
                    entry = json.load(f)
                if device_filter and entry.get('device_type', '') != device_filter:
                    continue
                history.append({
                    'id': entry['id'],
                    'device_type': entry['device_type'],
                    'created_at': entry['created_at'],
                    'version': entry.get('version', 1),
                    'note': entry.get('note', ''),
                })
    history.sort(key=lambda x: x['created_at'], reverse=True)
    return jsonify({'history': history})


@api.route('/history/<history_id>', methods=['GET'])
def get_history_entry(history_id):
    filepath = os.path.join(HISTORY_DIR, f'{history_id}.json')
    if not os.path.exists(filepath):
        return jsonify({'error': 'History entry not found'}), 404
    with open(filepath, 'r', encoding='utf-8') as f:
        entry = json.load(f)
    return jsonify({
        **entry,
        'note': entry.get('note', ''),
    })


@api.route('/history/<history_id>', methods=['PATCH'])
def update_history_entry(history_id):
    filepath = os.path.join(HISTORY_DIR, f'{history_id}.json')
    if not os.path.exists(filepath):
        return jsonify({'error': 'History entry not found'}), 404
    data = request.get_json() or {}
    with open(filepath, 'r', encoding='utf-8') as f:
        entry = json.load(f)
    if 'note' in data:
        entry['note'] = data['note']
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(entry, f, ensure_ascii=False, indent=2)
    return jsonify({'message': 'Updated', 'note': entry.get('note', '')})
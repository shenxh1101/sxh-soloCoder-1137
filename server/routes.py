import uuid
import json
import os
import re
import hashlib
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


def safe_filename(label: str) -> str:
    name = re.sub(r'[\\/:*?"<>|]', '_', label)
    name = re.sub(r'[^a-zA-Z0-9_.-]', '_', name)
    name = re.sub(r'_+', '_', name)
    name = name.strip('._-')
    return name or 'device'


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
    include_manifest: bool = False


class DiffRequestModel(BaseModel):
    old_config: str
    new_config: str


class ValidateRequestModel(BaseModel):
    device_type: str
    config_blocks: List[ConfigBlockModel] = Field(default_factory=list)


class BatchDeleteModel(BaseModel):
    ids: List[str]


class TemplateTestModel(BaseModel):
    device_type: str
    config_blocks: List[ConfigBlockModel] = Field(default_factory=list)


def _build_history_entry(device_type, config_text, blocks, note='', tag=''):
    return {
        'id': str(uuid.uuid4()),
        'device_type': device_type,
        'config_text': config_text,
        'config_blocks': blocks,
        'created_at': datetime.now(timezone.utc).isoformat(),
        'version': 1,
        'note': note,
        'tag': tag,
    }


def _history_entry_summary(entry):
    return {
        'id': entry['id'],
        'device_type': entry['device_type'],
        'created_at': entry['created_at'],
        'version': entry.get('version', 1),
        'note': entry.get('note', ''),
        'tag': entry.get('tag', ''),
    }


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


@api.route('/templates/<path:template_id>', methods=['GET'])
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


@api.route('/templates/<path:template_id>', methods=['DELETE'])
def delete_template(template_id):
    if template_svc.delete_template(template_id):
        return jsonify({'message': 'Template deleted'})
    return jsonify({'error': 'Cannot delete built-in template'}), 403


@api.route('/templates/<path:template_id>/test', methods=['POST'])
def test_template(template_id):
    content = template_svc.get_template_content(template_id)
    if content is None:
        return jsonify({'error': 'Template not found'}), 404

    try:
        data = TemplateTestModel(**request.get_json())
    except ValidationError as e:
        return jsonify({'error': 'Invalid request', 'details': e.errors()}), 400

    blocks = [b.model_dump() for b in data.config_blocks]
    warnings = validator.validate(data.device_type, blocks)

    try:
        result = generator.test_template(template_id, data.device_type, blocks)
        return jsonify({
            'success': True,
            'config_text': result,
            'warnings': [w.__dict__ for w in warnings],
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'warnings': [w.__dict__ for w in warnings],
        })


@api.route('/generate', methods=['POST'])
def generate_config():
    try:
        data = GenerateRequestModel(**request.get_json())
    except ValidationError as e:
        return jsonify({'error': 'Invalid request', 'details': e.errors()}), 400

    blocks = [b.model_dump() for b in data.config_blocks]
    warnings = validator.validate(data.device_type, blocks)

    config_text = generator.generate(data.device_type, blocks, data.template_id)

    history_entry = _build_history_entry(data.device_type, config_text, blocks)
    os.makedirs(HISTORY_DIR, exist_ok=True)
    with open(os.path.join(HISTORY_DIR, f'{history_entry["id"]}.json'), 'w', encoding='utf-8') as f:
        json.dump(history_entry, f, ensure_ascii=False, indent=2)

    return jsonify({
        'success': True,
        'config_text': config_text,
        'warnings': [w.__dict__ for w in warnings],
        'history_id': history_entry['id'],
        'template_used': data.template_id or 'default',
        'history_entry': _history_entry_summary(history_entry),
    })


@api.route('/generate/zip', methods=['POST'])
def generate_zip():
    try:
        data = ZipRequestModel(**request.get_json())
    except ValidationError as e:
        return jsonify({'error': 'Invalid request', 'details': e.errors()}), 400

    import io
    import zipfile
    import csv

    labels = data.labels or []
    filenames = data.filenames or []
    include_manifest = data.include_manifest

    used_names: Dict[str, int] = {}
    generated_files: List[Dict[str, str]] = []

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as zf:
        for i, device in enumerate(data.devices):
            blocks = [b.model_dump() for b in device.config_blocks]
            config_text = generator.generate(device.device_type, blocks, device.template_id)
            warnings = validator.validate(device.device_type, blocks)
            checksum = hashlib.sha256(config_text.encode()).hexdigest()[:16]

            if i < len(filenames) and filenames[i]:
                base_name = filenames[i]
            elif i < len(labels) and labels[i]:
                base_name = f'{safe_filename(labels[i])}_{device.device_type}.txt'
            else:
                base_name = f'{device.device_type}_{i+1}.txt'

            unique_name = base_name
            if base_name in used_names:
                used_names[base_name] += 1
                name_part, ext = os.path.splitext(base_name)
                unique_name = f'{name_part}_{used_names[base_name]}{ext}'
            else:
                used_names[base_name] = 0

            zf.writestr(unique_name, config_text)

            generated_files.append({
                'filename': unique_name,
                'label': labels[i] if i < len(labels) else '',
                'device_type': device.device_type,
                'template': device.template_id or '默认内置',
                'checksum': checksum,
                'warnings_count': len(warnings),
                'valid': len(warnings) == 0,
            })

        if include_manifest:
            manifest = io.StringIO()
            writer = csv.writer(manifest)
            writer.writerow(['文件名', '设备标签', '设备类型', '模板', '生成时间', '校验值(SHA256前16位)', '校验状态', '警告数'])
            for gf in generated_files:
                writer.writerow([
                    gf['filename'],
                    gf['label'],
                    gf['device_type'],
                    gf['template'],
                    datetime.now(timezone.utc).isoformat(),
                    gf['checksum'],
                    '通过' if gf['valid'] else '含警告',
                    gf['warnings_count'],
                ])
            zf.writestr('MANIFEST.csv', manifest.getvalue().encode('utf-8-sig'))

    buf.seek(0)
    return send_file(
        buf,
        mimetype='application/zip',
        as_attachment=True,
        download_name='network_configs.zip',
    )


@api.route('/generate/preview-zip', methods=['POST'])
def preview_zip():
    try:
        data = ZipRequestModel(**request.get_json())
    except ValidationError as e:
        return jsonify({'error': 'Invalid request', 'details': e.errors()}), 400

    labels = data.labels or []
    filenames = data.filenames or []

    used_names: Dict[str, int] = {}
    preview = []

    for i, device in enumerate(data.devices):
        if i < len(filenames) and filenames[i]:
            base_name = filenames[i]
        elif i < len(labels) and labels[i]:
            base_name = f'{safe_filename(labels[i])}_{device.device_type}.txt'
        else:
            base_name = f'{device.device_type}_{i+1}.txt'

        unique_name = base_name
        if base_name in used_names:
            used_names[base_name] += 1
            name_part, ext = os.path.splitext(base_name)
            unique_name = f'{name_part}_{used_names[base_name]}{ext}'
        else:
            used_names[base_name] = 0

        blocks = [b.model_dump() for b in device.config_blocks]
        warnings = validator.validate(device.device_type, blocks)

        preview.append({
            'filename': unique_name,
            'label': labels[i] if i < len(labels) else '',
            'device_type': device.device_type,
            'config_blocks_count': len(device.config_blocks),
            'warnings_count': len(warnings),
            'valid': len(warnings) == 0,
        })

    if data.include_manifest:
        preview.append({
            'filename': 'MANIFEST.csv',
            'label': '',
            'device_type': '',
            'config_blocks_count': 0,
            'warnings_count': 0,
            'valid': True,
            'is_manifest': True,
        })

    return jsonify({'files': preview})


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
    keyword = request.args.get('keyword', '')
    date_from = request.args.get('date_from', '')
    date_to = request.args.get('date_to', '')

    history = []
    if os.path.exists(HISTORY_DIR):
        for filename in os.listdir(HISTORY_DIR):
            if filename.endswith('.json'):
                with open(os.path.join(HISTORY_DIR, filename), 'r', encoding='utf-8') as f:
                    entry = json.load(f)
                if device_filter and entry.get('device_type', '') != device_filter:
                    continue
                if keyword:
                    note = entry.get('note', '')
                    tag_s = entry.get('tag', '')
                    if keyword.lower() not in note.lower() and keyword.lower() not in tag_s.lower():
                        continue
                if date_from:
                    created = entry.get('created_at', '')
                    if created < date_from:
                        continue
                if date_to:
                    created = entry.get('created_at', '')
                    if created > date_to + 'T23:59:59':
                        continue
                history.append(_history_entry_summary(entry))

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
        'tag': entry.get('tag', ''),
    })


@api.route('/history/<history_id>', methods=['PATCH'])
def update_history_entry(history_id):
    filepath = os.path.join(HISTORY_DIR, f'{history_id}.json')
    if not os.path.exists(filepath):
        return jsonify({'error': 'History entry not found'}), 404
    data = request.get_json() or {}
    with open(filepath, 'r', encoding='utf-8') as f:
        entry = json.load(f)
    changed = False
    if 'note' in data:
        entry['note'] = data['note']
        changed = True
    if 'tag' in data:
        entry['tag'] = data['tag']
        changed = True
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(entry, f, ensure_ascii=False, indent=2)
    return jsonify({
        'message': 'Updated',
        'note': entry.get('note', ''),
        'tag': entry.get('tag', ''),
        'id': history_id,
    })


@api.route('/history/<history_id>', methods=['DELETE'])
def delete_history_entry(history_id):
    filepath = os.path.join(HISTORY_DIR, f'{history_id}.json')
    if not os.path.exists(filepath):
        return jsonify({'error': 'History entry not found'}), 404
    os.remove(filepath)
    return jsonify({'message': 'Deleted', 'id': history_id})


@api.route('/history/batch-delete', methods=['POST'])
def batch_delete_history():
    try:
        data = BatchDeleteModel(**request.get_json())
    except ValidationError as e:
        return jsonify({'error': 'Invalid request', 'details': e.errors()}), 400

    deleted = []
    for hid in data.ids:
        filepath = os.path.join(HISTORY_DIR, f'{hid}.json')
        if os.path.exists(filepath):
            os.remove(filepath)
            deleted.append(hid)

    return jsonify({'message': f'Deleted {len(deleted)} entries', 'deleted_ids': deleted})
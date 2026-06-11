import difflib
from typing import List, Dict


class DiffLine:
    def __init__(self, type: str, content: str, line_number_old=None, line_number_new=None):
        self.type = type
        self.content = content
        self.line_number_old = line_number_old
        self.line_number_new = line_number_new


class DiffService:
    def compare(self, old_config: str, new_config: str) -> Dict:
        old_lines = old_config.splitlines(keepends=False)
        new_lines = new_config.splitlines(keepends=False)

        differ = difflib.Differ()
        diff_result = list(differ.compare(old_lines, new_lines))

        diff_lines: List[Dict] = []
        old_num = 1
        new_num = 1
        stats = {'added': 0, 'removed': 0, 'unchanged': 0}

        for line in diff_result:
            if line.startswith('  '):
                diff_lines.append({
                    'type': 'unchanged',
                    'content': line[2:],
                    'line_number_old': old_num,
                    'line_number_new': new_num,
                })
                stats['unchanged'] += 1
                old_num += 1
                new_num += 1
            elif line.startswith('- '):
                diff_lines.append({
                    'type': 'removed',
                    'content': line[2:],
                    'line_number_old': old_num,
                    'line_number_new': None,
                })
                stats['removed'] += 1
                old_num += 1
            elif line.startswith('+ '):
                diff_lines.append({
                    'type': 'added',
                    'content': line[2:],
                    'line_number_old': None,
                    'line_number_new': new_num,
                })
                stats['added'] += 1
                new_num += 1
            elif line.startswith('? '):
                pass

        return {
            'diff_lines': diff_lines,
            'stats': stats,
        }
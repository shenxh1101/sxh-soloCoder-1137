import { useConfigStore } from '@/store/configStore';
import type { ValidationWarning } from '@/types';
import { AlertTriangle, X } from 'lucide-react';

export default function WarningPanel() {
  const { warnings } = useConfigStore();

  if (warnings.length === 0) return null;

  const byBlock: Record<string, ValidationWarning[]> = {};
  warnings.forEach((w) => {
    const key = w.block_id || 'unknown';
    if (!byBlock[key]) byBlock[key] = [];
    byBlock[key].push(w);
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-yellow-400" />
        <span className="text-sm font-semibold text-yellow-400">
          依赖检查警告 ({warnings.length})
        </span>
      </div>
      <div className="space-y-2">
        {Object.entries(byBlock).map(([blockId, ws]) => (
          <div
            key={blockId}
            className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3"
          >
            {ws.map((w, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-yellow-400/90">
                <span className="mt-0.5 shrink-0">&#9679;</span>
                <span>{w.message}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
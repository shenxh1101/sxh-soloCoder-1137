import { useConfigStore } from '@/store/configStore';
import type { DeviceType } from '@/types';
import { Server, Monitor, Shield, Router } from 'lucide-react';

const iconMap: Record<string, typeof Router> = {
  router: Router,
  server: Server,
  monitor: Monitor,
  shield: Shield,
};

interface Props {
  sid: string;
}

export default function DeviceSelector({ sid }: Props) {
  const { deviceTypes, sessions, setDeviceType } = useConfigStore();
  const session = sessions.find((s) => s.id === sid);
  const selectedDevice = session?.deviceType || '';

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {deviceTypes.map((dt: DeviceType) => {
        const IconComponent = iconMap[dt.icon] || Server;
        const isSelected = selectedDevice === dt.id;

        return (
          <button
            key={dt.id}
            onClick={() => setDeviceType(sid, dt.id)}
            className={`relative flex flex-col items-center gap-2 rounded-lg border px-3 py-4 transition-all duration-200 ${
              isSelected
                ? 'border-accent bg-accent/10 shadow-[0_0_12px_rgba(6,214,160,0.3)]'
                : 'border-white/10 bg-surface hover:border-white/20 hover:bg-white/5'
            }`}
          >
            <IconComponent
              className={`h-7 w-7 transition-colors ${
                isSelected ? 'text-accent' : 'text-text-secondary'
              }`}
            />
            <span
              className={`text-xs font-medium ${
                isSelected ? 'text-accent' : 'text-text-secondary'
              }`}
            >
              {dt.name}
            </span>
            {isSelected && (
              <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-accent shadow-[0_0_6px_rgba(6,214,160,0.6)]" />
            )}
          </button>
        );
      })}
    </div>
  );
}
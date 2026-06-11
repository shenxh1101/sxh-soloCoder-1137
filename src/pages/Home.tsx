import { useEffect } from 'react';
import DeviceSelector from '@/components/DeviceSelector';
import ConfigBlockForm from '@/components/ConfigBlockForm';
import ConfigBlockList from '@/components/ConfigBlockList';
import ConfigPreview from '@/components/ConfigPreview';
import WarningPanel from '@/components/WarningPanel';
import ExportBar from '@/components/ExportBar';
import { useConfigStore } from '@/store/configStore';

export default function Home() {
  const { loadDeviceTypes } = useConfigStore();

  useEffect(() => {
    loadDeviceTypes();
  }, [loadDeviceTypes]);

  return (
    <div className="flex h-[calc(100vh-3rem)]">
      <div className="flex w-full flex-col lg:flex-row">
        <div className="flex flex-col gap-4 overflow-y-auto border-r border-white/5 bg-surface/30 p-4 w-full lg:w-[400px] lg:min-w-[360px]">
          <div>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-text-muted">
              选择设备
            </h2>
            <DeviceSelector />
          </div>

          <div className="border-t border-white/5 pt-4">
            <ConfigBlockForm />
          </div>

          <div className="border-t border-white/5 pt-4 flex-1 overflow-y-auto">
            <ConfigBlockList />
          </div>

          <div className="border-t border-white/5 pt-3">
            <WarningPanel />
          </div>

          <div className="border-t border-white/5 pt-3">
            <ExportBar />
          </div>
        </div>

        <div className="flex-1 p-4 min-h-0">
          <ConfigPreview />
        </div>
      </div>
    </div>
  );
}
import { create } from 'zustand';
import type { ConfigBlock, DeviceType, ValidationWarning } from '@/types';

const API_BASE = '/api';

async function apiPost<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

interface ConfigState {
  deviceTypes: DeviceType[];
  selectedDevice: string;
  configBlocks: ConfigBlock[];
  configText: string;
  warnings: ValidationWarning[];
  clipboard: ConfigBlock | null;
  historyId: string | null;
  templateId: string | null;
  isLoading: boolean;

  setSelectedDevice: (device: string) => void;
  setTemplateId: (id: string | null) => void;
  addBlock: (block: ConfigBlock) => void;
  updateBlock: (id: string, props: Record<string, string | number | boolean>) => void;
  removeBlock: (id: string) => void;
  copyBlock: (id: string) => void;
  pasteBlock: () => void;
  moveBlock: (fromIndex: number, toIndex: number) => void;
  generate: () => Promise<void>;
  validateOnly: () => Promise<ValidationWarning[]>;
  loadDeviceTypes: () => Promise<void>;
  clearAll: () => void;
  loadConfigText: (text: string) => void;
}

const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const useConfigStore = create<ConfigState>((set, get) => ({
  deviceTypes: [],
  selectedDevice: '',
  configBlocks: [],
  configText: '',
  warnings: [],
  clipboard: null,
  historyId: null,
  templateId: null,
  isLoading: false,

  setSelectedDevice: (device) => set({ selectedDevice: device, configText: '', warnings: [] }),
  setTemplateId: (id) => set({ templateId: id }),

  addBlock: (block) =>
    set((state) => ({
      configBlocks: [...state.configBlocks, block],
    })),

  updateBlock: (id, props) =>
    set((state) => ({
      configBlocks: state.configBlocks.map((b) =>
        b.id === id ? { ...b, properties: { ...b.properties, ...props } } : b
      ),
    })),

  removeBlock: (id) =>
    set((state) => ({
      configBlocks: state.configBlocks.filter((b) => b.id !== id),
    })),

  copyBlock: (id) => {
    const block = get().configBlocks.find((b) => b.id === id);
    if (block) {
      set({ clipboard: { ...block, id: generateId() } });
    }
  },

  pasteBlock: () => {
    const { clipboard } = get();
    if (clipboard) {
      const newBlock = { ...clipboard, id: generateId() };
      set((state) => ({
        configBlocks: [...state.configBlocks, newBlock],
      }));
    }
  },

  moveBlock: (fromIndex, toIndex) =>
    set((state) => {
      const blocks = [...state.configBlocks];
      const [removed] = blocks.splice(fromIndex, 1);
      blocks.splice(toIndex, 0, removed);
      return { configBlocks: blocks };
    }),

  generate: async () => {
    const { selectedDevice, configBlocks, templateId } = get();
    if (!selectedDevice) return;
    set({ isLoading: true });
    try {
      const result = await apiPost<{
        success: boolean;
        config_text: string;
        warnings: ValidationWarning[];
        history_id: string;
      }>('/generate', {
        device_type: selectedDevice,
        template_id: templateId,
        config_blocks: configBlocks,
      });
      set({
        configText: result.config_text,
        warnings: result.warnings,
        historyId: result.history_id,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  validateOnly: async () => {
    const { selectedDevice, configBlocks } = get();
    try {
      const result = await apiPost<{ valid: boolean; warnings: ValidationWarning[] }>(
        '/validate',
        { device_type: selectedDevice, config_blocks: configBlocks }
      );
      set({ warnings: result.warnings });
      return result.warnings;
    } catch {
      return [];
    }
  },

  loadDeviceTypes: async () => {
    try {
      const data = await apiGet<{ device_types: DeviceType[] }>('/device-types');
      set({ deviceTypes: data.device_types });
    } catch {
      // keep defaults
    }
  },

  clearAll: () =>
    set({
      configBlocks: [],
      configText: '',
      warnings: [],
      historyId: null,
      templateId: null,
    }),

  loadConfigText: (text) => set({ configText: text }),
}));
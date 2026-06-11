import { create } from 'zustand';
import type {
  ConfigBlock,
  DeviceType,
  TemplateInfo,
  ValidationWarning,
  DeviceSession,
  HistoryEntry,
  FullHistoryEntry,
} from '@/types';

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

const dsid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

function defaultSession(label: string): DeviceSession {
  return {
    id: dsid(),
    label,
    deviceType: '',
    configBlocks: [],
    configText: '',
    warnings: [],
    templateId: null,
    historyId: null,
    isLoading: false,
  };
}

interface ConfigState {
  deviceTypes: DeviceType[];
  templates: TemplateInfo[];
  sessions: DeviceSession[];
  activeSessionId: string | null;
  clipboard: ConfigBlock | null;
  history: HistoryEntry[];

  loadDeviceTypes: () => Promise<void>;
  loadTemplates: () => Promise<void>;
  loadHistory: () => Promise<void>;

  addSession: () => void;
  removeSession: (sid: string) => void;
  setActiveSession: (sid: string) => void;
  renameSession: (sid: string, label: string) => void;

  getActiveSession: () => DeviceSession | undefined;
  getSession: (sid: string) => DeviceSession | undefined;

  setDeviceType: (sid: string, dt: string) => void;
  setTemplateId: (sid: string, tid: string | null) => void;

  addBlock: (sid: string, block: ConfigBlock) => void;
  updateBlock: (sid: string, bid: string, props: Record<string, string | number | boolean>) => void;
  removeBlock: (sid: string, bid: string) => void;
  copyBlock: (sid: string, bid: string) => void;
  pasteBlock: (sid: string) => void;

  generate: (sid: string) => Promise<void>;
  validateOnly: (sid: string) => Promise<ValidationWarning[]>;
  importConfigToDiff: (sid: string, side: 'old' | 'new') => void;
}

const activeSid = (get: () => ConfigState) => {
  const { sessions, activeSessionId } = get();
  if (activeSessionId && sessions.find((s) => s.id === activeSessionId)) {
    return activeSessionId;
  }
  if (sessions.length > 0) {
    return sessions[0].id;
  }
  return null;
};

export const useConfigStore = create<ConfigState>((set, get) => ({
  deviceTypes: [],
  templates: [],
  sessions: [defaultSession('设备 1')],
  activeSessionId: null,
  clipboard: null,
  history: [],

  loadDeviceTypes: async () => {
    try {
      const data = await apiGet<{ device_types: DeviceType[] }>('/device-types');
      set({ deviceTypes: data.device_types });
    } catch {
      // ignore
    }
  },

  loadTemplates: async () => {
    try {
      const data = await apiGet<{ templates: TemplateInfo[] }>('/templates');
      set({ templates: data.templates });
    } catch {
      // ignore
    }
  },

  loadHistory: async () => {
    try {
      const data = await apiGet<{ history: HistoryEntry[] }>('/history');
      set({ history: data.history });
    } catch {
      // ignore
    }
  },

  addSession: () => {
    const idx = get().sessions.length + 1;
    const session = defaultSession(`设备 ${idx}`);
    set((s) => ({
      sessions: [...s.sessions, session],
      activeSessionId: session.id,
    }));
  },

  removeSession: (sid) => {
    set((s) => {
      const filtered = s.sessions.filter((d) => d.id !== sid);
      if (filtered.length === 0) {
        const fallback = defaultSession('设备 1');
        return { sessions: [fallback], activeSessionId: fallback.id };
      }
      const nextActive =
        s.activeSessionId === sid ? filtered[0].id : s.activeSessionId;
      return { sessions: filtered, activeSessionId: nextActive };
    });
  },

  setActiveSession: (sid) => set({ activeSessionId: sid }),

  renameSession: (sid, label) =>
    set((s) => ({
      sessions: s.sessions.map((d) => (d.id === sid ? { ...d, label } : d)),
    })),

  getActiveSession: () => {
    const sid = activeSid(get);
    if (!sid) return undefined;
    return get().sessions.find((s) => s.id === sid);
  },

  getSession: (sid) => get().sessions.find((s) => s.id === sid),

  setDeviceType: (sid, dt) =>
    set((s) => ({
      sessions: s.sessions.map((d) =>
        d.id === sid ? { ...d, deviceType: dt, configText: '', warnings: [], templateId: null } : d
      ),
    })),

  setTemplateId: (sid, tid) =>
    set((s) => ({
      sessions: s.sessions.map((d) =>
        d.id === sid ? { ...d, templateId: tid } : d
      ),
    })),

  addBlock: (sid, block) =>
    set((s) => ({
      sessions: s.sessions.map((d) =>
        d.id === sid ? { ...d, configBlocks: [...d.configBlocks, block] } : d
      ),
    })),

  updateBlock: (sid, bid, props) =>
    set((s) => ({
      sessions: s.sessions.map((d) =>
        d.id === sid
          ? {
              ...d,
              configBlocks: d.configBlocks.map((b) =>
                b.id === bid ? { ...b, properties: { ...b.properties, ...props } } : b
              ),
            }
          : d
      ),
    })),

  removeBlock: (sid, bid) =>
    set((s) => ({
      sessions: s.sessions.map((d) =>
        d.id === sid
          ? { ...d, configBlocks: d.configBlocks.filter((b) => b.id !== bid) }
          : d
      ),
    })),

  copyBlock: (sid, bid) => {
    const ses = get().sessions.find((d) => d.id === sid);
    const block = ses?.configBlocks.find((b) => b.id === bid);
    if (block) {
      set({ clipboard: { ...block, id: dsid() } });
    }
  },

  pasteBlock: (sid) => {
    const { clipboard } = get();
    if (clipboard) {
      const newBlock = { ...clipboard, id: dsid() };
      set((s) => ({
        sessions: s.sessions.map((d) =>
          d.id === sid ? { ...d, configBlocks: [...d.configBlocks, newBlock] } : d
        ),
      }));
    }
  },

  generate: async (sid) => {
    const ses = get().sessions.find((d) => d.id === sid);
    if (!ses || !ses.deviceType) return;
    set((s) => ({
      sessions: s.sessions.map((d) =>
        d.id === sid ? { ...d, isLoading: true } : d
      ),
    }));
    try {
      const result = await apiPost<{
        success: boolean;
        config_text: string;
        warnings: ValidationWarning[];
        history_id: string;
        template_used: string;
      }>('/generate', {
        device_type: ses.deviceType,
        template_id: ses.templateId,
        config_blocks: ses.configBlocks,
      });
      set((s) => ({
        sessions: s.sessions.map((d) =>
          d.id === sid
            ? {
                ...d,
                configText: result.config_text,
                warnings: result.warnings,
                historyId: result.history_id,
                isLoading: false,
              }
            : d
        ),
      }));
    } catch {
      set((s) => ({
        sessions: s.sessions.map((d) =>
          d.id === sid ? { ...d, isLoading: false } : d
        ),
      }));
    }
  },

  validateOnly: async (sid) => {
    const ses = get().sessions.find((d) => d.id === sid);
    if (!ses) return [];
    try {
      const result = await apiPost<{ valid: boolean; warnings: ValidationWarning[] }>(
        '/validate',
        {
          device_type: ses.deviceType,
          config_blocks: ses.configBlocks,
        }
      );
      set((s) => ({
        sessions: s.sessions.map((d) =>
          d.id === sid ? { ...d, warnings: result.warnings } : d
        ),
      }));
      return result.warnings;
    } catch {
      return [];
    }
  },

  importConfigToDiff: (sid, side) => {
    const ses = get().sessions.find((d) => d.id === sid);
    const text = ses?.configText || '';
    sessionStorage.setItem(`diff_${side}`, text);
  },
}));
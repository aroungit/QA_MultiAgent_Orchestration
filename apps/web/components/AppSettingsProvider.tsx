'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { EmbeddingsProvider, LlmProvider } from '@qa-agent/shared';

const STORAGE_KEY = 'qa-agent-ui-settings';

export interface AppSettings {
  llmProvider: LlmProvider;
  llmModel: string;
  embeddingsProvider: EmbeddingsProvider;
  embeddingsModel: string;
  enableHITLAutomationByDefault: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  llmProvider: 'groq',
  llmModel: '',
  embeddingsProvider: 'voyage',
  embeddingsModel: '',
  enableHITLAutomationByDefault: true,
};

const DEPRECATED_PROVIDER_MODELS: Partial<Record<LlmProvider, Set<string>>> = {
  groq: new Set(['llama-3.1-70b-versatile']),
};

function sanitizeSettings(stored: Partial<AppSettings>): AppSettings {
  const merged = { ...DEFAULT_SETTINGS, ...stored };
  const deprecatedModels = DEPRECATED_PROVIDER_MODELS[merged.llmProvider];
  if (merged.llmModel && deprecatedModels?.has(merged.llmModel)) {
    merged.llmModel = '';
  }
  return merged;
}

interface AppSettingsContextValue {
  settings: AppSettings;
  hydrated: boolean;
  updateSettings: (next: Partial<AppSettings>) => void;
}

const AppSettingsContext = createContext<AppSettingsContextValue | null>(null);

export function AppSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<AppSettings>;
        setSettings(sanitizeSettings(parsed));
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [hydrated, settings]);

  const value = useMemo<AppSettingsContextValue>(
    () => ({
      settings,
      hydrated,
      updateSettings(next) {
        setSettings((current) => ({ ...current, ...next }));
      },
    }),
    [hydrated, settings],
  );

  return <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>;
}

export function useAppSettings(): AppSettingsContextValue {
  const context = useContext(AppSettingsContext);
  if (!context) {
    throw new Error('useAppSettings must be used within AppSettingsProvider');
  }
  return context;
}
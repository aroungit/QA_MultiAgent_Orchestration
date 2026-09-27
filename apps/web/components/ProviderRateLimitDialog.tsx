'use client';

import { useEffect, useState } from 'react';
import type { LlmProvider } from '@qa-agent/shared';
import { Alert, Button, Group, Modal, Select, Stack, Text, TextInput } from '@mantine/core';
import { useAppSettings } from './AppSettingsProvider';

const PROVIDER_OPTIONS: { value: LlmProvider; label: string }[] = [
  { value: 'groq', label: 'Groq' },
  { value: 'cohere', label: 'Cohere' },
  { value: 'openrouter', label: 'OpenRouter' },
];

const DEFAULT_MODELS: Record<LlmProvider, string> = {
  groq: 'openai/gpt-oss-120b',
  cohere: 'command-r-plus',
  openrouter: 'openai/gpt-4o-mini',
};

export interface ProviderOverride {
  llmProvider: LlmProvider;
  llmModel: string;
}

export function ProviderRateLimitDialog({
  opened,
  currentProvider,
  message,
  busy = false,
  onClose,
  onConfirm,
}: {
  opened: boolean;
  currentProvider: LlmProvider;
  message: string;
  busy?: boolean;
  onClose: () => void;
  onConfirm: (override: ProviderOverride) => Promise<void> | void;
}) {
  const { updateSettings } = useAppSettings();
  const [provider, setProvider] = useState<LlmProvider>(currentProvider);
  const [model, setModel] = useState(DEFAULT_MODELS[currentProvider]);

  useEffect(() => {
    if (!opened) return;
    setProvider(currentProvider);
    setModel(DEFAULT_MODELS[currentProvider]);
  }, [currentProvider, opened]);

  async function handleConfirm() {
    const override = {
      llmProvider: provider,
      llmModel: model.trim() || DEFAULT_MODELS[provider],
    } satisfies ProviderOverride;

    updateSettings(override);
    await onConfirm(override);
  }

  return (
    <Modal opened={opened} onClose={onClose} title="LLM provider is rate-limited" centered>
      <Stack>
        <Alert color="yellow" title="Provider decision required">
          {message}
        </Alert>

        <Text size="sm" c="dimmed">
          Choose another configured provider and retry with a compatible model.
        </Text>

        <Select
          label="LLM provider"
          data={PROVIDER_OPTIONS}
          value={provider}
          onChange={(value) => {
            const nextProvider = (value as LlmProvider) ?? currentProvider;
            setProvider(nextProvider);
            setModel(DEFAULT_MODELS[nextProvider]);
          }}
          allowDeselect={false}
        />

        <TextInput
          label="Model"
          description="Edit this if your selected provider requires a different model name."
          value={model}
          onChange={(event) => setModel(event.currentTarget.value)}
        />

        <Group justify="flex-end">
          <Button variant="default" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void handleConfirm()} loading={busy}>
            Switch provider and retry
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
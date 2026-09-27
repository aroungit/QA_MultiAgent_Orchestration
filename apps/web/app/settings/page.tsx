'use client';

import type { EmbeddingsProvider, LlmProvider } from '@qa-agent/shared';
import { Alert, Fieldset, Group, Select, Stack, Switch, Text, TextInput, Title } from '@mantine/core';
import { useAppSettings } from '../../components/AppSettingsProvider';

export default function SettingsPage() {
  const { settings, hydrated, updateSettings } = useAppSettings();

  return (
    <Stack maw={760}>
      <div>
        <Title order={2}>Settings</Title>
        <Text c="dimmed" mt="xs">
          These preferences are stored in your browser and applied to new orchestration runs.
        </Text>
      </div>

      {!hydrated && (
        <Alert color="blue" title="Loading settings">
          Restoring saved provider preferences.
        </Alert>
      )}

      <Fieldset legend="Default LLM provider">
        <Group grow align="flex-start">
          <Select
            label="Provider"
            data={[
              { value: 'groq', label: 'Groq' },
              { value: 'cohere', label: 'Cohere' },
              { value: 'openrouter', label: 'OpenRouter' },
            ]}
            value={settings.llmProvider}
            onChange={(value) => updateSettings({ llmProvider: ((value as LlmProvider) ?? 'groq') })}
            allowDeselect={false}
          />
          <TextInput
            label="Model"
            placeholder="Use provider default"
            value={settings.llmModel}
            onChange={(event) => updateSettings({ llmModel: event.currentTarget.value })}
          />
        </Group>
      </Fieldset>

      <Fieldset legend="Default embeddings provider">
        <Group grow align="flex-start">
          <Select
            label="Provider"
            data={[
              { value: 'voyage', label: 'Voyage' },
              { value: 'jina', label: 'Jina' },
              { value: 'mistral', label: 'Mistral' },
            ]}
            value={settings.embeddingsProvider}
            onChange={(value) =>
              updateSettings({ embeddingsProvider: ((value as EmbeddingsProvider) ?? 'voyage') })
            }
            allowDeselect={false}
          />
          <TextInput
            label="Model"
            placeholder="Use provider default"
            value={settings.embeddingsModel}
            onChange={(event) => updateSettings({ embeddingsModel: event.currentTarget.value })}
          />
        </Group>
      </Fieldset>

      <Fieldset legend="Run defaults">
        <Switch
          label="Require approval before automation execution"
          description="New runs will wait for automation approval before Playwright execution starts."
          checked={settings.enableHITLAutomationByDefault}
          onChange={(event) =>
            updateSettings({ enableHITLAutomationByDefault: event.currentTarget.checked })
          }
        />
      </Fieldset>
    </Stack>
  );
}
'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Anchor,
  Button,
  FileInput,
  Group,
  Stack,
  Switch,
  Text,
  Textarea,
  Title,
} from '@mantine/core';
import { ApiError, createRun } from '../../../lib/apiClient';
import { useAppSettings } from '../../../components/AppSettingsProvider';
import { ProviderRateLimitDialog, type ProviderOverride } from '../../../components/ProviderRateLimitDialog';

const ACCEPTED_FILE_TYPES = '.md,.txt,.json,.yaml,.pdf,.docx';

export default function NewRunPage() {
  const router = useRouter();
  const { settings, hydrated } = useAppSettings();
  const [rawText, setRawText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [enableHITLAutomation, setEnableHITLAutomation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [fieldErrors, setFieldErrors] = useState<string[]>([]);
  const [rateLimitDialogOpen, setRateLimitDialogOpen] = useState(false);
  const [rateLimitMessage, setRateLimitMessage] = useState('');

  useEffect(() => {
    if (!hydrated) return;
    setEnableHITLAutomation(settings.enableHITLAutomationByDefault);
  }, [hydrated, settings.enableHITLAutomationByDefault]);

  async function submitRun(override?: ProviderOverride) {
    setSubmitting(true);
    setError(undefined);
    setFieldErrors([]);

    try {
      const detail = await createRun({
        rawText,
        config: {
          llmProvider: override?.llmProvider ?? settings.llmProvider,
          llmModel: override?.llmModel ?? (settings.llmModel || undefined),
          embeddingsProvider: settings.embeddingsProvider,
          embeddingsModel: settings.embeddingsModel || undefined,
          enableHITLAutomation,
        },
        files,
      });

      // A JEV rejection is a successful (201) response with the run marked 'failed' — surface it inline.
      if (detail.jeve?.valid === false) {
        setError('Input was rejected during validation. Please review the details below.');
        setFieldErrors(
          (detail.jeve.decisions ?? [])
            .filter((d) => d.outcome === 'reject')
            .map((d) => `${d.name.replace(/_/g, ' ')}: rejected`),
        );
        return;
      }

      setRateLimitDialogOpen(false);
      router.push(`/runs/${detail.runId}`);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 429) {
          setRateLimitMessage('The selected LLM provider is currently rate-limited. Switch provider or model and retry.');
          setRateLimitDialogOpen(true);
          return;
        }
        setError(err.status === 400 ? 'Invalid request. Please review the details below.' : err.message);
        const fieldErrs = extractFieldErrors(err.details);
        if (fieldErrs.length > 0) setFieldErrors(fieldErrs);
      } else {
        setError('Could not reach the API. Is it running?');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await submitRun();
  }

  return (
    <Stack maw={720}>
      <div>
        <Title order={2}>Start Guided Flow</Title>
        <Text c="dimmed" mt="xs">
          Submit source requirements here. Provider choices now come from your saved settings.
        </Text>
      </div>

      <Alert color="blue" title="Active provider settings">
        <Stack gap={4}>
          <Text size="sm">
            LLM: {settings.llmProvider}
            {settings.llmModel ? ` / ${settings.llmModel}` : ' / provider default'}
          </Text>
          <Text size="sm">
            Embeddings: {settings.embeddingsProvider}
            {settings.embeddingsModel ? ` / ${settings.embeddingsModel}` : ' / provider default'}
          </Text>
          <Anchor component={Link} href="/settings" size="sm">
            Change provider defaults in Settings
          </Anchor>
        </Stack>
      </Alert>

      {error && (
        <Alert color="red" title="Could not create run">
          <Stack gap={4}>
            <Text size="sm">{error}</Text>
            {fieldErrors.map((msg, idx) => (
              <Text size="sm" key={idx}>
                • {msg}
              </Text>
            ))}
          </Stack>
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Stack>
          <Textarea
            label="Requirements text"
            description="Paste raw requirements, user stories, or acceptance criteria."
            minRows={8}
            autosize
            value={rawText}
            onChange={(e) => setRawText(e.currentTarget.value)}
          />

          <FileInput
            label="Attach files (optional)"
            description={`Accepted types: ${ACCEPTED_FILE_TYPES}`}
            placeholder="Choose files"
            accept={ACCEPTED_FILE_TYPES}
            multiple
            value={files}
            onChange={setFiles}
            clearable
          />

          <Switch
            label="Require human approval before automation runs"
            description="When enabled, generated Playwright tests must be approved before execution."
            checked={enableHITLAutomation}
            onChange={(e) => setEnableHITLAutomation(e.currentTarget.checked)}
          />

          <Group justify="flex-end">
            <Button type="submit" loading={submitting} disabled={!rawText.trim() || !hydrated}>
              Submit Requirements
            </Button>
          </Group>
        </Stack>
      </form>

      <ProviderRateLimitDialog
        opened={rateLimitDialogOpen}
        currentProvider={settings.llmProvider}
        message={rateLimitMessage}
        busy={submitting}
        onClose={() => setRateLimitDialogOpen(false)}
        onConfirm={(override) => submitRun(override)}
      />
    </Stack>
  );
}

function extractFieldErrors(details: unknown): string[] {
  if (!details || typeof details !== 'object') return [];
  const flattenErrors = (details as { details?: { fieldErrors?: Record<string, string[]> } }).details?.fieldErrors;
  if (flattenErrors) {
    return Object.entries(flattenErrors).flatMap(([field, msgs]) => msgs.map((m) => `${field}: ${m}`));
  }
  return [];
}

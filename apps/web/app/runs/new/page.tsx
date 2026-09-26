'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { EmbeddingsProvider, LlmProvider } from '@qa-agent/shared';
import {
  Alert,
  Button,
  Fieldset,
  FileInput,
  Group,
  Select,
  Stack,
  Switch,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core';
import { ApiError, createRun } from '../../../lib/apiClient';

const ACCEPTED_FILE_TYPES = '.md,.txt,.json,.yaml,.pdf,.docx';

export default function NewRunPage() {
  const router = useRouter();
  const [rawText, setRawText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [llmProvider, setLlmProvider] = useState<LlmProvider>('groq');
  const [llmModel, setLlmModel] = useState('');
  const [embeddingsProvider, setEmbeddingsProvider] = useState<EmbeddingsProvider>('voyage');
  const [embeddingsModel, setEmbeddingsModel] = useState('');
  const [enableHITLAutomation, setEnableHITLAutomation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [fieldErrors, setFieldErrors] = useState<string[]>([]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(undefined);
    setFieldErrors([]);

    try {
      const detail = await createRun({
        rawText,
        config: {
          llmProvider,
          llmModel: llmModel || undefined,
          embeddingsProvider,
          embeddingsModel: embeddingsModel || undefined,
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

      router.push(`/runs/${detail.runId}`);
    } catch (err) {
      if (err instanceof ApiError) {
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

  return (
    <Stack maw={720}>
      <Title order={2}>New Run</Title>

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

          <Fieldset legend="LLM provider">
            <Group grow>
              <Select
                label="Provider"
                data={[
                  { value: 'groq', label: 'Groq' },
                  { value: 'cohere', label: 'Cohere' },
                  { value: 'openrouter', label: 'OpenRouter' },
                ]}
                value={llmProvider}
                onChange={(value) => setLlmProvider((value as LlmProvider) ?? 'groq')}
                allowDeselect={false}
              />
              <TextInput
                label="Model"
                placeholder="Provider default"
                value={llmModel}
                onChange={(e) => setLlmModel(e.currentTarget.value)}
              />
            </Group>
          </Fieldset>

          <Fieldset legend="Embeddings provider">
            <Group grow>
              <Select
                label="Provider"
                data={[
                  { value: 'voyage', label: 'Voyage' },
                  { value: 'jina', label: 'Jina' },
                  { value: 'mistral', label: 'Mistral' },
                ]}
                value={embeddingsProvider}
                onChange={(value) => setEmbeddingsProvider((value as EmbeddingsProvider) ?? 'voyage')}
                allowDeselect={false}
              />
              <TextInput
                label="Model"
                placeholder="Provider default"
                value={embeddingsModel}
                onChange={(e) => setEmbeddingsModel(e.currentTarget.value)}
              />
            </Group>
          </Fieldset>

          <Switch
            label="Require human approval before automation runs"
            description="When enabled, generated Playwright tests must be approved before execution."
            checked={enableHITLAutomation}
            onChange={(e) => setEnableHITLAutomation(e.currentTarget.checked)}
          />

          <Group justify="flex-end">
            <Button type="submit" loading={submitting} disabled={!rawText.trim()}>
              Create Run
            </Button>
          </Group>
        </Stack>
      </form>
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

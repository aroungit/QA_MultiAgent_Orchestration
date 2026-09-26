'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Alert,
  Anchor,
  Badge,
  Button,
  Card,
  Code,
  Group,
  Loader,
  Modal,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import type { HitlPhase } from '@qa-agent/shared';
import { ApiError, artifactUrl, getRun, submitHitlDecision, type RunDetailResponse } from '../lib/apiClient';

const POLL_INTERVAL_MS = 3000;
const ACTIVE_STATUSES = new Set(['created', 'running', 'waiting_hitl']);

const STATUS_COLORS: Record<string, string> = {
  created: 'blue',
  running: 'blue',
  waiting_hitl: 'yellow',
  completed: 'green',
  failed: 'red',
  rejected: 'red',
};

export function RunDetailView({ runId, initial }: { runId: string; initial: RunDetailResponse }) {
  const [detail, setDetail] = useState(initial);
  const [refreshError, setRefreshError] = useState<string | undefined>();

  const refresh = useCallback(async () => {
    try {
      const next = await getRun(runId);
      setDetail(next);
      setRefreshError(undefined);
    } catch {
      setRefreshError('Lost connection to the API while polling for updates.');
    }
  }, [runId]);

  useEffect(() => {
    if (!ACTIVE_STATUSES.has(detail.status)) return;
    const timer = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [detail.status, refresh]);

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>Run {runId}</Title>
        <Group gap="xs">
          <Badge color={STATUS_COLORS[detail.status] ?? 'gray'}>{detail.status}</Badge>
          {detail.currentPhase && <Badge variant="outline">{detail.currentPhase}</Badge>}
          {ACTIVE_STATUSES.has(detail.status) && <Loader size="xs" />}
        </Group>
      </Group>

      {refreshError && (
        <Alert color="yellow" title="Polling issue">
          {refreshError}
        </Alert>
      )}

      {detail.jeve?.valid === false && (
        <Alert color="red" title="Input rejected by validation">
          <Stack gap={4}>
            {(detail.jeve.decisions ?? [])
              .filter((d) => d.outcome === 'reject')
              .map((d) => (
                <Text size="sm" key={d.name}>
                  • {d.name.replace(/_/g, ' ')}
                </Text>
              ))}
          </Stack>
        </Alert>
      )}

      {detail.requirements?.requirementsJsonPath && (
        <HitlPanel
          title="Requirements"
          runId={runId}
          phase="hitl_requirements"
          status={detail.status}
          currentPhase={detail.currentPhase}
          hitlStatus={detail.requirements.hitlStatus}
          links={[
            { label: 'Summary (Markdown)', type: 'requirements_summary' },
            { label: 'Requirements (JSON)', type: 'requirements_json' },
            { label: 'Requirements (Excel)', type: 'requirements_excel' },
          ]}
          onDecided={refresh}
        />
      )}

      {detail.testCases?.testCasesJsonPath && (
        <HitlPanel
          title="Test Cases"
          runId={runId}
          phase="hitl_testcases"
          status={detail.status}
          currentPhase={detail.currentPhase}
          hitlStatus={detail.testCases.hitlStatus}
          links={[
            { label: 'Summary (Markdown)', type: 'testcases_summary' },
            { label: 'Test Cases (JSON)', type: 'testcases_json' },
            { label: 'Test Cases (Excel)', type: 'testcases_excel' },
          ]}
          onDecided={refresh}
        />
      )}

      {detail.automation?.generatedTestFiles && detail.automation.generatedTestFiles.length > 0 && (
        <AutomationPanel
          runId={runId}
          status={detail.status}
          currentPhase={detail.currentPhase}
          hitlStatus={detail.automation.hitlStatus}
          files={detail.automation.generatedTestFiles}
          onDecided={refresh}
        />
      )}

      {detail.execution?.summary && <ExecutionPanel runId={runId} execution={detail.execution} />}

      {(detail.status === 'completed' || detail.status === 'failed' || detail.status === 'rejected') && (
        <Group>
          <Button component={Link} href="/runs/new" variant="light">
            Start New Run
          </Button>
        </Group>
      )}
    </Stack>
  );
}

function fileNameOf(path: string): string {
  return path.split('/').pop() ?? path;
}

function HitlPanel({
  title,
  runId,
  phase,
  status,
  currentPhase,
  hitlStatus,
  links,
  onDecided,
}: {
  title: string;
  runId: string;
  phase: HitlPhase;
  status: string;
  currentPhase: string | null;
  hitlStatus?: string;
  links: { label: string; type: string }[];
  onDecided: () => void;
}) {
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const pending = status === 'waiting_hitl' && currentPhase === phase;

  async function decide(decision: 'approved' | 'rejected') {
    setSubmitting(true);
    try {
      await submitHitlDecision(runId, phase, decision, comments || undefined);
      notifications.show({
        color: decision === 'approved' ? 'green' : 'red',
        message: `${title} ${decision}`,
      });
      onDecided();
    } catch (err) {
      notifications.show({
        color: 'red',
        title: 'Could not submit decision',
        message: err instanceof ApiError ? err.message : 'Could not reach the API.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card withBorder>
      <Stack>
        <Group justify="space-between">
          <Title order={4}>{title}</Title>
          {hitlStatus && <Badge color={hitlStatus === 'approved' ? 'green' : hitlStatus === 'rejected' ? 'red' : 'yellow'}>{hitlStatus}</Badge>}
        </Group>

        <Group>
          {links.map((link) => (
            <Anchor key={link.type} href={artifactUrl(runId, link.type)} target="_blank" rel="noreferrer">
              {link.label}
            </Anchor>
          ))}
        </Group>

        {pending && (
          <Stack>
            <Textarea
              label="Comments (optional)"
              value={comments}
              onChange={(e) => setComments(e.currentTarget.value)}
              minRows={2}
              autosize
            />
            <Group>
              <Button color="green" loading={submitting} onClick={() => decide('approved')}>
                Approve
              </Button>
              <Button color="red" variant="outline" loading={submitting} onClick={() => decide('rejected')}>
                Reject
              </Button>
            </Group>
          </Stack>
        )}
      </Stack>
    </Card>
  );
}

function AutomationPanel({
  runId,
  status,
  currentPhase,
  hitlStatus,
  files,
  onDecided,
}: {
  runId: string;
  status: string;
  currentPhase: string | null;
  hitlStatus?: string;
  files: string[];
  onDecided: () => void;
}) {
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [viewing, setViewing] = useState<string | undefined>();
  const [code, setCode] = useState<string | undefined>();
  const pending = status === 'waiting_hitl' && currentPhase === 'hitl_automation';

  async function viewFile(filePath: string) {
    setViewing(filePath);
    setCode(undefined);
    try {
      const res = await fetch(artifactUrl(runId, 'test_file', fileNameOf(filePath)));
      setCode(await res.text());
    } catch {
      setCode('Could not load file content.');
    }
  }

  async function decide(decision: 'approved' | 'rejected') {
    setSubmitting(true);
    try {
      await submitHitlDecision(runId, 'hitl_automation', decision, comments || undefined);
      notifications.show({ color: decision === 'approved' ? 'green' : 'red', message: `Automation ${decision}` });
      onDecided();
    } catch (err) {
      notifications.show({
        color: 'red',
        title: 'Could not submit decision',
        message: err instanceof ApiError ? err.message : 'Could not reach the API.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card withBorder>
      <Stack>
        <Group justify="space-between">
          <Title order={4}>Automation (Playwright)</Title>
          {hitlStatus && <Badge color={hitlStatus === 'approved' ? 'green' : hitlStatus === 'rejected' ? 'red' : 'yellow'}>{hitlStatus}</Badge>}
        </Group>

        <Stack gap={4}>
          {files.map((f) => (
            <Anchor key={f} component="button" type="button" onClick={() => viewFile(f)}>
              {fileNameOf(f)}
            </Anchor>
          ))}
        </Stack>

        {pending && (
          <Stack>
            <Textarea
              label="Comments (optional)"
              value={comments}
              onChange={(e) => setComments(e.currentTarget.value)}
              minRows={2}
              autosize
            />
            <Group>
              <Button color="green" loading={submitting} onClick={() => decide('approved')}>
                Approve
              </Button>
              <Button color="red" variant="outline" loading={submitting} onClick={() => decide('rejected')}>
                Reject
              </Button>
            </Group>
          </Stack>
        )}
      </Stack>

      <Modal opened={!!viewing} onClose={() => setViewing(undefined)} title={viewing ? fileNameOf(viewing) : ''} size="xl">
        {code === undefined ? <Loader /> : <Code block>{code}</Code>}
      </Modal>
    </Card>
  );
}

function ExecutionPanel({ runId, execution }: { runId: string; execution: NonNullable<RunDetailResponse['execution']> }) {
  const summary = execution.summary!;
  return (
    <Card withBorder>
      <Stack>
        <Title order={4}>Execution Results</Title>
        <SimpleGrid cols={3}>
          <SummaryCard label="Total" value={summary.total} color="blue" />
          <SummaryCard label="Passed" value={summary.passed} color="green" />
          <SummaryCard label="Failed" value={summary.failed} color="red" />
        </SimpleGrid>
        <Group>
          {execution.reportHtmlPath && (
            <Anchor href={artifactUrl(runId, 'report_html')} target="_blank" rel="noreferrer">
              HTML Report
            </Anchor>
          )}
          {execution.reportAllurePath && (
            <Anchor href={artifactUrl(runId, 'report_allure')} target="_blank" rel="noreferrer">
              Allure Report
            </Anchor>
          )}
          {execution.reportJsonPath && (
            <Anchor href={artifactUrl(runId, 'report_json')} target="_blank" rel="noreferrer">
              JSON Report
            </Anchor>
          )}
          {execution.reportJunitPath && (
            <Anchor href={artifactUrl(runId, 'report_junit')} target="_blank" rel="noreferrer">
              JUnit XML
            </Anchor>
          )}
        </Group>
      </Stack>
    </Card>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Card withBorder padding="sm">
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      <Text size="xl" fw={700} c={color}>
        {value}
      </Text>
    </Card>
  );
}

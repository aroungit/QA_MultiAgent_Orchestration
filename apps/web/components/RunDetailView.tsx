'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Accordion,
  Alert,
  Anchor,
  Badge,
  Box,
  Button,
  Card,
  Code,
  Flex,
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
import type { HitlDecisionRequest, HitlPhase, LlmProvider, RegenerationHistoryEntry } from '@qa-agent/shared';
import {
  ApiError,
  artifactUrl,
  getRun,
  submitHitlDecision,
  type RequirementsDocument,
  type RunDetailResponse,
  type TestCasesDocument,
} from '../lib/apiClient';
import { ProviderRateLimitDialog, type ProviderOverride } from './ProviderRateLimitDialog';

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

const FLOW_STAGES = [
  {
    key: 'intake',
    title: 'Intake and validation',
    agent: 'System + JEV gate',
    detail: 'Source input is normalized and checked before any generation work begins.',
    phases: ['ingest_input', 'jeve_validate'],
  },
  {
    key: 'requirements',
    title: 'Requirements review',
    agent: 'Agent 1',
    detail: 'Structured requirements are created and paused for human review.',
    phases: ['agent1_requirements', 'hitl_requirements'],
  },
  {
    key: 'testcases',
    title: 'Test case review',
    agent: 'Agent 2',
    detail: 'Traceable test cases are generated and approved before automation.',
    phases: ['agent2_testcases', 'hitl_testcases'],
  },
  {
    key: 'automation',
    title: 'Automation approval',
    agent: 'Agent 3',
    detail: 'Playwright specs are generated and optionally approved before execution.',
    phases: ['agent3_automation', 'hitl_automation'],
  },
  {
    key: 'execution',
    title: 'Execution and reports',
    agent: 'Executor',
    detail: 'Approved scripts run and reports, logs, and evidence are attached to the run.',
    phases: ['execute_tests', 'finalize_run'],
  },
] as const;

type PreviewKind = 'requirements' | 'testcases';
type DetailSectionKey = 'requirements' | 'testcases' | 'automation' | 'execution';

export function RunDetailView({ runId, initial }: { runId: string; initial: RunDetailResponse }) {
  const [detail, setDetail] = useState(initial);
  const [refreshError, setRefreshError] = useState<string | undefined>();
  const [expandedSection, setExpandedSection] = useState<DetailSectionKey | null>(() => getPreferredDetailSection(initial));

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

  useEffect(() => {
    const preferredSection = getPreferredDetailSection(detail);
    if (preferredSection) {
      setExpandedSection(preferredSection);
    }
  }, [
    detail.status,
    detail.currentPhase,
    detail.requirements?.requirementsJsonPath,
    detail.testCases?.testCasesJsonPath,
    detail.automation?.generatedTestFiles?.length,
    detail.execution?.summary?.total,
    detail.execution?.summary?.passed,
    detail.execution?.summary?.failed,
  ]);

  return (
    <Stack>
      <Group justify="space-between">
        <div>
          <Title order={2}>QA review workflow</Title>
          <Text c="dimmed" mt="xs">
            Current orchestration run
          </Text>
          <Text size="sm" c="dimmed">
            Run reference: {runId}
          </Text>
        </div>
        <Group gap="xs" align="flex-start">
          <Button component={Link} href="/trends" variant="default">
            Trend Dashboard
          </Button>
          <Badge color={STATUS_COLORS[detail.status] ?? 'gray'}>{detail.status}</Badge>
          {detail.currentPhase && <Badge variant="outline">{detail.currentPhase}</Badge>}
          {ACTIVE_STATUSES.has(detail.status) && <Loader size="xs" />}
        </Group>
      </Group>

      <Flex gap="sm" wrap="wrap" align="stretch">
        {FLOW_STAGES.map((stage, index) => {
          const stageState = getStageState(detail.currentPhase, detail.status, stage.phases, index);
          return (
            <Group key={stage.key} gap="sm" align="stretch" wrap="nowrap" style={{ flex: '1 1 220px' }}>
              <Card
                withBorder
                padding="md"
                style={{
                  flex: 1,
                  minWidth: 0,
                  borderColor:
                    stageState === 'active' ? 'var(--mantine-color-cyan-6)' : 'var(--mantine-color-gray-3)',
                }}
              >
                <Stack gap={6}>
                  <Group justify="space-between" align="flex-start">
                    <div>
                      <Text size="xs" c="dimmed" tt="uppercase">
                        Stage {index + 1}
                      </Text>
                      <Text fw={700}>{stage.title}</Text>
                    </div>
                    <Badge color={stageState === 'completed' ? 'green' : stageState === 'active' ? 'cyan' : 'gray'}>
                      {stage.agent}
                    </Badge>
                  </Group>
                  <Text size="sm" c="dimmed">
                    {stage.detail}
                  </Text>
                  <Badge variant="light" color={stageState === 'completed' ? 'green' : stageState === 'active' ? 'cyan' : 'gray'}>
                    {stageState === 'completed' ? 'Completed' : stageState === 'active' ? 'Active now' : 'Upcoming'}
                  </Badge>
                </Stack>
              </Card>
              {index < FLOW_STAGES.length - 1 && (
                <Box visibleFrom="xl" style={{ display: 'flex', alignItems: 'center' }}>
                  <Text c="dimmed" fw={700} size="xl">
                    →
                  </Text>
                </Box>
              )}
            </Group>
          );
        })}
      </Flex>

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

      <Accordion value={expandedSection} onChange={(value) => setExpandedSection(value as DetailSectionKey | null)} variant="separated" radius="md">
        {detail.requirements?.requirementsJsonPath && (
          <Accordion.Item value="requirements">
            <Accordion.Control>
              <StageSectionHeader
                title="Requirements review"
                description="Open structured requirements, previews, and HITL approval controls."
                badge={getReviewBadge(detail.requirements.hitlStatus, detail.status, detail.currentPhase === 'hitl_requirements')}
              />
            </Accordion.Control>
            <Accordion.Panel>
              <HitlPanel
                title="Requirements"
                runId={runId}
                phase="hitl_requirements"
                currentProvider={detail.config.llmProvider}
                status={detail.status}
                currentPhase={detail.currentPhase}
                hitlStatus={detail.requirements.hitlStatus}
                links={[
                  { label: 'Summary (Markdown)', type: 'requirements_summary' },
                  { label: 'Requirements (JSON)', type: 'requirements_json' },
                  { label: 'Requirements (Excel)', type: 'requirements_excel' },
                ]}
                regenerationHistory={detail.requirements.regenerationHistory}
                files={detail.files}
                preview={{ kind: 'requirements', summaryType: 'requirements_summary', jsonType: 'requirements_json' }}
                onDecided={refresh}
              />
            </Accordion.Panel>
          </Accordion.Item>
        )}

        {detail.testCases?.testCasesJsonPath && (
          <Accordion.Item value="testcases">
            <Accordion.Control>
              <StageSectionHeader
                title="Test case review"
                description="Open generated test cases, traceability previews, and reviewer actions."
                badge={getReviewBadge(detail.testCases.hitlStatus, detail.status, detail.currentPhase === 'hitl_testcases')}
              />
            </Accordion.Control>
            <Accordion.Panel>
              <HitlPanel
                title="Test Cases"
                runId={runId}
                phase="hitl_testcases"
                currentProvider={detail.config.llmProvider}
                status={detail.status}
                currentPhase={detail.currentPhase}
                hitlStatus={detail.testCases.hitlStatus}
                links={[
                  { label: 'Summary (Markdown)', type: 'testcases_summary' },
                  { label: 'Test Cases (JSON)', type: 'testcases_json' },
                  { label: 'Test Cases (Excel)', type: 'testcases_excel' },
                ]}
                regenerationHistory={detail.testCases.regenerationHistory}
                files={detail.files}
                preview={{ kind: 'testcases', summaryType: 'testcases_summary', jsonType: 'testcases_json' }}
                onDecided={refresh}
              />
            </Accordion.Panel>
          </Accordion.Item>
        )}

        {detail.automation?.generatedTestFiles && detail.automation.generatedTestFiles.length > 0 && (
          <Accordion.Item value="automation">
            <Accordion.Control>
              <StageSectionHeader
                title="Automation approval"
                description="Review generated Playwright specs and resume execution when ready."
                badge={getReviewBadge(detail.automation.hitlStatus, detail.status, detail.currentPhase === 'hitl_automation')}
              />
            </Accordion.Control>
            <Accordion.Panel>
              <AutomationPanel
                runId={runId}
                currentProvider={detail.config.llmProvider}
                status={detail.status}
                currentPhase={detail.currentPhase}
                hitlStatus={detail.automation.hitlStatus}
                files={detail.automation.generatedTestFiles}
                allFiles={detail.files}
                regenerationHistory={detail.automation.regenerationHistory}
                onDecided={refresh}
              />
            </Accordion.Panel>
          </Accordion.Item>
        )}

        {(detail.execution?.summary || detail.currentPhase === 'execute_tests' || detail.currentPhase === 'finalize_run') && (
          <Accordion.Item value="execution">
            <Accordion.Control>
              <StageSectionHeader
                title="Execution and reports"
                description="Monitor test execution and open the generated result artifacts."
                badge={getExecutionBadge(detail.status, detail.currentPhase, Boolean(detail.execution?.summary))}
              />
            </Accordion.Control>
            <Accordion.Panel>
              <Stack>
                <ExecutionStatusPanel status={detail.status} currentPhase={detail.currentPhase} />
                {detail.execution?.summary && <ExecutionPanel runId={runId} execution={detail.execution} />}
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>
        )}
      </Accordion>

      {(detail.status === 'completed' || detail.status === 'failed' || detail.status === 'rejected') && (
        <Group>
          <Button component={Link} href="/runs/new" variant="light">
            Start Another Flow
          </Button>
        </Group>
      )}
    </Stack>
  );
}

function StageSectionHeader({
  title,
  description,
  badge,
}: {
  title: string;
  description: string;
  badge: { label: string; color: string };
}) {
  return (
    <Group justify="space-between" align="flex-start" wrap="nowrap">
      <div>
        <Text fw={600}>{title}</Text>
        <Text size="sm" c="dimmed">
          {description}
        </Text>
      </div>
      <Badge color={badge.color} variant="light">
        {badge.label}
      </Badge>
    </Group>
  );
}

function fileNameOf(path: string): string {
  return path.split('/').pop() ?? path;
}

function HitlPanel({
  title,
  runId,
  phase,
  currentProvider,
  status,
  currentPhase,
  hitlStatus,
  links,
  regenerationHistory,
  files,
  preview,
  onDecided,
}: {
  title: string;
  runId: string;
  phase: HitlPhase;
  currentProvider: LlmProvider;
  status: string;
  currentPhase: string | null;
  hitlStatus?: string;
  links: { label: string; type: string }[];
  regenerationHistory?: RegenerationHistoryEntry[];
  files: RunDetailResponse['files'];
  preview?: { kind: PreviewKind; summaryType: string; jsonType: string };
  onDecided: () => void;
}) {
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [summaryPreview, setSummaryPreview] = useState<string>();
  const [jsonPreview, setJsonPreview] = useState<RequirementsDocument | TestCasesDocument>();
  const [previewError, setPreviewError] = useState<string | undefined>();
  const [rateLimitDecision, setRateLimitDecision] = useState<'approved' | 'rejected' | undefined>();
  const pending = status === 'waiting_hitl' && currentPhase === phase;

  useEffect(() => {
    if (!preview) return;
    const previewConfig = preview;

    let cancelled = false;

    async function loadPreview() {
      try {
        const [summaryResponse, jsonResponse] = await Promise.all([
          fetch(artifactUrl(runId, previewConfig.summaryType), { cache: 'no-store' }),
          fetch(artifactUrl(runId, previewConfig.jsonType), { cache: 'no-store' }),
        ]);

        if (!summaryResponse.ok || !jsonResponse.ok) {
          throw new Error('preview fetch failed');
        }

        const [summaryText, jsonText] = await Promise.all([summaryResponse.text(), jsonResponse.text()]);
        if (cancelled) return;

        setSummaryPreview(summaryText);
        setJsonPreview(JSON.parse(jsonText) as RequirementsDocument | TestCasesDocument);
        setPreviewError(undefined);
      } catch {
        if (!cancelled) {
          setPreviewError('Preview is unavailable right now. You can still download the artifacts.');
        }
      }
    }

    void loadPreview();

    return () => {
      cancelled = true;
    };
  }, [preview, runId]);

  async function decide(
    decision: 'approved' | 'rejected',
    configOverride?: HitlDecisionRequest['configOverride'],
  ) {
    setSubmitting(true);
    try {
      await submitHitlDecision(runId, phase, decision, comments || undefined, configOverride);
      notifications.show({
        color: decision === 'approved' ? 'green' : 'red',
        message: `${title} ${decision}`,
      });
      setRateLimitDecision(undefined);
      onDecided();
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setRateLimitDecision(decision);
        return;
      }
      notifications.show({
        color: 'red',
        title: 'Could not submit decision',
        message: err instanceof ApiError ? err.message : 'Could not reach the API.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function retryWithProvider(override: ProviderOverride) {
    if (!rateLimitDecision) return;
    await decide(rateLimitDecision, override);
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

        {regenerationHistory && regenerationHistory.length > 0 && (
          <RegenerationHistoryPanel regenerationHistory={regenerationHistory} files={files} runId={runId} />
        )}

        {preview && (
          <SimpleGrid cols={{ base: 1, xl: 2 }}>
            <Card withBorder padding="sm">
              <Stack gap="xs">
                <Text fw={600}>Markdown summary preview</Text>
                {previewError ? (
                  <Text size="sm" c="dimmed">
                    {previewError}
                  </Text>
                ) : summaryPreview === undefined ? (
                  <Loader size="sm" />
                ) : (
                  <Code block style={{ maxHeight: 260, overflow: 'auto' }}>
                    {summaryPreview}
                  </Code>
                )}
              </Stack>
            </Card>

            <Card withBorder padding="sm">
              <Stack gap="xs">
                <Text fw={600}>Structured preview</Text>
                {previewError ? (
                  <Text size="sm" c="dimmed">
                    {previewError}
                  </Text>
                ) : jsonPreview === undefined ? (
                  <Loader size="sm" />
                ) : preview.kind === 'requirements' ? (
                  <RequirementsPreview document={jsonPreview as RequirementsDocument} />
                ) : (
                  <TestCasesPreview document={jsonPreview as TestCasesDocument} />
                )}
              </Stack>
            </Card>
          </SimpleGrid>
        )}

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

      <ProviderRateLimitDialog
        opened={rateLimitDecision !== undefined}
        currentProvider={currentProvider}
        message="The current provider hit a rate limit while continuing the workflow. Choose another provider to resume this run."
        busy={submitting}
        onClose={() => setRateLimitDecision(undefined)}
        onConfirm={retryWithProvider}
      />
    </Card>
  );
}

function AutomationPanel({
  runId,
  currentProvider,
  status,
  currentPhase,
  hitlStatus,
  files,
  allFiles,
  regenerationHistory,
  onDecided,
}: {
  runId: string;
  currentProvider: LlmProvider;
  status: string;
  currentPhase: string | null;
  hitlStatus?: string;
  files: string[];
  allFiles: RunDetailResponse['files'];
  regenerationHistory?: RegenerationHistoryEntry[];
  onDecided: () => void;
}) {
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [viewing, setViewing] = useState<string | undefined>();
  const [code, setCode] = useState<string | undefined>();
  const [rateLimitDecision, setRateLimitDecision] = useState<'approved' | 'rejected' | undefined>();
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

  async function decide(
    decision: 'approved' | 'rejected',
    configOverride?: HitlDecisionRequest['configOverride'],
  ) {
    setSubmitting(true);
    try {
      await submitHitlDecision(runId, 'hitl_automation', decision, comments || undefined, configOverride);
      notifications.show({ color: decision === 'approved' ? 'green' : 'red', message: `Automation ${decision}` });
      setRateLimitDecision(undefined);
      onDecided();
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setRateLimitDecision(decision);
        return;
      }
      notifications.show({
        color: 'red',
        title: 'Could not submit decision',
        message: err instanceof ApiError ? err.message : 'Could not reach the API.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function retryWithProvider(override: ProviderOverride) {
    if (!rateLimitDecision) return;
    await decide(rateLimitDecision, override);
  }

  return (
    <Card withBorder>
      <Stack>
        <Group justify="space-between">
          <Title order={4}>Automation (Playwright)</Title>
          {hitlStatus && <Badge color={hitlStatus === 'approved' ? 'green' : hitlStatus === 'rejected' ? 'red' : 'yellow'}>{hitlStatus}</Badge>}
        </Group>

        <Alert color="blue" title="Execution behavior">
          Approving automation immediately resumes the workflow and starts Playwright execution. Results appear in the execution section below as soon as reports are written.
        </Alert>

        <Stack gap={4}>
          {files.map((f) => (
            <Anchor key={f} component="button" type="button" onClick={() => viewFile(f)}>
              {fileNameOf(f)}
            </Anchor>
          ))}
        </Stack>

        {regenerationHistory && regenerationHistory.length > 0 && (
          <RegenerationHistoryPanel regenerationHistory={regenerationHistory} files={allFiles} runId={runId} />
        )}

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

      <ProviderRateLimitDialog
        opened={rateLimitDecision !== undefined}
        currentProvider={currentProvider}
        message="The current provider hit a rate limit while automation approval was resuming the workflow. Choose another provider to continue."
        busy={submitting}
        onClose={() => setRateLimitDecision(undefined)}
        onConfirm={retryWithProvider}
      />
    </Card>
  );
}

function ExecutionStatusPanel({ status, currentPhase }: { status: string; currentPhase: string | null }) {
  const running = status === 'running' && (currentPhase === 'execute_tests' || currentPhase === 'finalize_run');
  const failedBeforeSummary = status === 'failed' && currentPhase === 'execute_tests';

  if (failedBeforeSummary) {
    return (
      <Alert color="red" title="Execution stopped early">
        Automation execution failed before the final report summary was attached. Review the generated artifacts and API logs for the failing step.
      </Alert>
    );
  }

  if (!running) return null;

  return (
    <Card withBorder>
      <Group justify="space-between">
        <div>
          <Title order={4}>Execution in progress</Title>
          <Text size="sm" c="dimmed">
            Approved automation is now running. This page keeps polling and will surface reports once they are available.
          </Text>
        </div>
        <Group gap="xs">
          <Badge color="cyan">{currentPhase ?? 'execute_tests'}</Badge>
          <Loader size="sm" />
        </Group>
      </Group>
    </Card>
  );
}

function ExecutionPanel({ runId, execution }: { runId: string; execution: NonNullable<RunDetailResponse['execution']> }) {
  const summary = execution.summary!;
  return (
    <Card withBorder>
      <Stack>
        <Title order={4}>Execution Results</Title>
        <SimpleGrid cols={{ base: 2, sm: 3, lg: summary.infrastructureFailures || summary.skipped ? 5 : 3 }}>
          <SummaryCard label="Total" value={summary.total} color="blue" />
          <SummaryCard label="Passed" value={summary.passed} color="green" />
          <SummaryCard label="Failed" value={summary.failed} color="red" />
          {(summary.infrastructureFailures ?? 0) > 0 && (
            <SummaryCard label="Infrastructure" value={summary.infrastructureFailures ?? 0} color="orange" />
          )}
          {(summary.skipped ?? 0) > 0 && <SummaryCard label="Skipped" value={summary.skipped ?? 0} color="gray" />}
        </SimpleGrid>
        {(summary.infrastructureFailures ?? 0) > 0 && (
          <Alert color="orange" title={summary.failureMode === 'mixed' ? 'Mixed execution outcome' : 'Infrastructure failure detected'}>
            <Stack gap={4}>
              <Text size="sm">
                {summary.failureMode === 'mixed'
                  ? 'The run contains both genuine test failures and infrastructure failures. Review the infrastructure messages before trusting the pass/fail split.'
                  : 'The run failed before at least one worker could execute normally. Treat the report as an execution-environment issue first.'}
              </Text>
              {(execution.infrastructureErrors ?? []).map((message) => (
                <Text key={message} size="sm">
                  • {message}
                </Text>
              ))}
            </Stack>
          </Alert>
        )}
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

function RegenerationHistoryPanel({
  regenerationHistory,
  files,
  runId,
}: {
  regenerationHistory: RegenerationHistoryEntry[];
  files: RunDetailResponse['files'];
  runId: string;
}) {
  return (
    <Card withBorder padding="sm">
      <Stack gap="sm">
        <div>
          <Text fw={600}>Regeneration history</Text>
          <Text size="sm" c="dimmed">
            Reviewer feedback captured on rejected cycles and the artifact set that was regenerated afterward.
          </Text>
        </div>
        {regenerationHistory.map((entry) => (
          <Card key={`${entry.iteration}-${entry.comments}`} withBorder padding="sm">
            <Stack gap={6}>
              <Group justify="space-between" align="flex-start">
                <Text fw={600}>Rejected review cycle {entry.iteration}</Text>
                <Badge color="red" variant="light">
                  Rejected
                </Badge>
              </Group>
              <Text size="sm">{entry.comments}</Text>
              {entry.artifactPaths.length > 0 && (
                <Group gap="xs">
                  {entry.artifactPaths.map((artifactPath) => {
                    const artifact = resolveArtifactLink(files, artifactPath, runId);
                    return artifact ? (
                      <Anchor key={artifactPath} href={artifact.href} target="_blank" rel="noreferrer">
                        {artifact.label}
                      </Anchor>
                    ) : (
                      <Text key={artifactPath} size="sm" c="dimmed">
                        {fileNameOf(artifactPath)}
                      </Text>
                    );
                  })}
                </Group>
              )}
            </Stack>
          </Card>
        ))}
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

function PreservedValuesList({
  label,
  values,
}: {
  label: string;
  values: Array<{ label: string; value: string; notes?: string }>;
}) {
  if (values.length === 0) return null;

  return (
    <Stack gap={4}>
      <Text size="sm" fw={600}>
        {label}
      </Text>
      {values.map((value) => (
        <Text key={`${label}-${value.label}-${value.value}`} size="sm" c="dimmed">
          {value.label}: {value.value}
          {value.notes ? ` (${value.notes})` : ''}
        </Text>
      ))}
    </Stack>
  );
}

function TextList({ label, values }: { label: string; values: string[] }) {
  if (values.length === 0) return null;

  return (
    <Text size="sm" c="dimmed">
      {label}: {values.join('; ')}
    </Text>
  );
}

function RequirementsPreview({ document }: { document: RequirementsDocument }) {
  return (
    <Stack gap="xs">
      <Text size="sm" c="dimmed">
        {document.requirements.length} requirements generated
      </Text>
      {document.requirements.map((requirement) => (
        <Card key={requirement.requirementId} withBorder padding="sm">
          <Stack gap={4}>
            <Group justify="space-between" align="flex-start">
              <Text fw={600}>{requirement.title}</Text>
              <Badge variant="light">{requirement.requirementId}</Badge>
            </Group>
            <Text size="sm">{requirement.description}</Text>
            <Group gap="xs">
              <Badge color={requirement.testable ? 'green' : 'red'} variant="light">
                {requirement.testable ? 'Testable' : 'Needs work'}
              </Badge>
              {requirement.tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </Group>
            <TextList label="Comments" values={requirement.comments} />
            <TextList label="Notes" values={requirement.notes} />
            <PreservedValuesList label="Example values" values={requirement.exampleValues} />
            <PreservedValuesList label="Structured test data" values={requirement.testData} />
          </Stack>
        </Card>
      ))}
    </Stack>
  );
}

function TestCasesPreview({ document }: { document: TestCasesDocument }) {
  return (
    <Stack gap="xs">
      <Text size="sm" c="dimmed">
        {document.testCases.length} generated test cases
      </Text>
      {document.testCases.map((testCase) => (
        <Card key={testCase.testCaseId} withBorder padding="sm">
          <Stack gap={4}>
            <Group justify="space-between" align="flex-start">
              <Text fw={600}>{testCase.title}</Text>
              <Badge variant="light">{testCase.testCaseId}</Badge>
            </Group>
            <Group gap="xs">
              <Badge color="cyan" variant="light">
                {testCase.priority}
              </Badge>
              {testCase.traceability.map((requirementId) => (
                <Badge key={requirementId} variant="outline">
                  {requirementId}
                </Badge>
              ))}
            </Group>
            <Text size="sm">Steps: {testCase.steps.length}</Text>
            <Text size="sm">Expected results: {testCase.expectedResults.length}</Text>
            {testCase.preconditions.length > 0 && (
              <Text size="sm" c="dimmed">
                Preconditions: {testCase.preconditions.join('; ')}
              </Text>
            )}
            <TextList label="Comments" values={testCase.comments} />
            <TextList label="Notes" values={testCase.notes} />
            <PreservedValuesList label="Example values" values={testCase.exampleValues} />
            <PreservedValuesList label="Structured test data" values={testCase.testData} />
          </Stack>
        </Card>
      ))}
    </Stack>
  );
}

function getStageState(
  currentPhase: string | null,
  status: string,
  phases: readonly string[],
  index: number,
): 'completed' | 'active' | 'upcoming' {
  const activeIndex = FLOW_STAGES.findIndex((stage) => hasPhase(stage.phases, currentPhase));

  if (hasPhase(phases, currentPhase)) return 'active';
  if (status === 'completed') return 'completed';
  if (status === 'failed' || status === 'rejected') {
    if (activeIndex >= 0) return index < activeIndex ? 'completed' : index === activeIndex ? 'active' : 'upcoming';
    return index === FLOW_STAGES.length - 1 ? 'active' : 'completed';
  }
  if (activeIndex === -1) return index === 0 ? 'active' : 'upcoming';
  if (index < activeIndex) return 'completed';
  if (index === activeIndex) return 'active';
  return 'upcoming';
}

function hasPhase(phases: readonly string[], phase: string | null): boolean {
  return phase ? phases.some((candidate) => candidate === phase) : false;
}

function getPreferredDetailSection(detail: RunDetailResponse): DetailSectionKey | null {
  if (detail.currentPhase === 'hitl_requirements') return 'requirements';
  if (detail.currentPhase === 'hitl_testcases') return 'testcases';
  if (detail.currentPhase === 'hitl_automation') return 'automation';
  if (detail.currentPhase === 'execute_tests' || detail.currentPhase === 'finalize_run') return 'execution';
  if (detail.execution?.summary) return 'execution';
  if (detail.automation?.generatedTestFiles && detail.automation.generatedTestFiles.length > 0) return 'automation';
  if (detail.testCases?.testCasesJsonPath) return 'testcases';
  if (detail.requirements?.requirementsJsonPath) return 'requirements';
  return null;
}

function resolveArtifactLink(files: RunDetailResponse['files'], artifactPath: string, runId: string) {
  const match = files.find((file) => file.path === artifactPath);
  if (!match) return undefined;

  return {
    href: artifactUrl(runId, match.type, match.name),
    label: match.name,
  };
}

function getReviewBadge(hitlStatus: string | undefined, status: string, active: boolean): { label: string; color: string } {
  if (hitlStatus === 'approved') return { label: 'Approved', color: 'green' };
  if (hitlStatus === 'rejected') return { label: 'Rejected', color: 'red' };
  if (status === 'waiting_hitl' && active) return { label: 'Needs review', color: 'yellow' };
  return { label: 'Available', color: 'gray' };
}

function getExecutionBadge(
  status: string,
  currentPhase: string | null,
  hasSummary: boolean,
): { label: string; color: string } {
  if (status === 'running' && (currentPhase === 'execute_tests' || currentPhase === 'finalize_run')) {
    return { label: 'Running', color: 'cyan' };
  }
  if (hasSummary && status === 'completed') return { label: 'Completed', color: 'green' };
  if (status === 'failed' && currentPhase === 'execute_tests') return { label: 'Failed', color: 'red' };
  if (hasSummary) return { label: 'Results ready', color: 'blue' };
  return { label: 'Pending', color: 'gray' };
}

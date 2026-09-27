import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { RunDetailView } from '../RunDetailView';
import { AppSettingsProvider } from '../AppSettingsProvider';
import type { RunDetailResponse } from '../../lib/apiClient';

vi.mock('../../lib/apiClient', async () => {
  const actual = await vi.importActual<typeof import('../../lib/apiClient')>('../../lib/apiClient');
  return {
    ...actual,
    getRun: vi.fn(),
    submitHitlDecision: vi.fn(),
    artifactUrl: (runId: string, type: string, fileName?: string) =>
      `/runs/${runId}/artifacts/${type}${fileName ? `?name=${encodeURIComponent(fileName)}` : ''}`,
  };
});

const REQUIREMENTS_JSON = JSON.stringify({
  runId: 'run-accordion',
  requirements: [
    {
      requirementId: 'REQ-1',
      title: 'Login works',
      description: 'The application allows a valid user to sign in.',
      testable: true,
      tags: ['auth'],
      comments: ['Use the seeded reviewer account.'],
      notes: ['Keep the same seeded password in all examples.'],
      exampleValues: [{ label: 'Username', value: 'qa.user@example.com' }],
      testData: [{ label: 'Password', value: 'P@ssw0rd!' }],
    },
  ],
});

const TESTCASES_JSON = JSON.stringify({
  runId: 'run-accordion',
  testCases: [
    {
      testCaseId: 'TC-1',
      title: 'Successful login',
      preconditions: ['User exists'],
      steps: ['Open login page', 'Enter valid credentials', 'Submit'],
      expectedResults: ['User reaches the dashboard'],
      traceability: ['REQ-1'],
      priority: 'high',
      tags: ['smoke'],
      comments: ['Use the seeded reviewer account.'],
      notes: ['Keep the same seeded password in all examples.'],
      exampleValues: [{ label: 'Username', value: 'qa.user@example.com' }],
      testData: [{ label: 'Password', value: 'P@ssw0rd!' }],
    },
  ],
});

const RUN_DETAIL: RunDetailResponse = {
  runId: 'run-accordion',
  status: 'waiting_hitl',
  currentPhase: 'hitl_testcases',
  config: {
    llmProvider: 'groq',
    llmModel: 'llama-3.1-70b-versatile',
    embeddingsProvider: 'voyage',
    embeddingsModel: 'voyage-3',
    enableHITLAutomation: true,
    executionBackend: 'local',
  },
  executionSummary: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  requirements: {
    requirementsJsonPath: 'workspace/run-accordion/requirements/requirements.json',
    summaryMarkdownPath: 'workspace/run-accordion/requirements/summary.md',
    hitlStatus: 'approved',
  },
  testCases: {
    testCasesJsonPath: 'workspace/run-accordion/testcases/testcases.json',
    summaryMarkdownPath: 'workspace/run-accordion/testcases/testcases_summary.md',
    regenerationHistory: [
      {
        iteration: 1,
        comments: 'Add more coverage around failed sign-in attempts.',
        artifactPaths: [
          'workspace/run-accordion/testcases/testcases.json',
          'workspace/run-accordion/testcases/testcases_summary.md',
        ],
      },
    ],
  },
  automation: {
    generatedTestFiles: ['workspace/run-accordion/tests/login.spec.ts'],
  },
  hitlDecisions: [],
  files: [
    {
      id: 'file-1',
      name: 'testcases.json',
      path: 'workspace/run-accordion/testcases/testcases.json',
      type: 'testcases_json',
      phase: 'agent2_testcases',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'file-2',
      name: 'testcases_summary.md',
      path: 'workspace/run-accordion/testcases/testcases_summary.md',
      type: 'testcases_summary',
      phase: 'agent2_testcases',
      createdAt: '2026-01-01T00:00:01.000Z',
    },
  ],
};

function renderWithProvider(ui: React.ReactElement) {
  return render(
    <MantineProvider>
      <AppSettingsProvider>{ui}</AppSettingsProvider>
    </MantineProvider>,
  );
}

describe('RunDetailView', () => {
  it('opens the active review stage by default and keeps one section expanded at a time', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
      const url = String(typeof input === 'string' || input instanceof URL ? input : input.url);
      if (url.includes('requirements_json')) {
        return { ok: true, text: async () => REQUIREMENTS_JSON };
      }
      if (url.includes('testcases_json')) {
        return { ok: true, text: async () => TESTCASES_JSON };
      }
      return { ok: true, text: async () => '# Summary' };
    }));

    renderWithProvider(<RunDetailView runId="run-accordion" initial={RUN_DETAIL} />);

    const requirementsButton = screen.getByRole('button', { name: /Requirements review/i });
    const testCasesButton = screen.getByRole('button', { name: /Test case review/i });
    const automationButton = screen.getByRole('button', { name: /Automation approval/i });

    expect(testCasesButton).toHaveAttribute('aria-expanded', 'true');
    expect(requirementsButton).toHaveAttribute('aria-expanded', 'false');
    expect(automationButton).toHaveAttribute('aria-expanded', 'false');

    const user = userEvent.setup();
    await user.click(requirementsButton);

    expect(requirementsButton).toHaveAttribute('aria-expanded', 'true');
    expect(testCasesButton).toHaveAttribute('aria-expanded', 'false');
    expect(automationButton).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText(/Regeneration history/i)).toBeInTheDocument();
    expect(screen.getByText(/Add more coverage around failed sign-in attempts\./i)).toBeInTheDocument();
    expect(screen.getAllByText(/Username: qa.user@example.com/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Password: P@ssw0rd!/i).length).toBeGreaterThan(0);

    vi.unstubAllGlobals();
  });
});
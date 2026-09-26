import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { RunsTable } from '../RunsTable';
import type { RunSummary } from '../../lib/apiClient';

const RUNS: RunSummary[] = [
  {
    id: 'run-1',
    status: 'completed',
    currentPhase: 'finalize_run',
    config: {
      llmProvider: 'groq',
      llmModel: 'llama-3.1-70b-versatile',
      embeddingsProvider: 'voyage',
      embeddingsModel: 'voyage-3',
      enableHITLAutomation: false,
    },
    executionSummary: { total: 2, passed: 2, failed: 0 },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'run-2',
    status: 'failed',
    currentPhase: 'jeve_validate',
    config: {
      llmProvider: 'groq',
      llmModel: 'llama-3.1-70b-versatile',
      embeddingsProvider: 'voyage',
      embeddingsModel: 'voyage-3',
      enableHITLAutomation: false,
    },
    executionSummary: null,
    createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  },
];

function renderWithProvider(ui: React.ReactElement) {
  return render(<MantineProvider>{ui}</MantineProvider>);
}

describe('RunsTable', () => {
  it('renders every run by default', () => {
    renderWithProvider(<RunsTable runs={RUNS} />);
    expect(screen.getByText('run-1')).toBeInTheDocument();
    expect(screen.getByText('run-2')).toBeInTheDocument();
  });

  it('filters runs by status', async () => {
    renderWithProvider(<RunsTable runs={RUNS} />);
    const user = userEvent.setup();

    const select = screen.getByRole('textbox', { name: 'Filter by status' });
    await user.click(select);
    const listbox = await screen.findByRole('listbox');
    await user.click(within(listbox).getByText('failed'));

    expect(screen.queryByText('run-1')).not.toBeInTheDocument();
    expect(screen.getByText('run-2')).toBeInTheDocument();
  });
});

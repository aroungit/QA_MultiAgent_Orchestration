'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Anchor, Badge, Group, Select, Table, Text } from '@mantine/core';
import { formatDateTime, type RunSummary } from '../lib/apiClient';

const STATUS_OPTIONS = ['all', 'created', 'running', 'waiting_hitl', 'completed', 'failed', 'rejected'];

export function RunsTable({ runs }: { runs: RunSummary[] }) {
  const [status, setStatus] = useState('all');

  const filtered = useMemo(
    () => (status === 'all' ? runs : runs.filter((run) => run.status === status)),
    [runs, status],
  );

  return (
    <>
      <Group>
        <Select
          label="Filter by workflow status"
          data={STATUS_OPTIONS}
          value={status}
          onChange={(value) => setStatus(value ?? 'all')}
          allowDeselect={false}
          w={200}
        />
      </Group>

      {filtered.length === 0 && <Text c="dimmed">No runs match this filter.</Text>}

      {filtered.length > 0 && (
        <Table highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Workflow run</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Current step</Table.Th>
              <Table.Th>Outcome</Table.Th>
              <Table.Th>Started</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {filtered.map((run, index) => (
              <Table.Tr key={run.id}>
                <Table.Td>
                  <Group gap="xs" align="flex-start" wrap="nowrap">
                    <Badge variant="light" color="gray" mt={2}>
                      #{filtered.length - index}
                    </Badge>
                    <div>
                      <Anchor component={Link} href={`/runs/${run.id}`}>
                        {getRunLabel(run, index)}
                      </Anchor>
                      <Text size="sm" c="dimmed">
                        Reference: {run.id}
                      </Text>
                    </div>
                  </Group>
                </Table.Td>
                <Table.Td>
                  <Badge color={run.status === 'failed' || run.status === 'rejected' ? 'red' : 'blue'}>
                    {formatStatusLabel(run.status)}
                  </Badge>
                </Table.Td>
                <Table.Td>{formatPhaseLabel(run.currentPhase)}</Table.Td>
                <Table.Td>{formatOutcome(run)}</Table.Td>
                <Table.Td>{formatDateTime(run.createdAt)}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
    </>
  );
}

function getRunLabel(run: RunSummary, index: number): string {
  return `Workflow run ${index + 1}`;
}

function formatStatusLabel(status: RunSummary['status']): string {
  return status.replace(/_/g, ' ');
}

function formatPhaseLabel(phase: RunSummary['currentPhase']): string {
  if (!phase) return 'Awaiting first action';

  const label = phase.replace(/^hitl_/, 'review_').replace(/_/g, ' ');
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatOutcome(run: RunSummary): string {
  if (run.executionSummary) {
    const parts = [`${run.executionSummary.passed} passed`, `${run.executionSummary.failed} failed`];
    if ((run.executionSummary.infrastructureFailures ?? 0) > 0) {
      parts.push(`${run.executionSummary.infrastructureFailures} infrastructure`);
    }
    if ((run.executionSummary.skipped ?? 0) > 0) {
      parts.push(`${run.executionSummary.skipped} skipped`);
    }
    return parts.join(' / ');
  }

  if (run.status === 'rejected') return 'Stopped after reviewer rejection';
  if (run.status === 'failed') return 'Stopped before execution';
  if (run.status === 'waiting_hitl') return 'Waiting for reviewer action';
  if (run.status === 'running') return 'In progress';
  return 'Preparing workflow';
}

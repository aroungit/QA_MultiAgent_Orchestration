'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Badge, Group, Select, Table, Text } from '@mantine/core';
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
          label="Filter by status"
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
              <Table.Th>Run ID</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Phase</Table.Th>
              <Table.Th>Pass / Fail</Table.Th>
              <Table.Th>Created</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {filtered.map((run) => (
              <Table.Tr key={run.id}>
                <Table.Td>
                  <Link href={`/runs/${run.id}`}>{run.id}</Link>
                </Table.Td>
                <Table.Td>
                  <Badge color={run.status === 'failed' || run.status === 'rejected' ? 'red' : 'blue'}>
                    {run.status}
                  </Badge>
                </Table.Td>
                <Table.Td>{run.currentPhase ?? '—'}</Table.Td>
                <Table.Td>
                  {run.executionSummary ? `${run.executionSummary.passed} / ${run.executionSummary.failed}` : '—'}
                </Table.Td>
                <Table.Td>{formatDateTime(run.createdAt)}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
    </>
  );
}

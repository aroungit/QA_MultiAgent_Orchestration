import Link from 'next/link';
import { Alert, Anchor, Card, Group, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { getTrends } from '../../lib/apiClient';
import { TrendChart } from '../../components/TrendChart';
import { formatDateTime } from '../../lib/apiClient';

export default async function TrendsPage() {
  let trends: Awaited<ReturnType<typeof getTrends>> = [];
  let error: string | undefined;

  try {
    trends = await getTrends();
  } catch {
    error = 'Could not reach the API. Is it running?';
  }

  const totalRuns = trends.length;
  const totalPassed = trends.reduce((sum, point) => sum + point.summary.passed, 0);
  const totalFailed = trends.reduce((sum, point) => sum + point.summary.failed, 0);
  const latestRun = trends.at(-1);
  const latestOutcome = latestRun
    ? latestRun.summary.failed > 0
      ? `${latestRun.summary.failed} failed checks in the latest run`
      : 'Latest run completed without failed checks'
    : 'No completed runs yet';
  const passRate = totalPassed + totalFailed > 0 ? Math.round((totalPassed / (totalPassed + totalFailed)) * 100) : 0;

  return (
    <Stack>
      <Group justify="space-between" align="flex-start">
        <div>
          <Title order={2}>Trend Dashboard</Title>
          <Text c="dimmed" mt="xs">
            Track recent execution movement, failure pressure, and completed workflow outcomes in one place.
          </Text>
        </div>
        <Anchor component={Link} href="/">
          Open run history
        </Anchor>
      </Group>

      {error && <Alert color="red">{error}</Alert>}
      {!error && trends.length === 0 && <Alert color="gray">No completed runs yet.</Alert>}
      {!error && trends.length > 0 && (
        <>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
            <MetricCard label="Completed runs" value={String(totalRuns)} detail="Runs available in the dashboard" />
            <MetricCard label="Passed checks" value={String(totalPassed)} detail={`${passRate}% overall pass rate`} />
            <MetricCard label="Failed checks" value={String(totalFailed)} detail={totalFailed === 0 ? 'No recent failures recorded' : 'Failures captured across completed runs'} />
            <MetricCard
              label="Latest outcome"
              value={latestRun?.executionLabel ?? 'Waiting for first run'}
              detail={latestOutcome}
            />
          </SimpleGrid>

          <TrendChart trends={trends} />
          <Stack gap="xs">
            <Text fw={600}>Recent completed runs</Text>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={tableHeaderStyle}>Workflow run</th>
                    <th style={tableHeaderStyle}>Total</th>
                    <th style={tableHeaderStyle}>Passed</th>
                    <th style={tableHeaderStyle}>Failed</th>
                    <th style={tableHeaderStyle}>Completed at</th>
                  </tr>
                </thead>
                <tbody>
                  {trends.map((point) => (
                    <tr key={point.runId}>
                      <td style={tableCellStyle}>
                        <Stack gap={0}>
                          <Anchor component={Link} href={`/runs/${point.runId}`}>
                            {point.executionLabel}
                          </Anchor>
                          <Text size="sm" c="dimmed">
                            Reference: {point.runId}
                          </Text>
                        </Stack>
                      </td>
                      <td style={tableCellStyle}>{point.summary.total}</td>
                      <td style={tableCellStyle}>{point.summary.passed}</td>
                      <td style={tableCellStyle}>{point.summary.failed}</td>
                      <td style={tableCellStyle}>{formatDateTime(point.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Stack>
        </>
      )}
    </Stack>
  );
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <Card withBorder radius="md" padding="lg">
      <Stack gap={6}>
        <Text size="sm" c="dimmed" tt="uppercase">
          {label}
        </Text>
        <Text fw={700} size="xl">
          {value}
        </Text>
        <Text size="sm" c="dimmed">
          {detail}
        </Text>
      </Stack>
    </Card>
  );
}

const tableHeaderStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '0.75rem',
  borderBottom: '1px solid var(--mantine-color-gray-3)',
};

const tableCellStyle: React.CSSProperties = {
  padding: '0.75rem',
  borderBottom: '1px solid var(--mantine-color-gray-2)',
  verticalAlign: 'top',
};

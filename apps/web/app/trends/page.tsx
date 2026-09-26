import { Alert, Stack, Title } from '@mantine/core';
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

  return (
    <Stack>
      <Title order={2}>Trends</Title>
      {error && <Alert color="red">{error}</Alert>}
      {!error && trends.length === 0 && <Alert color="gray">No completed runs yet.</Alert>}
      {!error && trends.length > 0 && (
        <>
          <TrendChart trends={trends} />
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Run ID</th>
                <th style={{ textAlign: 'left' }}>Total</th>
                <th style={{ textAlign: 'left' }}>Passed</th>
                <th style={{ textAlign: 'left' }}>Failed</th>
                <th style={{ textAlign: 'left' }}>Created</th>
              </tr>
            </thead>
            <tbody>
              {trends.map((point) => (
                <tr key={point.runId}>
                  <td>{point.runId}</td>
                  <td>{point.summary.total}</td>
                  <td>{point.summary.passed}</td>
                  <td>{point.summary.failed}</td>
                  <td>{formatDateTime(point.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </Stack>
  );
}

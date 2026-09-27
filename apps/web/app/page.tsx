import Link from 'next/link';
import { Alert, Button, Group, Stack, Text, Title } from '@mantine/core';
import { listRuns } from '../lib/apiClient';
import { RunsTable } from '../components/RunsTable';

export default async function HomePage() {
  let runs: Awaited<ReturnType<typeof listRuns>> = [];
  let error: string | undefined;

  try {
    runs = await listRuns();
  } catch {
    error = 'Could not reach the API. Is it running?';
  }

  return (
    <Stack>
      <Group justify="space-between">
        <div>
          <Title order={2}>Workflow Run History</Title>
          <Text c="dimmed" mt="xs">
            Find past QA workflows, reopen their review state, and jump to the trend dashboard without decoding internal ids.
          </Text>
        </div>
        <Group>
          <Button component={Link} href="/trends" variant="default">
            Open Trend Dashboard
          </Button>
          <Button component={Link} href="/runs/new">
            Start Flow
          </Button>
        </Group>
      </Group>

      {error && <Alert color="red">{error}</Alert>}

      {!error && runs.length === 0 && (
        <Text c="dimmed">No workflow runs yet. Start the guided flow to begin building history.</Text>
      )}

      {!error && runs.length > 0 && <RunsTable runs={runs} />}
    </Stack>
  );
}

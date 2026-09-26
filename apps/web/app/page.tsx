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
        <Title order={2}>Runs</Title>
        <Button component={Link} href="/runs/new">
          New Run
        </Button>
      </Group>

      {error && <Alert color="red">{error}</Alert>}

      {!error && runs.length === 0 && <Text c="dimmed">No runs yet. Create one to get started.</Text>}

      {!error && runs.length > 0 && <RunsTable runs={runs} />}
    </Stack>
  );
}

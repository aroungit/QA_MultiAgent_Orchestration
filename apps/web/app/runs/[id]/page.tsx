import { notFound } from 'next/navigation';
import { Alert, Stack, Title } from '@mantine/core';
import { getRun } from '../../../lib/apiClient';
import { RunDetailView } from '../../../components/RunDetailView';

export default async function RunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let detail: Awaited<ReturnType<typeof getRun>>;
  try {
    detail = await getRun(id);
  } catch {
    return (
      <Stack>
        <Title order={2}>Run {id}</Title>
        <Alert color="red">Could not reach the API, or this run does not exist.</Alert>
      </Stack>
    );
  }

  if (!detail) notFound();

  return <RunDetailView runId={id} initial={detail} />;
}

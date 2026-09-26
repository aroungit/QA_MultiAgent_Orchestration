'use client';

import { Alert, Button, Stack, Text, Title } from '@mantine/core';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Stack p="md">
      <Title order={2}>Something went wrong</Title>
      <Alert color="red" title="Unexpected error">
        <Text size="sm">{error.message || 'An unexpected error occurred.'}</Text>
      </Alert>
      <Button onClick={reset} w={160}>
        Try again
      </Button>
    </Stack>
  );
}

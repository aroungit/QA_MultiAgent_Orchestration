import { Loader, Stack } from '@mantine/core';

export default function Loading() {
  return (
    <Stack align="center" justify="center" h={200}>
      <Loader />
    </Stack>
  );
}

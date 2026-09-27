'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Anchor,
  AppShell,
  Badge,
  Box,
  Burger,
  Button,
  Card,
  Divider,
  Group,
  NavLink,
  Stack,
  Text,
  Title,
  useComputedColorScheme,
  useMantineColorScheme,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';

const NAV_ITEMS = [
  { href: '/', label: 'Run History', description: 'Review previous orchestration runs.' },
  { href: '/runs/new', label: 'Start Flow', description: 'Submit new requirements into the agent workflow.' },
  { href: '/trends', label: 'Trend Dashboard', description: 'Compare execution outcomes across runs.' },
  { href: '/settings', label: 'Settings', description: 'Configure providers and defaults.' },
];

const FLOW_STEPS = [
  {
    label: 'Stage 1',
    title: 'Ingest and validate',
    agent: 'System + JEV gate',
    detail: 'Capture requirements input and block invalid or incomplete submissions early.',
  },
  {
    label: 'Stage 2',
    title: 'Structure requirements',
    agent: 'Agent 1',
    detail: 'Normalize source text into reviewable requirements artifacts.',
  },
  {
    label: 'Stage 3',
    title: 'Generate test cases',
    agent: 'Agent 2',
    detail: 'Produce traceable functional test cases before automation begins.',
  },
  {
    label: 'Stage 4',
    title: 'Create automation',
    agent: 'Agent 3',
    detail: 'Build Playwright specs and wait for approval when HITL automation is enabled.',
  },
  {
    label: 'Stage 5',
    title: 'Execute and report',
    agent: 'Executor',
    detail: 'Run approved scripts and surface reports, downloads, and defects.',
  },
];

export function AppNavigation({ children }: { children: React.ReactNode }) {
  const [opened, { toggle, close }] = useDisclosure();
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme('light');

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && computedColorScheme === 'dark';

  return (
    <AppShell
      header={{ height: 72 }}
      navbar={{ width: 320, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      footer={{ height: 44 }}
      padding="md"
      styles={{
        main: {
          background: isDark
            ? 'linear-gradient(180deg, #0f1720 0%, #16212d 100%)'
            : 'linear-gradient(180deg, #f2f7f8 0%, #f7f1e8 100%)',
        },
        navbar: {
          background: isDark ? '#10202f' : '#f8fbfb',
          borderInlineEnd: isDark ? '1px solid #234' : '1px solid #d8e3e4',
          overflow: 'hidden',
        },
        header: {
          background: isDark ? '#0b1824' : '#f8fbfb',
          borderBottom: isDark ? '1px solid #234' : '1px solid #d8e3e4',
        },
        footer: {
          background: isDark ? '#0b1824' : '#f8fbfb',
          borderTop: isDark ? '1px solid #234' : '1px solid #d8e3e4',
        },
      }}
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Box>
              <Title order={3}>QA Agent Platform</Title>
              <Text size="sm" c="dimmed">
                Human-guided multi-agent QA orchestration
              </Text>
            </Box>
          </Group>
          <Group gap="sm">
            <Button component={Link} href="/trends" variant="default">
              Trend Dashboard
            </Button>
            <Button variant="light" onClick={() => setColorScheme(isDark ? 'light' : 'dark')}>
              {isDark ? 'Light theme' : 'Dark theme'}
            </Button>
          </Group>
        </Group>
      </AppShell.Header>
      <AppShell.Navbar>
        <AppShell.Section p="md" data-testid="workspace-nav-section">
          <Stack gap="md">
            <Card
              withBorder
              radius="lg"
              padding="md"
              style={{
                background: isDark
                  ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.18), rgba(37, 99, 235, 0.18))'
                  : 'linear-gradient(135deg, rgba(8, 145, 178, 0.12), rgba(37, 99, 235, 0.08))',
              }}
            >
              <Group align="flex-start" wrap="nowrap">
                <BrandMark isDark={isDark} />
                <Stack gap={2}>
                  <Text fw={700}>Orchestration cockpit</Text>
                  <Text size="sm" c="dimmed">
                    Three agents, one QA review flow, and execution evidence in a single workspace.
                  </Text>
                </Stack>
              </Group>
            </Card>

            <div>
            <Text fw={700} size="sm" tt="uppercase" c="dimmed">
              Workspace
            </Text>
            <Stack gap={6} mt="xs">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.href}
                  component={Link}
                  href={item.href}
                  label={item.label}
                  description={item.description}
                  active={pathname === item.href}
                  variant="filled"
                  onClick={close}
                />
              ))}
            </Stack>
            </div>

            <Button component={Link} href="/trends" variant="gradient" gradient={{ from: 'cyan', to: 'blue' }} fullWidth>
              Open Trend Dashboard
            </Button>
          </Stack>
        </AppShell.Section>

        <Divider />

        <AppShell.Section
          grow
          p="md"
          data-testid="guided-flow-section"
          style={{ minHeight: 0, overflowY: 'auto' }}
        >
          <Stack gap="md">
            <div>
            <Text fw={700} size="sm" tt="uppercase" c="dimmed">
              Guided flow
            </Text>
            <Text size="sm" c="dimmed" mt="xs">
              Follow the stages in order. Review pages expose approvals, downloads, and execution evidence.
            </Text>
            </div>

            <Stack gap="sm">
              {FLOW_STEPS.map((step, index) => {
                const highlighted =
                  (pathname === '/runs/new' && index === 0) ||
                  (pathname.startsWith('/runs/') && index >= 1) ||
                  pathname === '/trends';

                return (
                  <Box key={step.title}>
                    <Card
                      withBorder
                      radius="md"
                      padding="sm"
                      style={{
                        background: highlighted ? (isDark ? '#14324a' : '#e8f6f7') : undefined,
                      }}
                    >
                      <Group justify="space-between" align="flex-start" mb={4}>
                        <div>
                          <Text size="xs" c="dimmed" tt="uppercase">
                            {step.label}
                          </Text>
                          <Text fw={700}>{step.title}</Text>
                        </div>
                        <Badge variant={highlighted ? 'filled' : 'light'}>{step.agent}</Badge>
                      </Group>
                      <Text size="sm" c="dimmed">
                        {step.detail}
                      </Text>
                    </Card>
                    {index < FLOW_STEPS.length - 1 && (
                      <Text ta="center" c="dimmed" fw={700} size="lg" mt={6}>
                        ↓
                      </Text>
                    )}
                  </Box>
                );
              })}
            </Stack>

            <Anchor component={Link} href="/trends" size="sm" onClick={close}>
              Review recent outcomes in the Trend Dashboard
            </Anchor>
          </Stack>
        </AppShell.Section>
      </AppShell.Navbar>
      <AppShell.Main>{children}</AppShell.Main>
      <AppShell.Footer>
        <Group h="100%" px="md" justify="space-between">
          <Text size="sm" c="dimmed">
            2026 Aroun AI labs
          </Text>
          <Text size="sm" c="dimmed">
            Review inputs, approvals, and execution artifacts from one workspace.
          </Text>
        </Group>
      </AppShell.Footer>
    </AppShell>
  );
}

function BrandMark({ isDark }: { isDark: boolean }) {
  const lineColor = isDark ? '#67e8f9' : '#0f766e';
  const nodeBackground = isDark ? '#082f49' : '#ecfeff';

  return (
    <Box pos="relative" w={54} h={40} aria-hidden="true">
      <Box pos="absolute" top={8} left={12} w={14} h={2} bg={lineColor} style={{ transform: 'rotate(28deg)' }} />
      <Box pos="absolute" top={22} left={24} w={14} h={2} bg={lineColor} style={{ transform: 'rotate(-28deg)' }} />
      <Box pos="absolute" top={10} left={27} w={2} h={14} bg={lineColor} />
      {[{ top: 2, left: 4 }, { top: 2, left: 34 }, { top: 24, left: 19 }].map((node) => (
        <Box
          key={`${node.top}-${node.left}`}
          pos="absolute"
          top={node.top}
          left={node.left}
          w={16}
          h={16}
          bg={nodeBackground}
          style={{ borderRadius: 999, border: `2px solid ${lineColor}` }}
        />
      ))}
    </Box>
  );
}

'use client';

import {
  ColorSchemeScript,
  MantineProvider,
  createTheme,
  localStorageColorSchemeManager,
} from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { AppNavigation } from './AppNavigation';
import { AppSettingsProvider } from './AppSettingsProvider';

const colorSchemeManager = localStorageColorSchemeManager({ key: 'qa-agent-color-scheme' });

const theme = createTheme({
  fontFamily: 'Trebuchet MS, Segoe UI, sans-serif',
  headings: {
    fontFamily: 'Georgia, Trebuchet MS, serif',
  },
  primaryColor: 'cyan',
  defaultRadius: 'md',
});

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <MantineProvider theme={theme} defaultColorScheme="light" colorSchemeManager={colorSchemeManager}>
      <ColorSchemeScript defaultColorScheme="light" />
      <Notifications />
      <AppSettingsProvider>
        <AppNavigation>{children}</AppNavigation>
      </AppSettingsProvider>
    </MantineProvider>
  );
}
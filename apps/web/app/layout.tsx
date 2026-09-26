import type { Metadata } from 'next';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/charts/styles.css';
import { ColorSchemeScript, MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { AppNavigation } from '../components/AppNavigation';

export const metadata: Metadata = {
  title: 'QA Agent Platform',
  description: 'Multi-agent QA orchestration platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ColorSchemeScript />
      </head>
      <body>
        <MantineProvider>
          <Notifications />
          <AppNavigation>{children}</AppNavigation>
        </MantineProvider>
      </body>
    </html>
  );
}

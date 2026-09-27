import type { Metadata } from 'next';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/charts/styles.css';
import { AppProviders } from '../components/AppProviders';

export const metadata: Metadata = {
  title: 'QA Agent Platform',
  description: 'Multi-agent QA orchestration platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}

import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { AppNavigation } from '../AppNavigation';

const closeMock = vi.fn();

vi.mock('next/navigation', () => ({
  usePathname: () => '/runs/new',
}));

vi.mock('@mantine/hooks', async () => {
  const actual = await vi.importActual<typeof import('@mantine/hooks')>('@mantine/hooks');
  return {
    ...actual,
    useDisclosure: () => [true, { toggle: vi.fn(), close: closeMock }],
  };
});

vi.mock('next/link', () => ({
  default: ({ href, children, onClick, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a
      href={href}
      {...props}
      onClick={(event) => {
        event.preventDefault();
        onClick?.(event);
      }}
    >
      {children}
    </a>
  ),
}));

function renderWithProvider(ui: React.ReactElement) {
  return render(<MantineProvider>{ui}</MantineProvider>);
}

describe('AppNavigation', () => {
  it('renders branded shell content, route actions, and a scrollable guided flow panel', async () => {
    renderWithProvider(
      <AppNavigation>
        <div>content</div>
      </AppNavigation>,
    );

    const user = userEvent.setup();
    const settingsLink = screen.getByRole('link', { name: 'Settings Configure providers and defaults.' });
    const trendLinks = screen.getAllByRole('link', { name: /Trend Dashboard/i });
    const guidedFlowTrendLink = screen.getByRole('link', { name: /Review recent outcomes in the Trend Dashboard/i });

    expect(screen.getByText('Orchestration cockpit')).toBeInTheDocument();
    expect(settingsLink).toHaveAttribute('href', '/settings');
    expect(trendLinks.length).toBeGreaterThan(0);
    expect(screen.getByTestId('guided-flow-section')).toHaveStyle({ overflowY: 'auto' });
    expect(guidedFlowTrendLink).toHaveAttribute('href', '/trends');

    await user.click(settingsLink);
    await user.click(guidedFlowTrendLink);

    expect(closeMock).toHaveBeenCalledTimes(2);
  });
});
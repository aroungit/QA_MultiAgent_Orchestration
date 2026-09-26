# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.ts >> TC-001: Authentication required before initiating a money transfer
- Location: workspace\0fd09495-4608-48f5-8979-39a2bfc7ea04\tests\auth.spec.ts:3:5

# Error details

```
Error: page.goto: net::ERR_NAME_NOT_RESOLVED at https://example.com/transfer
Call log:
  - navigating to "https://example.com/transfer", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | test('TC-001: Authentication required before initiating a money transfer', async ({ page }) => {
  4  |   // Attempt to access transfer page without logging in
> 5  |   await page.goto('https://example.com/transfer');
     |              ^ Error: page.goto: net::ERR_NAME_NOT_RESOLVED at https://example.com/transfer
  6  |   // Expect redirect to login page
  7  |   await expect(page).toHaveURL(/.*\/login/);
  8  |   // Or check for login form
  9  |   const loginForm = page.locator('form#loginForm');
  10 |   await expect(loginForm).toBeVisible();
  11 |   // Ensure transfer UI elements are not present
  12 |   const transferHeader = page.locator('h1', { hasText: 'Transfer Money' });
  13 |   await expect(transferHeader).toHaveCount(0);
  14 | });
```
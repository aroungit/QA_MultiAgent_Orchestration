# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: login-2.spec.ts >> Login Page >> TC-004: Successful authentication with valid credentials
- Location: workspace\8dd6f1fe-87c4-402a-9293-24c5578130ce\tests\login-2.spec.ts:23:7

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/login", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Login Page', () => {
  4  |   test('TC-003: Verify Login button visibility and enablement logic', async ({ page }) => {
  5  |     await page.goto('/login');
  6  |     const username = page.locator('input[name="username"]');
  7  |     const password = page.locator('input[name="password"]');
  8  |     const loginButton = page.getByRole('button', { name: 'Login' });
  9  | 
  10 |     // Verify button is visible and disabled initially
  11 |     await expect(loginButton).toBeVisible();
  12 |     await expect(loginButton).toBeDisabled();
  13 | 
  14 |     // Fill username only
  15 |     await username.fill('someUser');
  16 |     await expect(loginButton).toBeDisabled();
  17 | 
  18 |     // Fill password
  19 |     await password.fill('somePass');
  20 |     await expect(loginButton).toBeEnabled();
  21 |   });
  22 | 
  23 |   test('TC-004: Successful authentication with valid credentials', async ({ page }) => {
> 24 |     await page.goto('/login');
     |                ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  25 |     const username = page.locator('input[name="username"]');
  26 |     const password = page.locator('input[name="password"]');
  27 |     const loginButton = page.getByRole('button', { name: 'Login' });
  28 | 
  29 |     await username.fill('validUser');
  30 |     await password.fill('ValidPass123');
  31 |     await expect(loginButton).toBeEnabled();
  32 |     await loginButton.click();
  33 | 
  34 |     // Wait for navigation to dashboard
  35 |     await page.waitForURL('**/dashboard**');
  36 | 
  37 |     // Verify no error message is displayed
  38 |     const errorMessage = page.locator('.error-message');
  39 |     await expect(errorMessage).toHaveCount(0);
  40 |   });
  41 | });
```
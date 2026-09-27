# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: login-3.spec.ts >> TC-005: Invalid credentials handling displays appropriate error message
- Location: workspace\8dd6f1fe-87c4-402a-9293-24c5578130ce\tests\login-3.spec.ts:3:5

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
  3  | test('TC-005: Invalid credentials handling displays appropriate error message', async ({ page }) => {
  4  |   // Preconditions: user is on the login page
> 5  |   await page.goto('/login');
     |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  6  | 
  7  |   // Step 1: Enter invalid username
  8  |   await page.fill('input[name="username"]', 'invalidUser');
  9  | 
  10 |   // Step 2: Enter invalid password
  11 |   await page.fill('input[name="password"]', 'WrongPass');
  12 | 
  13 |   // Step 3: Click the enabled Login button
  14 |   await page.click('button:has-text("Login")');
  15 | 
  16 |   // Step 4: Observe the response area for messages
  17 |   const errorLocator = page.locator('div[data-test-id="login-error"]');
  18 |   await expect(errorLocator).toBeVisible();
  19 |   await expect(errorLocator).toContainText('Invalid username or password');
  20 | 
  21 |   // Expected result: user remains on the login page (no navigation)
  22 |   await expect(page).toHaveURL(/\/login$/);
  23 | });
```
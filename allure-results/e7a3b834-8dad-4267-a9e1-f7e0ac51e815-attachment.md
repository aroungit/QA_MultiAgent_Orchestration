# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.ts >> TC-001: User Login Success
- Location: workspace\a08e66e2-5bd1-447e-a4fc-2686e1db5ec3\tests\auth.spec.ts:3:5

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
  3  | test('TC-001: User Login Success', async ({ page }) => {
> 4  |   await page.goto('/login');
     |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  5  |   await page.fill('input[name="username"]', 'validUsername');
  6  |   await page.fill('input[name="password"]', 'validPassword');
  7  |   await page.click('button[type="submit"]');
  8  |   await expect(page).toHaveURL('/dashboard');
  9  |   await expect(page.locator('h1')).toHaveText('Welcome, validUsername');
  10 | });
```
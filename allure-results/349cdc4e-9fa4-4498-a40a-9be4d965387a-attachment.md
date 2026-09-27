# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: login.spec.ts >> TC-002: Verify presence and masking behavior of Password input field
- Location: workspace\8dd6f1fe-87c4-402a-9293-24c5578130ce\tests\login.spec.ts:14:5

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
  3  | test('TC-001: Verify presence and basic functionality of Username input field', async ({ page }) => {
  4  |   await page.goto('/login');
  5  |   const username = page.getByLabel('Username');
  6  |   await expect(username).toBeVisible();
  7  |   await expect(username).toBeEnabled();
  8  |   await username.click();
  9  |   await expect(username).toBeFocused();
  10 |   await username.fill('testUser123');
  11 |   await expect(username).toHaveValue('testUser123');
  12 | });
  13 | 
  14 | test('TC-002: Verify presence and masking behavior of Password input field', async ({ page }) => {
> 15 |   await page.goto('/login');
     |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  16 |   const password = page.getByLabel('Password');
  17 |   await expect(password).toBeVisible();
  18 |   await expect(password).toBeEnabled();
  19 |   await password.click();
  20 |   await expect(password).toBeFocused();
  21 |   await password.fill('Secret!@#');
  22 |   await expect(password).toHaveAttribute('type', 'password');
  23 |   const value = await password.inputValue();
  24 |   expect(value).toBe('Secret!@#');
  25 | });
```
# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: account.spec.ts >> TC-002: Only savings accounts can be selected as source account
- Location: workspace\0fd09495-4608-48f5-8979-39a2bfc7ea04\tests\account.spec.ts:3:5

# Error details

```
Error: page.goto: net::ERR_NAME_NOT_RESOLVED at https://example.com/login
Call log:
  - navigating to "https://example.com/login", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | test('TC-002: Only savings accounts can be selected as source account', async ({ page }) => {
  4  |   // Log in
> 5  |   await page.goto('https://example.com/login');
     |              ^ Error: page.goto: net::ERR_NAME_NOT_RESOLVED at https://example.com/login
  6  |   await page.fill('#username', 'testuser');
  7  |   await page.fill('#password', 'Password123');
  8  |   await page.click('button[type="submit"]');
  9  |   // Navigate to transfer page
  10 |   await page.goto('https://example.com/transfer');
  11 |   // Open source account dropdown
  12 |   const dropdown = page.locator('#source-account');
  13 |   await dropdown.click();
  14 |   // Get all options
  15 |   const options = page.locator('#source-account option');
  16 |   const count = await options.count();
  17 |   for (let i = 0; i < count; i++) {
  18 |     const option = options.nth(i);
  19 |     const type = await option.getAttribute('data-account-type');
  20 |     // Expect only savings accounts
  21 |     expect(type).toBe('savings');
  22 |   }
  23 |   // Verify no checking accounts are present
  24 |   const checkingOption = options.filter({ hasText: 'Checking' });
  25 |   await expect(checkingOption).toHaveCount(0);
  26 | });
```
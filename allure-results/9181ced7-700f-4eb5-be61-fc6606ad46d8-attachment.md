# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: transfer-amount.spec.ts >> Transfer Amount Validation >> TC-006 Reject zero or negative transfer amount
- Location: workspace\85cc89e3-46f8-4b1a-9015-11ce1d308eb8\tests\transfer-amount.spec.ts:27:7

# Error details

```
Error: page.goto: net::ERR_NAME_NOT_RESOLVED at https://example.com/login
Call log:
  - navigating to "https://example.com/login", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Transfer Amount Validation', () => {
  4  |   test.beforeEach(async ({ page }) => {
  5  |     // Placeholder for login and navigation to transfer page
> 6  |     await page.goto('https://example.com/login');
     |                ^ Error: page.goto: net::ERR_NAME_NOT_RESOLVED at https://example.com/login
  7  |     // Assume login steps
  8  |     await page.fill('#username', 'testuser');
  9  |     await page.fill('#password', 'password');
  10 |     await page.click('button:has-text("Login")');
  11 |     // Navigate to transfer page
  12 |     await page.goto('https://example.com/transfer');
  13 |     // Select source account and beneficiary (placeholders)
  14 |     await page.selectOption('#source-account', 'account-1');
  15 |     await page.selectOption('#beneficiary', 'beneficiary-1');
  16 |   });
  17 | 
  18 |   test('TC-005 Accept transfer amount greater than zero', async ({ page }) => {
  19 |     await page.fill('#transfer-amount', '100.00');
  20 |     await page.click('button:has-text("Continue")');
  21 |     // Expect navigation to authentication step
  22 |     await expect(page).toHaveURL(/.*\/authentication/);
  23 |     // No validation error
  24 |     await expect(page.locator('.error-message')).toBeHidden();
  25 |   });
  26 | 
  27 |   test('TC-006 Reject zero or negative transfer amount', async ({ page }) => {
  28 |     // Zero amount
  29 |     await page.fill('#transfer-amount', '0');
  30 |     await page.click('button:has-text("Continue")');
  31 |     await expect(page.locator('.error-message')).toContainText('Amount must be greater than zero');
  32 |     await expect(page).toHaveURL(/.*\/transfer/);
  33 |     // Negative amount
  34 |     await page.fill('#transfer-amount', '-50');
  35 |     await page.click('button:has-text("Continue")');
  36 |     await expect(page.locator('.error-message')).toContainText('Amount must be greater than zero');
  37 |     await expect(page).toHaveURL(/.*\/transfer/);
  38 |   });
  39 | 
  40 |   test('TC-007 Allow transfer amount within available balance', async ({ page }) => {
  41 |     await page.fill('#transfer-amount', '500.00');
  42 |     await page.click('button:has-text("Continue")');
  43 |     await expect(page).toHaveURL(/.*\/authentication/);
  44 |     await expect(page.locator('.error-message')).toBeHidden();
  45 |   });
  46 | 
  47 |   test('TC-008 Prevent transfer amount exceeding available balance', async ({ page }) => {
  48 |     await page.fill('#transfer-amount', '400.00');
  49 |     await page.click('button:has-text("Continue")');
  50 |     await expect(page.locator('.error-message')).toContainText('Insufficient funds');
  51 |     await expect(page).toHaveURL(/.*\/transfer/);
  52 |   });
  53 | });
```
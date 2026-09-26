# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: moneyTransfer.spec.ts >> Money Transfer Flow >> TC-004 Prevent transfer to an inactive beneficiary
- Location: workspace\85cc89e3-46f8-4b1a-9015-11ce1d308eb8\tests\moneyTransfer.spec.ts:37:7

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
  3  | test.describe('Money Transfer Flow', () => {
  4  |   test.beforeEach(async ({ page }) => {
  5  |     // Log in once for all tests
> 6  |     await page.goto('https://example.com/login');
     |                ^ Error: page.goto: net::ERR_NAME_NOT_RESOLVED at https://example.com/login
  7  |     await page.fill('input[name="username"]', 'testuser');
  8  |     await page.fill('input[name="password"]', 'Password123');
  9  |     await page.click('button:has-text("Sign In")');
  10 |     await expect(page).toHaveURL(/.*\/dashboard/);
  11 |   });
  12 | 
  13 |   test('TC-002 Select a source savings account for transfer', async ({ page }) => {
  14 |     await page.goto('https://example.com/transfer');
  15 |     await page.click('label:has-text("Source Account") + div >> role=button');
  16 |     const accountOption = page.locator('[data-test-id="account-12345"]');
  17 |     await accountOption.click();
  18 |     const sourceField = page.locator('#source-account-field');
  19 |     await expect(sourceField).toContainText('12345');
  20 |     const balance = page.locator('#source-account-balance');
  21 |     await expect(balance).toContainText('$');
  22 |   });
  23 | 
  24 |   test('TC-003 Allow transfer to an active beneficiary', async ({ page }) => {
  25 |     await page.goto('https://example.com/transfer');
  26 |     await page.click('label:has-text("Source Account") + div >> role=button');
  27 |     await page.locator('[data-test-id="account-12345"]').click();
  28 |     await page.fill('input[name="beneficiary"]', 'John Doe');
  29 |     const suggestion = page.locator('.autocomplete-item', { hasText: 'John Doe' });
  30 |     await suggestion.click();
  31 |     const continueBtn = page.locator('button:has-text("Continue")');
  32 |     await expect(continueBtn).toBeEnabled();
  33 |     const errorMsg = page.locator('.beneficiary-error');
  34 |     await expect(errorMsg).toBeHidden();
  35 |   });
  36 | 
  37 |   test('TC-004 Prevent transfer to an inactive beneficiary', async ({ page }) => {
  38 |     await page.goto('https://example.com/transfer');
  39 |     await page.click('label:has-text("Source Account") + div >> role=button');
  40 |     await page.locator('[data-test-id="account-12345"]').click();
  41 |     await page.fill('input[name="beneficiary"]', 'Jane Inactive');
  42 |     const suggestion = page.locator('.autocomplete-item', { hasText: 'Jane Inactive' });
  43 |     await suggestion.click();
  44 |     const continueBtn = page.locator('button:has-text("Continue")');
  45 |     await expect(continueBtn).toBeDisabled();
  46 |     const errorMsg = page.locator('.beneficiary-error');
  47 |     await expect(errorMsg).toHaveText(/Beneficiary is inactive/);
  48 |   });
  49 | });
```
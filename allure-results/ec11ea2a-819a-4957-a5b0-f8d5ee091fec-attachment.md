# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: transfer.spec.ts >> Transfer Feature >> TC-002: Validate source account selection is required
- Location: workspace\30f03965-613b-418c-87e7-2eaa93443e2e\tests\transfer.spec.ts:16:7

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/transfer", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Transfer Feature', () => {
  4  |   test('TC-001: Initiate transfer between own checking and savings accounts', async ({ page }) => {
  5  |     await page.goto('/transfer');
  6  |     await page.selectOption('#source-account', 'checking');
  7  |     await page.selectOption('#destination-account', 'savings');
  8  |     await page.fill('#transfer-amount', '100.00');
  9  |     await page.fill('#transfer-date', new Date().toISOString().split('T')[0]);
  10 |     await page.click('#continue-button');
  11 |     const confirmationSummary = await page.locator('#confirmation-summary');
  12 |     await expect(confirmationSummary).toBeVisible();
  13 |     await expect(page.locator('.error-message')).toHaveCount(0);
  14 |   });
  15 | 
  16 |   test('TC-002: Validate source account selection is required', async ({ page }) => {
> 17 |     await page.goto('/transfer');
     |                ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  18 |     await page.selectOption('#destination-account', 'savings');
  19 |     await page.fill('#transfer-amount', '50');
  20 |     await page.fill('#transfer-date', '2023-12-31');
  21 |     await page.click('#continue-button');
  22 |     await expect(page.locator('.error-message')).toHaveText('Please select a source account');
  23 |     const confirmationSummary = await page.locator('#confirmation-summary');
  24 |     await expect(confirmationSummary).toHaveCount(0);
  25 |   });
  26 | });
```
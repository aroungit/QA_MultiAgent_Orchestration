# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: transferValidation.spec.ts >> Transfer Page Validations >> TC-003: Validate destination account selection is required
- Location: workspace\30f03965-613b-418c-87e7-2eaa93443e2e\tests\transferValidation.spec.ts:4:7

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
  3  | test.describe('Transfer Page Validations', () => {
  4  |   test('TC-003: Validate destination account selection is required', async ({ page }) => {
> 5  |     await page.goto('/transfer');
     |                ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  6  |     await page.selectOption('#sourceAccount', 'sourceAccountId');
  7  |     await page.fill('#destinationAccount', '');
  8  |     await page.fill('#amount', '50');
  9  |     await page.fill('#transferDate', '2023-12-31');
  10 |     await page.click('#continueButton');
  11 |     const validationMessage = await page.locator('.validation-message').innerText();
  12 |     expect(validationMessage).toBe('Please select a destination account');
  13 |     await expect(page).not.toHaveURL(/confirmation/);
  14 |   });
  15 | 
  16 |   test('TC-004: Validate transfer amount entry is required', async ({ page }) => {
  17 |     await page.goto('/transfer');
  18 |     await page.selectOption('#sourceAccount', 'sourceAccountId');
  19 |     await page.selectOption('#destinationAccount', 'destinationAccountId');
  20 |     await page.fill('#amount', '');
  21 |     await page.fill('#transferDate', '2023-12-31');
  22 |     await page.click('#continueButton');
  23 |     const validationMessage = await page.locator('.validation-message').innerText();
  24 |     expect(validationMessage).toBe('Please enter a transfer amount');
  25 |     await expect(page).not.toHaveURL(/confirmation/);
  26 |   });
  27 | });
```
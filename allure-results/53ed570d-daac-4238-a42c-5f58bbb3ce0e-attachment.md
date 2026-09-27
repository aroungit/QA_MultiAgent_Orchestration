# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: transferValidation-3.spec.ts >> Transfer Validation >> TC-008: Reject past transfer dates
- Location: workspace\30f03965-613b-418c-87e7-2eaa93443e2e\tests\transferValidation-3.spec.ts:16:7

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
  3  | test.describe('Transfer Validation', () => {
  4  |   test('TC-007: Reject transfer amounts exceeding available balance', async ({ page }) => {
  5  |     await page.goto('/transfer');
  6  |     await page.selectOption('#sourceAccount', 'checking');
  7  |     await page.selectOption('#destinationAccount', 'savings');
  8  |     await page.fill('#transferAmount', '250.00');
  9  |     await page.selectOption('#transferDate', 'future');
  10 |     await page.click('#continueButton');
  11 |     const validationMessage = await page.locator('#validationMessage').innerText();
  12 |     expect(validationMessage).toBe('Insufficient funds for this transfer');
  13 |     await expect(page).not.toHaveURL(/confirmation/);
  14 |   });
  15 | 
  16 |   test('TC-008: Reject past transfer dates', async ({ page }) => {
> 17 |     await page.goto('/transfer');
     |                ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  18 |     await page.selectOption('#sourceAccount', 'checking');
  19 |     await page.selectOption('#destinationAccount', 'savings');
  20 |     await page.fill('#transferAmount', '100');
  21 |     await page.selectOption('#transferDate', 'yesterday');
  22 |     await page.click('#continueButton');
  23 |     const validationMessage = await page.locator('#validationMessage').innerText();
  24 |     expect(validationMessage).toBe('Transfer date cannot be in the past');
  25 |     await expect(page).not.toHaveURL(/confirmation/);
  26 |   });
  27 | });
```
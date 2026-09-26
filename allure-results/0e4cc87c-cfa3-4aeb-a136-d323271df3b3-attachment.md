# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: transferConfirmation.spec.ts >> Transfer confirmation and audit >> TC-011: Require re‑authentication before confirming transfer
- Location: workspace\85cc89e3-46f8-4b1a-9015-11ce1d308eb8\tests\transferConfirmation.spec.ts:9:7

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/transfer/review", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Transfer confirmation and audit', () => {
  4  |   test.beforeEach(async ({ page }) => {
  5  |     // Assume prior steps completed and we are on review screen
> 6  |     await page.goto('/transfer/review');
     |                ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  7  |   });
  8  | 
  9  |   test('TC-011: Require re‑authentication before confirming transfer', async ({ page }) => {
  10 |     await page.click('button:has-text("Confirm Transfer")');
  11 |     // OTP modal appears
  12 |     await page.fill('#otp', '123456'); // placeholder OTP
  13 |     await page.click('button:has-text("Submit OTP")');
  14 |     // Expect processing screen
  15 |     await expect(page).toHaveURL(/.*\/transfer\/processing/);
  16 |     const success = page.locator('.success-message');
  17 |     await expect(success).toBeVisible();
  18 |   });
  19 | 
  20 |   test('TC-012: Generate a unique transaction reference ID on successful transfer', async ({ page }) => {
  21 |     // Perform a successful transfer (reuse steps from TC-011)
  22 |     await page.click('button:has-text("Confirm Transfer")');
  23 |     await page.fill('#otp', '123456');
  24 |     await page.click('button:has-text("Submit OTP")');
  25 |     await expect(page).toHaveURL(/.*\/transfer\/confirmation/);
  26 |     const ref1 = page.locator('.transaction-reference');
  27 |     await expect(ref1).toBeVisible();
  28 |     const refText1 = await ref1.textContent();
  29 |     expect(refText1).toMatch(/^[A-Za-z0-9]{12}$/);
  30 | 
  31 |     // Initiate a second transfer to verify different reference
  32 |     await page.click('button:has-text("New Transfer")');
  33 |     await page.fill('input[name="transferAmount"]', '100');
  34 |     await page.click('button:has-text("Continue")');
  35 |     await page.click('button:has-text("Confirm Transfer")');
  36 |     await page.fill('#otp', '123456');
  37 |     await page.click('button:has-text("Submit OTP")');
  38 |     await expect(page).toHaveURL(/.*\/transfer\/confirmation/);
  39 |     const ref2 = page.locator('.transaction-reference');
  40 |     await expect(ref2).toBeVisible();
  41 |     const refText2 = await ref2.textContent();
  42 |     expect(refText2).toMatch(/^[A-Za-z0-9]{12}$/);
  43 |     expect(refText2).not.toBe(refText1);
  44 |   });
  45 | });
```
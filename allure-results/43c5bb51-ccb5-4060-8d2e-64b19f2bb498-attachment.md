# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: transferValidation-2.spec.ts >> Transfer Validation >> TC-006: Reject transfer amounts below the minimum of $1.00
- Location: workspace\30f03965-613b-418c-87e7-2eaa93443e2e\tests\transferValidation-2.spec.ts:17:7

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/transfer", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | test.describe("Transfer Validation", () => {
  4  |   test("TC-005: Validate transfer date entry is required", async ({ page }) => {
  5  |     await page.goto("/transfer");
  6  |     await page.selectOption('#sourceAccount', 'account1');
  7  |     await page.selectOption('#destinationAccount', 'account2');
  8  |     await page.fill('#amount', '75');
  9  |     await page.fill('#date', '');
  10 |     await page.click('#continue');
  11 |     const validationMessage = await page.locator('.validation-message').innerText();
  12 |     expect(validationMessage).toBe("Please select a transfer date");
  13 |     const confirmationScreen = await page.locator('#confirmationScreen');
  14 |     expect(await confirmationScreen.isVisible()).toBe(false);
  15 |   });
  16 | 
  17 |   test("TC-006: Reject transfer amounts below the minimum of $1.00", async ({ page }) => {
> 18 |     await page.goto("/transfer");
     |                ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  19 |     await page.selectOption('#sourceAccount', 'account1');
  20 |     await page.selectOption('#destinationAccount', 'account2');
  21 |     await page.fill('#amount', '0.50');
  22 |     await page.fill('#date', '2023-12-01');
  23 |     await page.click('#continue');
  24 |     const validationMessage = await page.locator('.validation-message').innerText();
  25 |     expect(validationMessage).toBe("Transfer amount must be at least $1.00");
  26 |     const confirmationScreen = await page.locator('#confirmationScreen');
  27 |     expect(await confirmationScreen.isVisible()).toBe(false);
  28 |   });
  29 | });
```
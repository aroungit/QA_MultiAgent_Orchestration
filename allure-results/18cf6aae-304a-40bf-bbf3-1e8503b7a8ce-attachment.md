# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: transfer.spec.ts >> Transfer validations >> TC-006: Daily transfer limit enforcement
- Location: workspace\0fd09495-4608-48f5-8979-39a2bfc7ea04\tests\transfer.spec.ts:28:7

# Error details

```
Error: page.goto: net::ERR_NAME_NOT_RESOLVED at https://example.com/dashboard
Call log:
  - navigating to "https://example.com/dashboard", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Transfer validations', () => {
  4  |   test.beforeEach(async ({ page }) => {
  5  |     // Assume user is already logged in; if not, perform login
> 6  |     await page.goto('https://example.com/dashboard');
     |                ^ Error: page.goto: net::ERR_NAME_NOT_RESOLVED at https://example.com/dashboard
  7  |     // Optionally verify login state
  8  |     await expect(page).toHaveURL(/dashboard/);
  9  |   });
  10 | 
  11 |   test('TC-005: Insufficient balance prevents transfer', async ({ page }) => {
  12 |     // Preconditions: source account balance $100 (assume displayed)
  13 |     await page.goto('https://example.com/transfer');
  14 |     // Start a new transfer
  15 |     await page.click('button:has-text("New Transfer")');
  16 |     // Enter amount $150
  17 |     await page.fill('#transfer-amount', '150');
  18 |     // Submit
  19 |     await page.click('button:has-text("Submit")');
  20 |     // Expect error message
  21 |     const error = page.locator('.notification-error');
  22 |     await expect(error).toContainText('Insufficient funds');
  23 |     // Verify balance unchanged
  24 |     const balance = page.locator('#account-balance');
  25 |     await expect(balance).toHaveText('$100');
  26 |   });
  27 | 
  28 |   test('TC-006: Daily transfer limit enforcement', async ({ page }) => {
  29 |     await page.goto('https://example.com/transfer');
  30 |     await page.click('button:has-text("New Transfer")');
  31 |     await page.fill('#transfer-amount', '150');
  32 |     await page.click('button:has-text("Submit")');
  33 |     const error = page.locator('.notification-error');
  34 |     await expect(error).toContainText('Transfer exceeds daily limit');
  35 |     const balance = page.locator('#account-balance');
  36 |     await expect(balance).toHaveText('$100');
  37 |   });
  38 | 
  39 |   test('TC-007: Transaction re‑authentication (OTP) before execution', async ({ page }) => {
  40 |     // Complete transfer form
  41 |     await page.goto('https://example.com/transfer');
  42 |     await page.click('button:has-text("New Transfer")');
  43 |     await page.fill('#transfer-amount', '50');
  44 |     await page.click('button:has-text("Submit")');
  45 |     // System prompts for OTP
  46 |     await expect(page.locator('#otp-prompt')).toBeVisible();
  47 | 
  48 |     // Correct OTP flow
  49 |     await page.fill('#otp-input', '123456');
  50 |     await page.click('button:has-text("Confirm")');
  51 |     const successMsg = page.locator('.notification-success');
  52 |     await expect(successMsg).toContainText('Transfer completed');
  53 | 
  54 |     // Restart flow for incorrect OTP
  55 |     await page.goto('https://example.com/transfer');
  56 |     await page.click('button:has-text("New Transfer")');
  57 |     await page.fill('#transfer-amount', '50');
  58 |     await page.click('button:has-text("Submit")');
  59 |     await expect(page.locator('#otp-prompt')).toBeVisible();
  60 |     await page.fill('#otp-input', '000000');
  61 |     await page.click('button:has-text("Confirm")');
  62 |     const authError = page.locator('.notification-error');
  63 |     await expect(authError).toContainText('authentication error');
  64 |   });
  65 | 
  66 |   test('TC-008: Unique transaction reference generated on successful transfer', async ({ page }) => {
  67 |     await page.goto('https://example.com/transfer');
  68 |     await page.click('button:has-text("New Transfer")');
  69 |     await page.fill('#transfer-amount', '30');
  70 |     await page.click('button:has-text("Submit")');
  71 |     // Assume OTP not required for this test or already handled
  72 |     const reference = page.locator('#transaction-reference');
  73 |     await expect(reference).toBeVisible();
  74 |     const refText = await reference.textContent();
  75 |     expect(refText?.trim().length).toBeGreaterThan(0);
  76 |   });
  77 | });
```
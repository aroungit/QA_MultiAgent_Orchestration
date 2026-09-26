# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: transfers.spec.ts >> Transfers >> TC-010: No debit occurs when transfer fails
- Location: workspace\0fd09495-4608-48f5-8979-39a2bfc7ea04\tests\transfers.spec.ts:35:7

# Error details

```
Error: page.goto: net::ERR_NAME_NOT_RESOLVED at https://bank.example.com/dashboard
Call log:
  - navigating to "https://bank.example.com/dashboard", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Transfers', () => {
  4  |   test.beforeEach(async ({ page }) => {
  5  |     // Assume user is already authenticated via storage state
> 6  |     await page.goto('https://bank.example.com/dashboard');
     |                ^ Error: page.goto: net::ERR_NAME_NOT_RESOLVED at https://bank.example.com/dashboard
  7  |   });
  8  | 
  9  |   test('TC-009: Account balance decrement and transaction history update after successful transfer', async ({ page }) => {
  10 |     // Navigate to transfer page
  11 |     await page.click('nav >> text=Transfer');
  12 |     // Select active beneficiary
  13 |     await page.selectOption('#beneficiary-select', { label: 'John Doe' });
  14 |     // Enter amount $200
  15 |     await page.fill('#transfer-amount', '200');
  16 |     // Submit transfer
  17 |     await page.click('#submit-transfer');
  18 |     // Wait for confirmation toast
  19 |     await expect(page.locator('.toast-success')).toContainText('Transfer completed');
  20 | 
  21 |     // Navigate to account summary
  22 |     await page.click('nav >> text=Account Summary');
  23 |     // Verify new balance $800
  24 |     const balanceText = await page.textContent('.balance-amount');
  25 |     expect(balanceText?.trim()).toBe('$800');
  26 | 
  27 |     // Navigate to transaction history
  28 |     await page.click('nav >> text=Transaction History');
  29 |     // Verify new transaction entry
  30 |     const transactionRow = page.locator('.transaction-row', { hasText: '$200' }).first();
  31 |     await expect(transactionRow).toContainText('John Doe');
  32 |     await expect(transactionRow).toContainText('Reference');
  33 |   });
  34 | 
  35 |   test('TC-010: No debit occurs when transfer fails', async ({ page }) => {
  36 |     // Navigate to transfer page
  37 |     await page.click('nav >> text=Transfer');
  38 |     // Select inactive beneficiary
  39 |     await page.selectOption('#beneficiary-select', { label: 'Jane Inactive' });
  40 |     // Enter amount $100
  41 |     await page.fill('#transfer-amount', '100');
  42 |     // Submit transfer
  43 |     await page.click('#submit-transfer');
  44 |     // Expect error message
  45 |     await expect(page.locator('#error-message')).toContainText('Beneficiary is not active');
  46 | 
  47 |     // Verify balance remains $500
  48 |     await page.click('nav >> text=Account Summary');
  49 |     const balanceText = await page.textContent('.balance-amount');
  50 |     expect(balanceText?.trim()).toBe('$500');
  51 | 
  52 |     // Verify no new transaction entry for $100
  53 |     await page.click('nav >> text=Transaction History');
  54 |     const failedTx = page.locator('.transaction-row', { hasText: '$100' });
  55 |     await expect(failedTx).toHaveCount(0);
  56 |   });
  57 | });
```
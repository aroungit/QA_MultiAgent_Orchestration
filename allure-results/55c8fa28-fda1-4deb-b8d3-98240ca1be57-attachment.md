# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: transfer.spec.ts >> Fund Transfer >> TC-014: Ensure no funds are deducted when a transfer fails
- Location: workspace\85cc89e3-46f8-4b1a-9015-11ce1d308eb8\tests\transfer.spec.ts:39:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('#transfer-amount')

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Fund Transfer', () => {
  4  |   test('TC-013: Update balance and transaction history after successful transfer', async ({ page }) => {
  5  |     // Assume user is already logged in and on the transfer page
  6  |     // Step: Complete the transfer
  7  |     await page.fill('#transfer-amount', '200');
  8  |     await page.selectOption('#beneficiary-select', { label: 'John Doe' });
  9  |     await page.click('text=Continue');
  10 | 
  11 |     // Re‑authentication (if prompted)
  12 |     if (await page.isVisible('#auth-password')) {
  13 |       await page.fill('#auth-password', 'password123');
  14 |       await page.click('text=Confirm');
  15 |     }
  16 | 
  17 |     // Wait for success notification
  18 |     await expect(page.locator('.notification-success')).toHaveText(/Transfer completed/);
  19 | 
  20 |     // Navigate to the source account summary page
  21 |     await page.click('nav >> text=Accounts');
  22 |     await page.click('text=Source Account'); // assumes account list
  23 | 
  24 |     // Check the displayed balance
  25 |     const balance = page.locator('.account-balance');
  26 |     await expect(balance).toHaveText('$800.00');
  27 | 
  28 |     // Open the transaction history for the source account
  29 |     await page.click('text=Transaction History');
  30 | 
  31 |     // Verify new transaction entry
  32 |     const transactionRow = page.locator('tr', { hasText: '$200.00' }).first();
  33 |     await expect(transactionRow).toContainText('John Doe');
  34 |     await expect(transactionRow).toContainText('Completed');
  35 |     // Assume reference ID is displayed in a cell with class .reference-id
  36 |     await expect(transactionRow.locator('.reference-id')).not.toBeEmpty();
  37 |   });
  38 | 
  39 |   test('TC-014: Ensure no funds are deducted when a transfer fails', async ({ page }) => {
  40 |     // Assume user is already logged in and on the transfer page
  41 |     // Step: Enter an amount of $600.00
> 42 |     await page.fill('#transfer-amount', '600');
     |                ^ Error: page.fill: Test timeout of 30000ms exceeded.
  43 |     await page.selectOption('#beneficiary-select', { label: 'Jane Smith' });
  44 |     await page.click('text=Continue');
  45 | 
  46 |     // Expect validation error
  47 |     const error = page.locator('.validation-error');
  48 |     await expect(error).toHaveText(/exceeds daily limit/);
  49 | 
  50 |     // Attempt to confirm transfer anyway (if button is still enabled)
  51 |     if (await page.isEnabled('text=Confirm')) {
  52 |       await page.click('text=Confirm');
  53 |     }
  54 | 
  55 |     // Observe the final outcome
  56 |     // Ensure transfer did not complete
  57 |     await expect(page.locator('.notification-success')).toHaveCount(0);
  58 |     await expect(page.locator('.notification-error')).toContainText(/Transfer could not be completed/);
  59 | 
  60 |     // Verify source account balance remains $500.00
  61 |     await page.click('nav >> text=Accounts');
  62 |     await page.click('text=Source Account');
  63 |     const balance = page.locator('.account-balance');
  64 |     await expect(balance).toHaveText('$500.00');
  65 | 
  66 |     // Verify no new entry in transaction history
  67 |     await page.click('text=Transaction History');
  68 |     const rows = page.locator('tr');
  69 |     // Assuming the latest transaction would have amount $600.00 if it existed
  70 |     await expect(rows.filter({ hasText: '$600.00' })).toHaveCount(0);
  71 |   });
  72 | });
```
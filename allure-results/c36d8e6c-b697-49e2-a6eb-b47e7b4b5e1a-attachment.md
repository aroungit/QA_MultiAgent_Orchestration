# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: transactionFlow.spec.ts >> TC-009: Unique transaction reference is generated on successful transfer
- Location: workspace\1d9e80c2-401b-4c53-b2af-e1d8ea210f6c\tests\transactionFlow.spec.ts:24:5

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
  3  | async function login(page) {
> 4  |   await page.goto('https://example.com/login');
     |              ^ Error: page.goto: net::ERR_NAME_NOT_RESOLVED at https://example.com/login
  5  |   await page.fill('#username', 'validUser');
  6  |   await page.fill('#password', 'validPass');
  7  |   await page.click('button[type="submit"]');
  8  |   await expect(page).toHaveURL(/\/dashboard/);
  9  | }
  10 | 
  11 | async function startTransfer(page, amount) {
  12 |   await page.click('nav >> text=Transfer Money');
  13 |   await page.selectOption('#sourceAccount', 'savings-123');
  14 |   await page.selectOption('#beneficiary', 'active-001');
  15 |   await page.fill('#amount', amount.toString());
  16 |   await page.click('button:has-text("Continue")');
  17 |   // Re‑authentication step
  18 |   await expect(page).toHaveURL(/\/transfer\/reauth/);
  19 |   await page.fill('#otp', '123456');
  20 |   await page.click('button:has-text("Confirm")');
  21 |   await expect(page).toHaveURL(/\/transfer\/confirmation/);
  22 | }
  23 | 
  24 | test('TC-009: Unique transaction reference is generated on successful transfer', async ({ page }) => {
  25 |   await login(page);
  26 |   // First transfer
  27 |   await startTransfer(page, 100);
  28 |   const ref1 = await page.textContent('#transactionReference');
  29 |   await expect(ref1).toMatch(/[A-Za-z0-9]{8,}/);
  30 |   // Return to dashboard to start a second transfer
  31 |   await page.click('nav >> text=Dashboard');
  32 |   await startTransfer(page, 150);
  33 |   const ref2 = await page.textContent('#transactionReference');
  34 |   await expect(ref2).toMatch(/[A-Za-z0-9]{8,}/);
  35 |   // References should be different
  36 |   expect(ref1).not.toBe(ref2);
  37 | });
  38 | 
  39 | test('TC-010: Balance and transaction history update after successful transfer', async ({ page }) => {
  40 |   await login(page);
  41 |   // Assume initial balance $1000 displayed on account summary
  42 |   await page.click('nav >> text=Account Summary');
  43 |   const initialBalanceText = await page.textContent('#balance');
  44 |   const initialBalance = parseFloat(initialBalanceText.replace(/[^0-9.-]+/g, ''));
  45 |   expect(initialBalance).toBe(1000);
  46 |   // Perform transfer of $200
  47 |   await startTransfer(page, 200);
  48 |   // Verify new balance
  49 |   await page.click('nav >> text=Account Summary');
  50 |   const newBalanceText = await page.textContent('#balance');
  51 |   const newBalance = parseFloat(newBalanceText.replace(/[^0-9.-]+/g, ''));
  52 |   expect(newBalance).toBe(800);
  53 |   // Verify transaction history entry
  54 |   await page.click('nav >> text=Transaction History');
  55 |   const latestEntry = page.locator('.transaction-row').first();
  56 |   await expect(latestEntry).toContainText('$200');
  57 |   await expect(latestEntry).toContainText('active-001');
  58 |   const reference = await latestEntry.textContent();
  59 |   await expect(reference).toMatch(/[A-Za-z0-9]{8,}/);
  60 | });
  61 | 
  62 | test('TC-011: No funds are deducted when transfer fails', async ({ page }) => {
  63 |   await login(page);
  64 |   // Verify starting balance $500
  65 |   await page.click('nav >> text=Account Summary');
  66 |   const startBalText = await page.textContent('#balance');
  67 |   const startBal = parseFloat(startBalText.replace(/[^0-9.-]+/g, ''));
  68 |   expect(startBal).toBe(500);
  69 |   // Attempt transfer that exceeds daily limit
  70 |   await page.click('nav >> text=Transfer Money');
  71 |   await page.selectOption('#sourceAccount', 'savings-123');
  72 |   await page.selectOption('#beneficiary', 'active-001');
  73 |   await page.fill('#amount', '100'); // would exceed remaining $50 of $300 limit
  74 |   await page.click('button:has-text("Continue")');
  75 |   // Expect daily limit error before re‑auth
  76 |   await expect(page.locator('text=Daily transfer limit exceeded')).toBeVisible();
  77 |   // Balance should remain unchanged
  78 |   await page.click('nav >> text=Account Summary');
  79 |   const afterBalText = await page.textContent('#balance');
  80 |   const afterBal = parseFloat(afterBalText.replace(/[^0-9.-]+/g, ''));
  81 |   expect(afterBal).toBe(500);
  82 |   // No new transaction entry
  83 |   await page.click('nav >> text=Transaction History');
  84 |   const rows = await page.locator('.transaction-row').count();
  85 |   // Assuming there were no prior entries for this test, count should be 0
  86 |   expect(rows).toBe(0);
  87 | });
```
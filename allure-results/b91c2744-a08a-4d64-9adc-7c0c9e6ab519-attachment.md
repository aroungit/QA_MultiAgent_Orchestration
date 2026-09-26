# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.ts >> TC-001: Unauthenticated user cannot access money transfer page
- Location: workspace\1d9e80c2-401b-4c53-b2af-e1d8ea210f6c\tests\auth.spec.ts:12:5

# Error details

```
Error: page.goto: net::ERR_NAME_NOT_RESOLVED at https://example.com
Call log:
  - navigating to "https://example.com", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | // Helper to perform login
  4  | async function login(page) {
  5  |   await page.goto('https://example.com/login');
  6  |   await page.fill('#username', 'validUser');
  7  |   await page.fill('#password', 'validPass');
  8  |   await page.click('button[type="submit"]');
  9  |   await expect(page).toHaveURL(/\/dashboard/);
  10 | }
  11 | 
  12 | test('TC-001: Unauthenticated user cannot access money transfer page', async ({ page }) => {
  13 |   // Open the application URL
> 14 |   await page.goto('https://example.com');
     |              ^ Error: page.goto: net::ERR_NAME_NOT_RESOLVED at https://example.com
  15 |   // Directly navigate to the transfer page
  16 |   await page.goto('https://example.com/transfer');
  17 |   // Expect redirect to login page
  18 |   await expect(page).toHaveURL(/\/login/);
  19 |   // Verify authentication required message
  20 |   await expect(page.locator('text=Authentication required')).toBeVisible();
  21 | });
  22 | 
  23 | test('TC-002: Authenticated user can access money transfer page', async ({ page }) => {
  24 |   await page.goto('https://example.com');
  25 |   await login(page);
  26 |   // Click the Transfer Money menu item
  27 |   await page.click('nav >> text=Transfer Money');
  28 |   await expect(page).toHaveURL(/\/transfer/);
  29 |   // Verify transfer fields are visible
  30 |   await expect(page.locator('#sourceAccount')).toBeVisible();
  31 |   await expect(page.locator('#beneficiary')).toBeVisible();
  32 |   await expect(page.locator('#amount')).toBeVisible();
  33 | });
  34 | 
  35 | test('TC-008: User re‑authentication required before confirming transfer', async ({ page }) => {
  36 |   await page.goto('https://example.com');
  37 |   await login(page);
  38 |   // Navigate to transfer page and fill valid details
  39 |   await page.click('nav >> text=Transfer Money');
  40 |   await page.selectOption('#sourceAccount', 'savings-123');
  41 |   await page.selectOption('#beneficiary', 'beneficiary-456');
  42 |   await page.fill('#amount', '150');
  43 |   await page.click('button:has-text("Continue")');
  44 |   // Assume re‑authentication screen appears
  45 |   await expect(page).toHaveURL(/\/transfer\/reauth/);
  46 |   // Enter incorrect OTP
  47 |   await page.fill('#otp', '000000');
  48 |   await page.click('button:has-text("Confirm")');
  49 |   await expect(page.locator('text=Invalid authentication code')).toBeVisible();
  50 |   // Enter correct OTP
  51 |   await page.fill('#otp', '123456');
  52 |   await page.click('button:has-text("Confirm")');
  53 |   // Verify transfer proceeds to confirmation screen
  54 |   await expect(page).toHaveURL(/\/transfer\/confirmation/);
  55 | });
```
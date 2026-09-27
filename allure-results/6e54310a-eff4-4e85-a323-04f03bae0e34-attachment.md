# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.v3.spec.ts >> Authentication Tests >> TC-006: Error Message for Invalid Credentials
- Location: workspace\5f586ed1-73c8-4008-821f-e1d79c636a8a\execution\approved-tests\auth.v3.spec.ts:4:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('input[name="username"]')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e8]:
    - heading "Leaftaps Login" [level=2] [ref=e9]
    - generic [ref=e10]:
      - paragraph [ref=e11]:
        - generic [ref=e12]: Username
        - textbox "Username" [ref=e13]
      - paragraph [ref=e14]:
        - generic [ref=e15]: Password
        - textbox "Password" [ref=e16]
      - paragraph [ref=e17]:
        - button "Login" [ref=e18]
  - generic [ref=e19]: Welcome to Leaftaps Application - TestLeaf environment for automation engineering learning.
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Authentication Tests', () => {
  4  |   test('TC-006: Error Message for Invalid Credentials', async ({ page }) => {
  5  |     await page.goto('https://leaftaps.com/opentaps/control/main');
> 6  |     await page.fill('input[name="username"]', 'invalidUser');
     |                ^ Error: page.fill: Test timeout of 30000ms exceeded.
  7  |     await page.fill('input[name="password"]', 'wrongPassword');
  8  |     await page.click('button[type="submit"]');
  9  |     const errorMessage = await page.locator('.error-message'); // Adjust selector based on actual implementation
  10 |     await expect(errorMessage).toBeVisible();
  11 |   });
  12 | 
  13 |   test('TC-005: Display Home Page After Login', async ({ page }) => {
  14 |     await page.goto('https://leaftaps.com/opentaps/control/main');
  15 |     await page.fill('input[name="username"]', 'Democsr2');
  16 |     await page.fill('input[name="password"]', 'crmsfa');
  17 |     await page.click('button[type="submit"]');
  18 |     await expect(page).toHaveURL(/.*home/); // Adjust based on actual home page URL
  19 |     await expect(page.locator('h1')).toHaveText('Welcome to Leaftaps'); // Adjust selector based on actual implementation
  20 |   });
  21 | });
```
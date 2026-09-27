# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: login-2.v3.spec.ts >> Login Page >> TC-004: Successful Login
- Location: workspace\5f586ed1-73c8-4008-821f-e1d79c636a8a\execution\approved-tests\login-2.v3.spec.ts:12:7

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
  3  | test.describe('Login Page', () => {
  4  |   test('TC-003: Login Button Click', async ({ page }) => {
  5  |     await page.goto('https://leaftaps.com/opentaps/control/main');
  6  |     const loginButton = page.locator('button[type="submit"]');
  7  |     await expect(loginButton).toBeVisible();
  8  |     await loginButton.click();
  9  |     // TODO: Add assertion to verify the response after clicking the button.
  10 |   });
  11 | 
  12 |   test('TC-004: Successful Login', async ({ page }) => {
  13 |     await page.goto('https://leaftaps.com/opentaps/control/main');
> 14 |     await page.fill('input[name="username"]', 'Democsr2');
     |                ^ Error: page.fill: Test timeout of 30000ms exceeded.
  15 |     await page.fill('input[name="password"]', 'crmsfa');
  16 |     await page.click('button[type="submit"]');
  17 |     // TODO: Add assertion to verify successful login.
  18 |   });
  19 | });
```
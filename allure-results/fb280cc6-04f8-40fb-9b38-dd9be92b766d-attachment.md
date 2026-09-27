# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.v2.spec.ts >> TC-001: User Login Success
- Location: workspace\a08e66e2-5bd1-447e-a4fc-2686e1db5ec3\tests\auth.v2.spec.ts:3:5

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
  3  | test('TC-001: User Login Success', async ({ page }) => {
  4  |   await page.goto('https://leaftaps.com/opentaps/control/main');
> 5  |   await page.fill('input[name="username"]', 'Democsr2');
     |              ^ Error: page.fill: Test timeout of 30000ms exceeded.
  6  |   await page.fill('input[name="password"]', 'crmsfa');
  7  |   await page.click('button[type="submit"]');
  8  |   await expect(page).toHaveURL('/dashboard');
  9  |   await expect(page.locator('h1')).toHaveText('Welcome, Democsr2');
  10 | });
```
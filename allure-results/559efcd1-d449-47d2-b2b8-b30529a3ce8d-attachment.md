# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: createLead.v2.spec.ts >> Create Lead Page >> TC-004: Enter Last Name
- Location: workspace\a08e66e2-5bd1-447e-a4fc-2686e1db5ec3\tests\createLead.v2.spec.ts:19:7

# Error details

```
Test timeout of 30000ms exceeded while running "beforeEach" hook.
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
  3  | test.describe('Create Lead Page', () => {
  4  |   test.beforeEach(async ({ page }) => {
  5  |     await page.goto('https://leaftaps.com/opentaps/control/main');
> 6  |     await page.fill('input[name="username"]', 'Democsr2');
     |                ^ Error: page.fill: Test timeout of 30000ms exceeded.
  7  |     await page.fill('input[name="password"]', 'crmsfa');
  8  |     await page.click('button[type="submit"]');
  9  |     await page.click('text=Leads');
  10 |     await page.click('text=Create Lead');
  11 |   });
  12 | 
  13 |   test('TC-003: Enter First Name', async ({ page }) => {
  14 |     const firstNameInput = page.locator('#first-name');
  15 |     await firstNameInput.fill('John');
  16 |     await expect(firstNameInput).toHaveValue('John');
  17 |   });
  18 | 
  19 |   test('TC-004: Enter Last Name', async ({ page }) => {
  20 |     const lastNameInput = page.locator('#last-name');
  21 |     await lastNameInput.fill('Doe');
  22 |     await expect(lastNameInput).toHaveValue('Doe');
  23 |   });
  24 | });
```
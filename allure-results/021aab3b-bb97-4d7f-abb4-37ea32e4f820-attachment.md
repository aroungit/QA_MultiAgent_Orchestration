# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: createLead-2.v2.spec.ts >> Create Lead Page >> TC-005: Enter Company Name
- Location: workspace\a08e66e2-5bd1-447e-a4fc-2686e1db5ec3\tests\createLead-2.v2.spec.ts:13:7

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
  13 |   test('TC-005: Enter Company Name', async ({ page }) => {
  14 |     const companyNameInput = page.locator('#company-name');
  15 |     await companyNameInput.fill('Valid Company Name');
  16 |     await expect(companyNameInput).toHaveValue('Valid Company Name');
  17 |   });
  18 | 
  19 |   test('TC-006: Click Create Lead Button', async ({ page }) => {
  20 |     await page.fill('#company-name', 'Valid Company Name');
  21 |     await page.click('#create-lead-button');
  22 |     const successMessage = page.locator('.success-message');
  23 |     await expect(successMessage).toBeVisible();
  24 |   });
  25 | });
```
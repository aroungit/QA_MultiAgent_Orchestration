# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: createLead-2.spec.ts >> Create Lead Page >> TC-005: Enter Company Name
- Location: workspace\a08e66e2-5bd1-447e-a4fc-2686e1db5ec3\tests\createLead-2.spec.ts:4:7

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/create-lead", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Create Lead Page', () => {
  4  |   test('TC-005: Enter Company Name', async ({ page }) => {
> 5  |     await page.goto('/create-lead');
     |                ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  6  |     const companyNameInput = page.locator('#company-name');
  7  |     await companyNameInput.fill('Valid Company Name');
  8  |     const value = await companyNameInput.inputValue();
  9  |     expect(value).toBe('Valid Company Name');
  10 |   });
  11 | 
  12 |   test('TC-006: Click Create Lead Button', async ({ page }) => {
  13 |     await page.goto('/create-lead');
  14 |     await page.fill('#company-name', 'Valid Company Name');
  15 |     await page.click('#create-lead-button');
  16 |     // Add assertion to verify lead creation, e.g., check for a success message
  17 |     const successMessage = page.locator('.success-message');
  18 |     await expect(successMessage).toBeVisible();
  19 |   });
  20 | });
```
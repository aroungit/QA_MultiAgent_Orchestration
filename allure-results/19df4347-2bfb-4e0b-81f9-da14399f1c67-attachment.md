# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: createLead-2.spec.ts >> Create Lead page >> TC-006: Submit lead creation
- Location: workspace\1b0ce88c-f652-418d-a320-10ab660cde8f\tests\createLead-2.spec.ts:16:7

# Error details

```
Error: page.goto: net::ERR_NAME_NOT_RESOLVED at https://example.com/leads/create
Call log:
  - navigating to "https://example.com/leads/create", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Create Lead page', () => {
  4  |   test.beforeEach(async ({ page }) => {
  5  |     // Navigate to the Create Lead page; adjust the base URL as needed
> 6  |     await page.goto('https://example.com/leads/create');
     |                ^ Error: page.goto: net::ERR_NAME_NOT_RESOLVED at https://example.com/leads/create
  7  |   });
  8  | 
  9  |   test('TC-005: Enter lead company name', async ({ page }) => {
  10 |     const companyInput = page.locator('input[name="companyName"]');
  11 |     await expect(companyInput).toBeVisible();
  12 |     await companyInput.fill('Acme Corp');
  13 |     await expect(companyInput).toHaveValue('Acme Corp');
  14 |   });
  15 | 
  16 |   test('TC-006: Submit lead creation', async ({ page }) => {
  17 |     // Ensure required fields are populated (precondition)
  18 |     await page.locator('input[name="firstName"]').fill('John');
  19 |     await page.locator('input[name="lastName"]').fill('Doe');
  20 |     await page.locator('input[name="companyName"]').fill('Acme Corp');
  21 | 
  22 |     const createButton = page.locator('button:has-text("Create Lead")');
  23 |     await expect(createButton).toBeEnabled();
  24 |     await createButton.click();
  25 | 
  26 |     // Wait for loading indicator to disappear
  27 |     const loading = page.locator('.loading-spinner');
  28 |     await expect(loading).toBeHidden();
  29 | 
  30 |     // Verify navigation to confirmation or lead details view
  31 |     await expect(page).toHaveURL(/.*lead\/\d+/);
  32 |     await expect(page.locator('h1')).toContainText('Lead Details');
  33 |   });
  34 | });
```
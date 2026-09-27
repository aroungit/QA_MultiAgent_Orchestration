# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: lead.spec.ts >> TC-007: Verify lead record is created successfully
- Location: workspace\1b0ce88c-f652-418d-a320-10ab660cde8f\tests\lead.spec.ts:5:5

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/leads/create", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | let leadId: string;
  4  | 
  5  | test('TC-007: Verify lead record is created successfully', async ({ page }) => {
  6  |   // Navigate to lead creation page
> 7  |   await page.goto('/leads/create');
     |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  8  |   // Assume form is already filled as part of precondition or prior test
  9  |   await page.click('button:has-text("Create Lead")');
  10 |   // Wait for success message
  11 |   const successMessage = await page.waitForSelector('text=Lead created successfully');
  12 |   await expect(successMessage).toBeVisible();
  13 |   // Capture Lead ID
  14 |   const leadIdElement = await page.waitForSelector('[data-test-id="lead-id"]');
  15 |   leadId = (await leadIdElement.textContent())?.trim() ?? '';
  16 |   expect(leadId).not.toBe('');
  17 | });
  18 | 
  19 | test('TC-008: Display newly created lead details', async ({ page }) => {
  20 |   // Ensure leadId is available from previous test
  21 |   expect(leadId).toBeTruthy();
  22 |   // Navigate to lead details page
  23 |   await page.goto(`/leads/${leadId}`);
  24 |   // Verify fields
  25 |   await expect(page.locator('[data-test-id="first-name"]').first()).toHaveText('John');
  26 |   await expect(page.locator('[data-test-id="last-name"]').first()).toHaveText('Doe');
  27 |   await expect(page.locator('[data-test-id="company-name"]').first()).toHaveText('Acme Corp');
  28 |   await expect(page.locator('[data-test-id="lead-id"]').first()).toHaveText(leadId);
  29 | });
  30 | 
```
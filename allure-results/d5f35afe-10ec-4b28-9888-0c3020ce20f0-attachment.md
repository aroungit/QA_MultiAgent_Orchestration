# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: navigation.spec.ts >> TC-002: Navigate to Create Lead
- Location: workspace\a08e66e2-5bd1-447e-a4fc-2686e1db5ec3\tests\navigation.spec.ts:3:5

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/dashboard", waiting until "load"

```

# Test source

```ts
  1 | import { test, expect } from '@playwright/test';
  2 | 
  3 | test('TC-002: Navigate to Create Lead', async ({ page }) => {
> 4 |   await page.goto('/dashboard');
    |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  5 |   await page.click('text=Leads');
  6 |   await page.click('text=Create Lead');
  7 |   await expect(page).toHaveURL('/leads/create');
  8 | });
```
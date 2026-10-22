import { test, expect } from '@playwright/test';

test('トップページが表示される', { tag: '@smoke' }, async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.ok()).toBeTruthy();
  await expect(page.locator('body')).toBeVisible();
});

import { test, expect } from '@playwright/test';

test.describe('認証', { tag: '@smoke' }, () => {
  test('未ログインで認証必須ページにアクセスすると /login へリダイレクトされる', async ({ page }) => {
    await page.goto('/articles');
    await expect(page).toHaveURL(/\/login(\?|$)/);
  });

  test('誤った認証情報でログインするとエラーが表示される', async ({ page }) => {
    await page.goto('/login');

    await page.getByPlaceholder('メールアドレス').fill('e2e-notexist@example.com');
    await page.getByPlaceholder('パスワード').fill('wrongpassword');
    await page.locator('button[type="submit"]').filter({ hasText: 'ログイン' }).click();

    await expect(page.getByText('メールアドレスまたはパスワードが間違っています')).toBeVisible();
  });
});

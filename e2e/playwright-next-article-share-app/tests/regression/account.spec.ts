import { test, expect } from '../../fixtures';
import { signup, login, logout, withdraw, submitLogin } from '../../helpers/auth';

// シナリオ 4: 新規登録 → ログアウト → ログイン → 退会
test('新規登録 → ログアウト → ログイン → 退会ができる', async ({ page, testUser }) => {
  await test.step('新規登録', async () => {
    await signup(page, testUser);
    await expect(page).not.toHaveURL(/\/signup/);
  });

  await test.step('ログアウトすると認証必須ページに入れない', async () => {
    await logout(page);
    await page.goto('/articles');
    await expect(page).toHaveURL(/\/login(\?|$)/);
  });

  await test.step('ログイン', async () => {
    await login(page, testUser);
    await page.goto('/articles');
    await expect(page).toHaveURL(/\/articles$/);
  });

  await test.step('退会すると同じ認証情報でログインできない', async () => {
    await withdraw(page);
    await submitLogin(page, testUser);
    await expect(page.getByText('メールアドレスまたはパスワードが間違っています')).toBeVisible();
  });
});

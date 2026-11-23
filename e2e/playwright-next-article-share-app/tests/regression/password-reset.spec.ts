import { test, expect } from '@playwright/test';
import { uniqueId } from '../../helpers/auth';

// 本番では流さない（台帳で対象外）。未登録のアドレスなのでメールは送られず、データも作らない
// 期待結果: 登録の有無が分からない表示（アカウント列挙の対策）
test('[AUTH-013] 未登録のメールアドレスでパスワードリセットを要求したときの表示', async ({ page }) => {
  await page.goto('/forgot-password');
  await page.getByPlaceholder('メールアドレス').fill(`e2e-notexist-${uniqueId()}@example.com`);
  await page.locator('button[type="submit"]').filter({ hasText: 'リセットリンクを送信' }).click();

  await expect(page.getByText('メール送信完了')).toBeVisible();
  await expect(
    page.getByText('登録されているメールアドレスの場合、パスワードリセットのメールを送信しました'),
  ).toBeVisible();
});

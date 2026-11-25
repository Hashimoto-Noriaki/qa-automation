import { test, expect } from '../../fixtures';
import { submitSignup } from '../../helpers/auth';

// 本番では流さない（台帳で手動。実ユーザーが作られるため）。
// 書き込み許可ホストに限定する testUser の fixture を使い、テスト後に退会させる
test('[AUTH-004] 新規登録できる', async ({ page, testUser }) => {
  await submitSignup(page, testUser);

  // ログイン後の画面（記事一覧）に遷移する。/articles は認証必須なので、ここに居られること自体がログイン状態の確認になる
  await expect(page).toHaveURL(/\/articles$/);
  // ヘッダーがログイン中の表示（ログアウトボタン）になっている
  await expect(page.getByRole('button', { name: 'ログアウト', exact: true })).toBeVisible();

  // 再読み込みしてもログイン状態が保たれる（セッションが保存されている）
  await page.reload();
  await expect(page).toHaveURL(/\/articles$/);
  await expect(page.getByRole('button', { name: 'ログアウト', exact: true })).toBeVisible();
});

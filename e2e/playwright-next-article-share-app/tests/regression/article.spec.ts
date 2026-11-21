import { test, expect } from '../../fixtures';
import { createTestArticle, createArticle, openArticleFromList } from '../../helpers/article';

// シナリオ 5: 記事を作成 → 一覧・詳細に表示 → 編集 → 削除
// 途中で失敗して記事が残っても、testUser の退会で記事ごと削除される
test('記事を作成 → 一覧・詳細に表示 → 編集 → 削除ができる', async ({ loggedInPage: page }) => {
  const article = createTestArticle();
  const updatedTitle = `${article.title}-edited`;

  await test.step('作成すると一覧に表示される', async () => {
    await createArticle(page, article);
    await expect(page.getByText(article.title).first()).toBeVisible();
  });

  await test.step('詳細にタイトルが表示される', async () => {
    await openArticleFromList(page, article.title);
    await expect(page.getByRole('heading', { name: article.title })).toBeVisible();
  });

  await test.step('編集するとタイトルが更新される', async () => {
    await page.getByRole('link', { name: '編集', exact: true }).click();
    await page.waitForURL(/\/articles\/[^/]+\/edit/);
    const titleInput = page.getByPlaceholder('タイトルを入力してください');
    await titleInput.fill(updatedTitle);
    await page.locator('button').filter({ hasText: '更新する' }).click();
    await page.waitForURL(/\/articles\/[^/]+$/);
    await expect(page.getByRole('heading', { name: updatedTitle })).toBeVisible();
  });

  await test.step('削除すると一覧から消える', async () => {
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: '削除', exact: true }).click();
    await page.waitForURL(/\/articles$/);
    await expect(page.getByText(updatedTitle)).toHaveCount(0);
  });
});

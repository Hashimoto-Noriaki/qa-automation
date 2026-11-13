import { Page } from '@playwright/test';
import { uniqueId } from './auth';

export interface TestArticle {
  title: string;
  tags: string;
  body: string;
}

export function createTestArticle(): TestArticle {
  const id = uniqueId();
  return {
    title: `e2e-記事-${id}`,
    tags: 'e2e playwright',
    body: `## e2e テスト本文\n\n外部 E2E で作成した記事です。ID: ${id}`,
  };
}

/** /articles/new から公開する。公開後は /articles にリダイレクトされる */
export async function createArticle(page: Page, article: TestArticle) {
  await page.goto('/articles/new');
  await page.getByPlaceholder('タイトルを入力してください').fill(article.title);
  await page
    .getByPlaceholder('タグを入力してください。スペース区切りで5つまで入力できます。')
    .fill(article.tags);
  await page
    .getByPlaceholder('エンジニアに関わる知識をMarkdown記法で書いて共有しよう')
    .fill(article.body);
  await page.locator('button').filter({ hasText: '公開設定へ' }).click();
  await page.waitForURL(/\/articles$/);
}

/** 記事一覧からタイトルをクリックして詳細ページへ移動する */
export async function openArticleFromList(page: Page, title: string) {
  await page.goto('/articles');
  await page.getByText(title).first().click();
  await page.waitForURL(/\/articles\/[^/]+$/);
}

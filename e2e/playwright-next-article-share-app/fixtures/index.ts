import { test as base, expect, Page } from '@playwright/test';
import { createTestUser, signup, tryLogin, withdraw, TestUser } from '../helpers/auth';

type Fixtures = {
  /**
   * e2e- で始まる使い捨てユーザーの認証情報（登録はしない）。
   * テスト終了後、登録済みなら別コンテキストでログインして退会させる。
   * 退会で投稿記事も消えるため、記事の後片付けもこれでまかなえる。
   */
  testUser: TestUser;
  /** testUser で新規登録し、ログイン済みになった page */
  loggedInPage: Page;
};

/**
 * 書き込み系テストを流してよいホスト。ここに無いホスト（本番など）では書き込み系テストをスキップする。
 * 付け忘れで本番に書き込まないよう、許可制にしている。環境を増やしたらここに足す。
 */
const WRITABLE_HOSTS = ['localhost', '127.0.0.1', 'article-share-stg.vercel.app'];

export const test = base.extend<Fixtures>({
  testUser: async ({ browser, baseURL }, use) => {
    const host = new URL(baseURL ?? 'http://localhost:3000').hostname;
    test.skip(
      !WRITABLE_HOSTS.includes(host),
      `${host} は書き込み許可リスト（fixtures/index.ts）に無いため、書き込み系テストをスキップ`,
    );

    const user = createTestUser();
    await use(user);

    // 後片付け: テスト本体のセッション状態に依存しないよう新しいコンテキストで行う
    const context = await browser.newContext({ baseURL });
    try {
      const page = await context.newPage();
      if (await tryLogin(page, user)) {
        await withdraw(page);
      }
    } finally {
      await context.close();
    }
  },

  loggedInPage: async ({ page, testUser }, use) => {
    await signup(page, testUser);
    await use(page);
  },
});

export { expect };

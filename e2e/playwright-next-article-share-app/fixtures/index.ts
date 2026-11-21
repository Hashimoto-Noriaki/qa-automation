import { test as base, expect, Page } from '@playwright/test';
import { createTestUser, signup, tryLogin, withdraw, TestUser } from '../helpers/auth';
import environments from '../environments.json';

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
 * 付け忘れで本番に書き込まないよう、許可制にしている。
 * environments.json（local / stg）のホストから作るので、環境を増やすときは environments.json に足す。
 * 本番は environments.json にも、ここにも足さない（本番の URL は PROD_URL で渡す）。
 */
const WRITABLE_HOSTS = ['127.0.0.1', ...Object.values(environments).map((url) => new URL(url).hostname)];

export const test = base.extend<Fixtures>({
  testUser: async ({ browser, baseURL }, use, testInfo) => {
    // @smoke は本番でも流すため、書き込み系の fixture を使わせない（check.sh のすり抜け対策）
    if (testInfo.tags.includes('@smoke')) {
      throw new Error('@smoke のテストでは書き込み系の fixture（testUser / loggedInPage）を使えません');
    }
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

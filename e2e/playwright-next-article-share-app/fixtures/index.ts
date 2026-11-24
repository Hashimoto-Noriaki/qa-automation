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
  /**
   * testUser 以外の認証情報も後片付けの対象にする。
   * 入力チェックのテストで、チェックが壊れて別のパスワードなどで登録されてしまった場合に備える。
   * 登録を送信する前に呼ぶ。テスト終了時に testUser と同じ方法（ログインできたら退会）で片付ける。
   */
  cleanupAlso: (user: TestUser) => void;
};

type InternalFixtures = {
  /** cleanupAlso で登録された認証情報。testUser の後片付けで使う */
  _cleanupTargets: TestUser[];
};

/**
 * 書き込み系テストを流してよいホスト。ここに無いホスト（本番など）では書き込み系テストをスキップする。
 * 付け忘れで本番に書き込まないよう、許可制にしている。
 * environments.json（local / stg）のホストから作るので、環境を増やすときは environments.json に足す。
 * 本番は environments.json にも、ここにも足さない（本番の URL は PROD_URL で渡す）。
 */
const WRITABLE_HOSTS = ['127.0.0.1', ...Object.values(environments).map((url) => new URL(url).hostname)];

export const test = base.extend<Fixtures & InternalFixtures>({
  _cleanupTargets: async ({}, use) => {
    await use([]);
  },

  testUser: async ({ browser, baseURL, _cleanupTargets }, use, testInfo) => {
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

    // 後片付け: テスト本体のセッション状態に依存しないよう、認証情報ごとに新しいコンテキストで行う。
    // テスト終了後に判定するので、テスト中に登録が終わらず遅れて完了した場合も拾える。
    // 1 件失敗しても残りは片付けるため、エラーは集めて最後にまとめて投げる
    const errors: string[] = [];
    for (const target of [user, ..._cleanupTargets]) {
      const context = await browser.newContext({ baseURL });
      try {
        const page = await context.newPage();
        if (await tryLogin(page, target)) {
          await withdraw(page);
        }
      } catch (e) {
        errors.push(`${target.email}: ${e instanceof Error ? e.message : String(e)}`);
      } finally {
        await context.close();
      }
    }
    if (errors.length) {
      throw new Error(`後片付けに失敗した認証情報があります（データが残っている可能性あり）\n${errors.join('\n')}`);
    }
  },

  loggedInPage: async ({ page, testUser }, use) => {
    await signup(page, testUser);
    await use(page);
  },

  // testUser に依存させ、書き込み許可ホストのチェックと後片付けの順番（testUser より先に破棄）を揃える
  cleanupAlso: async ({ testUser: _testUser, _cleanupTargets }, use) => {
    await use((user) => {
      _cleanupTargets.push(user);
    });
  },
});

export { expect };

import { test, expect } from '../../fixtures';
import { createPassword, logout, submitSignup, tryLogin } from '../../helpers/auth';

// 本番では流さない（台帳で対象外）。チェックが壊れていると登録されてしまうため、
// 書き込み許可ホストに限定する testUser の fixture を使う。
// testUser 以外の認証情報で送るときは、送信前に cleanupAlso に登録して後片付けの対象にする

test('[AUTH-005] 新規登録の入力チェックでエラーが表示される', async ({ page, testUser, cleanupAlso }) => {
  await test.step('必須項目が空欄だと各項目にエラーが表示される', async () => {
    await submitSignup(page, { name: '', email: '', password: '' });
    await expect(page.getByText('名前を入力してください')).toBeVisible();
    await expect(page.getByText('メールアドレスを入力してください')).toBeVisible();
    await expect(page.getByText('パスワードを入力してください')).toBeVisible();
    await expect(page).toHaveURL(/\/signup$/);
  });

  await test.step('パスワードが 8 文字未満だとエラーが表示される', async () => {
    const shortPassword = { ...testUser, password: createPassword(7) }; // 7 文字（境界値）
    cleanupAlso(shortPassword);
    await submitSignup(page, shortPassword);
    await expect(page.getByText('パスワードは8文字以上にしてください')).toBeVisible();
    await expect(page).toHaveURL(/\/signup$/);
  });

  // 不正な形式のメールで登録されてしまうと、ログイン画面も形式で弾くため UI から片付けられない。
  // そのため、このステップでは同じオリジンへの POST を遮断して書き込みを起こさせない。
  // 遮断はテストの最後まで外さないので、このステップは最後に置く。
  // 遮断した件数の確認は補助（送信が遅れて始まると確認の時点では 0 件のことがある）。
  // 送信されないことの主な根拠は、ブラウザのチェックが効いていること（validity と noValidate）。
  // なお、ブラウザのチェックを外してもアプリ側の「有効なメールアドレスを入力してください」で止まる（stg で確認）
  await test.step('メールアドレスの形式が不正だと送信されない', async () => {
    const origin = new URL(page.url()).origin;
    const blockedPosts: string[] = [];
    await page.route(
      (url) => url.origin === origin,
      (route) => {
        if (route.request().method() === 'POST') {
          blockedPosts.push(route.request().url());
          return route.abort();
        }
        return route.continue();
      },
    );

    // type="email" のブラウザ標準チェックで止まる（アプリの文言は出ない）。
    // メッセージはブラウザの言語で変わるため、文言ではなく validity で確かめる。
    // typeMismatch はフォームに noValidate が付いても true のままなので、
    // ブラウザのチェックが効いている（noValidate でない）ことも合わせて確かめる
    await submitSignup(page, { ...testUser, email: 'e2e-not-an-email' });
    const state = await page.getByPlaceholder('メールアドレス').evaluate((el: HTMLInputElement) => ({
      typeMismatch: el.validity.typeMismatch,
      noValidate: el.form?.noValidate,
    }));
    expect(state).toEqual({ typeMismatch: true, noValidate: false });
    expect(blockedPosts).toEqual([]);
  });
});

test('[AUTH-006] 登録済みのメールアドレスでは新規登録できない', async ({ loggedInPage: page, testUser, cleanupAlso }) => {
  // 同じメールアドレス・別のパスワード。登録されてしまったら、このパスワードでログインできるようになる
  const duplicate = { name: 'e2e-dup', email: testUser.email, password: createPassword(12) };
  cleanupAlso(duplicate);
  await logout(page);

  await test.step('エラーが表示される', async () => {
    await submitSignup(page, duplicate);
    await expect(page.getByText('このメールアドレスは既に登録されています')).toBeVisible();
    await expect(page).toHaveURL(/\/signup$/);
  });

  await test.step('登録されない（送ったパスワードではログインできない）', async () => {
    expect(await tryLogin(page, duplicate)).toBe(false);
  });
});

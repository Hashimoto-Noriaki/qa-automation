import { Page } from '@playwright/test';

export interface TestUser {
  name: string;
  email: string;
  password: string;
}

/** 実行ごとにユニークな値。デプロイ環境で残ったデータを識別できるよう e2e- で始める */
export function uniqueId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * テスト用のパスワードを実行ごとに作る。
 * パスワードらしい文字列をコードに直接書くと、秘密情報のスキャン（GitGuardian）に誤検知されるため。
 * 大文字・小文字・数字・記号を必ず 1 文字ずつ含め、残りを英小文字と数字で埋める。
 */
export function createPassword(length: number): string {
  const required = 'Aa1!';
  if (length < required.length) {
    throw new Error(`パスワードは ${required.length} 文字以上で作ってください（指定: ${length}）`);
  }
  const chars = 'abcdefghijkmnpqrstuvwxyz23456789';
  const rest = Array.from({ length: length - required.length }, () => chars[Math.floor(Math.random() * chars.length)]);
  return required + rest.join('');
}

export function createTestUser(): TestUser {
  return {
    name: 'e2e-user',
    email: `e2e-${uniqueId()}@example.com`,
    password: createPassword(12),
  };
}

/** 新規登録フォームを送信する（成功は待たない。入力チェックのテスト用） */
export async function submitSignup(page: Page, user: TestUser) {
  await page.goto('/signup');
  await page.getByPlaceholder('例)山田太郎(ニックネーム可)').fill(user.name);
  await page.getByPlaceholder('メールアドレス').fill(user.email);
  await page.getByPlaceholder('パスワード').fill(user.password);
  await page.locator('button[type="submit"]').filter({ hasText: '新規登録' }).click();
}

export async function signup(page: Page, user: TestUser) {
  await submitSignup(page, user);
  await page.waitForURL((url) => url.pathname !== '/signup');
}

export async function submitLogin(page: Page, user: TestUser) {
  await page.goto('/login');
  await page.getByPlaceholder('メールアドレス').fill(user.email);
  await page.getByPlaceholder('パスワード').fill(user.password);
  await page.locator('button[type="submit"]').filter({ hasText: 'ログイン' }).click();
}

export async function login(page: Page, user: TestUser) {
  await submitLogin(page, user);
  await page.waitForURL((url) => url.pathname !== '/login');
}

/**
 * ログインを試み、成功したかを返す（後片付け用）。
 * 退会済み・未登録のユーザーならエラー表示になるので false。
 * どちらにもならないとき（文言の変更・別のエラーなど）は、待ち続けずに timeout で例外を投げる。
 * 既定の 30 秒はサーバーレスのコールドスタートを見込んだ値（playwright.config.ts の navigationTimeout と同じ）
 */
export async function tryLogin(page: Page, user: TestUser, timeout = 30_000): Promise<boolean> {
  await submitLogin(page, user);
  const error = page.getByText('メールアドレスまたはパスワードが間違っています');
  const result = await Promise.race([
    page.waitForURL((url) => url.pathname !== '/login', { timeout }).then(() => 'loggedIn' as const),
    error.waitFor({ timeout }).then(() => 'rejected' as const),
  ]).catch(() => 'unknown' as const);
  if (result === 'unknown') {
    throw new Error(`ログインの結果を判定できませんでした（${timeout}ms 待機、URL: ${page.url()}）`);
  }
  return result === 'loggedIn';
}

/** ログアウトボタンは記事一覧のヘッダーにしかないので、先に /articles へ移動する */
export async function logout(page: Page) {
  await page.goto('/articles');
  await page.getByRole('button', { name: 'ログアウト', exact: true }).click();
  await page.waitForURL(/\/login(\?|$)/);
}

/** 退会する。退会すると投稿した記事も削除される（アプリ側でカスケード削除） */
export async function withdraw(page: Page) {
  await page.goto('/settings/withdraw');
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: '退会する' }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/settings'));
}

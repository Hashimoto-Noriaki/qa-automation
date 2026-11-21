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

export function createTestUser(): TestUser {
  return {
    name: 'e2e-user',
    email: `e2e-${uniqueId()}@example.com`,
    password: 'E2eTest1234!',
  };
}

export async function signup(page: Page, user: TestUser) {
  await page.goto('/signup');
  await page.getByPlaceholder('例)山田太郎(ニックネーム可)').fill(user.name);
  await page.getByPlaceholder('メールアドレス').fill(user.email);
  await page.getByPlaceholder('パスワード').fill(user.password);
  await page.locator('button[type="submit"]').filter({ hasText: '新規登録' }).click();
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
 */
export async function tryLogin(page: Page, user: TestUser): Promise<boolean> {
  await submitLogin(page, user);
  const error = page.getByText('メールアドレスまたはパスワードが間違っています');
  await Promise.race([
    page.waitForURL((url) => url.pathname !== '/login'),
    error.waitFor(),
  ]);
  return new URL(page.url()).pathname !== '/login';
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

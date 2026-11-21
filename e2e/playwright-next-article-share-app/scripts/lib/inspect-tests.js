// check.sh から呼ぶ。`playwright test --list --reporter=json` の結果（ファイル）を読み、
// 次の 2 つを調べて 1 行ずつ出力する。読み取りに失敗したら終了コード 2 で終わる。
//
//   SMOKE_NG <ファイル> <理由>  … @smoke のテストが書き込み系の fixture にたどり着く
//   NO_ID <ファイル:行> <テスト名> … テスト名が [ケースID] で始まらない
//
// 使い方: node scripts/lib/inspect-tests.js <json のパス>
const fs = require('fs');
const path = require('path');

const projectDir = path.resolve(__dirname, '..', '..');
const fixturesDir = path.join(projectDir, 'fixtures') + path.sep;
const smokeDir = path.join(projectDir, 'tests', 'smoke');

const fail = (message) => {
  console.error(message);
  process.exit(2);
};

let report;
try {
  report = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
} catch (e) {
  fail(`テスト一覧の JSON を読めませんでした: ${e.message}`);
}
if (!Array.isArray(report.suites) || !report.config?.rootDir) {
  fail('テスト一覧の JSON の形式が想定と違います（Playwright のバージョンを確認してください）');
}
if (report.errors?.length) {
  fail(report.errors.map((e) => e.message).join('\n'));
}

// テストを集める
const specs = [];
const walk = (suite) => {
  for (const spec of suite.specs ?? []) specs.push(spec);
  (suite.suites ?? []).forEach(walk);
};
report.suites.forEach(walk);
if (specs.length === 0) fail('テストが 1 件も見つかりませんでした');

const out = [];

// --- @smoke が書き込み系の fixture を使っていないか ---
// 対象: @smoke タグの付いたテストを含むファイルと、tests/smoke/ 配下のファイル
if (!fs.existsSync(smokeDir)) fail(`${path.relative(projectDir, smokeDir)}/ がありません`);
const smokeFiles = new Set(
  specs.filter((s) => s.tags.includes('smoke')).map((s) => path.join(report.config.rootDir, s.file)),
);
for (const file of fs.readdirSync(smokeDir, { recursive: true })) {
  if (/\.(ts|js)$/.test(file)) smokeFiles.add(path.join(smokeDir, file));
}
if (smokeFiles.size === 0) fail('@smoke のテストが 1 件も見つかりませんでした');

// import / export from / require / 動的 import の相対パスを拾う（複数行の import も対象）
const IMPORT_RE = /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)['"](\.{1,2}\/[^'"]+)['"]/g;
// fixture の定義（test.extend / base.extend）
const EXTEND_RE = /\b(?:test|base)\.extend\s*[<(]/;

const resolveImport = (fromFile, spec) => {
  const base = path.resolve(path.dirname(fromFile), spec);
  const candidates = [base, `${base}.ts`, `${base}.js`, path.join(base, 'index.ts'), path.join(base, 'index.js')];
  return candidates.find((c) => fs.existsSync(c) && fs.statSync(c).isFile());
};

// ファイルから相対 import をたどり、書き込み系の fixture にたどり着くか調べる
const findFixtureUse = (entry) => {
  const seen = new Set();
  const stack = [[entry, [entry]]];
  while (stack.length) {
    const [file, chain] = stack.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    const rel = (f) => path.relative(projectDir, f);
    if (file.startsWith(fixturesDir)) return `${chain.map(rel).join(' → ')} で fixtures を使っています`;
    const source = fs.readFileSync(file, 'utf8');
    if (EXTEND_RE.test(source)) return `${chain.map(rel).join(' → ')} で fixture を定義しています（.extend）`;
    for (const [, spec] of source.matchAll(IMPORT_RE)) {
      const next = resolveImport(file, spec);
      if (next) stack.push([next, [...chain, next]]);
    }
  }
  return null;
};

for (const file of [...smokeFiles].sort()) {
  const reason = findFixtureUse(file);
  if (reason) out.push(`SMOKE_NG ${reason}`);
}

// --- テスト名が [ケースID] で始まっているか ---
for (const spec of specs) {
  if (!/^\[[A-Z]+-\d{3}\] /.test(spec.title)) out.push(`NO_ID ${spec.file}:${spec.line} ${spec.title}`);
}

if (out.length) console.log(out.join('\n'));

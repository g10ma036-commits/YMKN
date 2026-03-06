# CLAUDE.md

このファイルはAIアシスタント（Claude等）がこのリポジトリで作業する際のガイドラインを提供します。

## プロジェクト概要

**YMKN** は、Windows環境でClaude Codeが使用するgit-bashの検出・設定を行うTypeScriptユーティリティライブラリです。

- **パッケージ名:** ymkn
- **バージョン:** 1.0.0
- **説明:** Claude Code向けのWindows git-bash設定ユーティリティ
- **主要技術:** TypeScript, Node.js, Jest

---

## ディレクトリ構成

```
YMKN/
├── src/
│   └── utils/
│       ├── gitBashConfig.ts       # git-bash検出・設定のメインモジュール
│       └── gitBashConfig.test.ts  # Jestテストスイート
├── dist/                          # TypeScriptビルド出力先（自動生成）
├── package.json                   # npm設定・スクリプト・依存関係
├── tsconfig.json                  # TypeScriptコンパイラ設定
└── CLAUDE.md                      # このファイル
```

---

## 開発コマンド

### ビルド

```bash
# TypeScriptをJavaScriptにコンパイル（dist/へ出力）
npm run build
```

### テスト

```bash
# Jestテストスイートを実行
npm test
```

> テストはビルド不要でts-jestにより直接TypeScriptを実行します。

---

## コードアーキテクチャ

### メインモジュール: `src/utils/gitBashConfig.ts`

Windows環境でgit-bashの実行ファイルを検出するためのユーティリティ関数群。

#### 公開関数

| 関数名 | 説明 |
|--------|------|
| `isWindows()` | 実行環境がWindowsかどうかを判定する |
| `resolveGitBashPath()` | 優先順位に従いgit-bashのパスを解決する |
| `getShellPath()` | Windows時はgit-bashのパスを返し、他OSではnullを返す |

#### git-bash解決の優先順位

1. **環境変数 `CLAUDE_CODE_GIT_BASH_PATH`** — ユーザーによる明示的な指定
2. **システムPATH内のbash.exe** — 既にPATHに追加されている場合
3. **一般的なインストール先の検索** — 以下の順に確認:
   - `C:\Program Files\Git\bin\bash.exe`
   - `C:\Program Files (x86)\Git\bin\bash.exe`
   - `C:\msys64\usr\bin\bash.exe`
   - `C:\cygwin64\bin\bash.exe`
   - `C:\cygwin\bin\bash.exe`

#### 内部ヘルパー関数

| 関数名 | 説明 |
|--------|------|
| `expandWindowsEnvVars(path)` | `%VAR%` 形式のWindows環境変数をパス内で展開する |
| `fileExists(path)` | ファイルが存在し実行可能かどうかを確認する |
| `findBashInPath()` | システムPATHからbash.exeを検索する |
| `findBashInCommonLocations()` | 一般的なインストール先を順に検索する |

---

## TypeScript設定

`tsconfig.json` の主要設定:

```json
{
  "strict": true,         // 厳格な型チェックを有効化
  "target": "ES2020",     // ES2020を出力ターゲットに設定
  "module": "commonjs",   // CommonJS形式でモジュールを出力
  "rootDir": "src",       // ソースファイルのルートディレクトリ
  "outDir": "dist",       // コンパイル済みファイルの出力先
  "declaration": true,    // 型定義ファイル（.d.ts）を生成する
  "sourceMap": true       // デバッグ用ソースマップを生成する
}
```

---

## テスト方針

テストファイル: `src/utils/gitBashConfig.test.ts`

### テストスイート構成

- **`isWindows`** — プラットフォーム検出のテスト
- **`resolveGitBashPath`** — git-bash解決ロジックのテスト
  - 環境変数オーバーライドのテスト
  - PATHからの検索テスト
  - 一般的なインストール先の検索テスト
  - git-bashが見つからない場合のエラーハンドリングテスト
- **`getShellPath`** — クロスプラットフォーム動作のテスト

### テストの技法

- `jest.spyOn` を使用した `fs.accessSync` のモック
- `process.platform` と `process.env` の操作
- 各テスト後の適切なモッククリーンアップ

---

## 依存関係

### 開発用依存関係（devDependencies）

| パッケージ | バージョン | 用途 |
|-----------|-----------|------|
| `typescript` | ^5.4.5 | TypeScriptコンパイラ |
| `jest` | ^29.7.0 | テストフレームワーク |
| `ts-jest` | ^29.2.3 | JestのTypeScriptサポート |
| `@types/jest` | ^29.5.12 | JestのTypeScript型定義 |
| `@types/node` | ^20.14.0 | Node.jsのTypeScript型定義 |

> 本番用依存関係（dependencies）はありません。このパッケージはライブラリとして使用されます。

---

## コーディング規約

### TypeScript

- **Strictモード必須:** すべてのコードは `"strict": true` でコンパイルエラーなしに通過すること
- **型の明示:** 暗黙のanyは禁止。すべての関数の引数と戻り値に型を付けること
- **関数の単一責任:** 各関数は一つの明確な責務を持つこと

### コメント

- **コメントは日本語で記述すること**
- 複雑なロジックには必ずコメントを添えること
- 関数の目的・引数・戻り値を明記すること

### テスト

- 新機能を追加する場合は必ずテストを追加すること
- テストはt-jestを使用してTypeScriptのまま実行可能にすること
- モックは `afterEach` または `afterAll` で必ずリストアすること

### コミットメッセージ

[Conventional Commits](https://www.conventionalcommits.org/) 形式に従うこと:

```
<type>: <概要（英語または日本語）>

<詳細説明>

<関連リンク>
```

**type の種類:**
- `feat:` — 新機能
- `fix:` — バグ修正
- `refactor:` — リファクタリング
- `test:` — テストの追加・修正
- `docs:` — ドキュメントの更新
- `chore:` — ビルドプロセスやツール設定の変更

---

## 環境変数

| 変数名 | 説明 | 例 |
|--------|------|-----|
| `CLAUDE_CODE_GIT_BASH_PATH` | git-bashのパスを明示的に指定（オプション） | `C:\Program Files\Git\bin\bash.exe` |

---

## 参考情報

- git-bashのダウンロード: https://git-scm.com/downloads/win
- このライブラリは [Claude Code](https://claude.ai/code) のWindows対応のために作成されました

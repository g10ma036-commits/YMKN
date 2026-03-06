# CLAUDE.md

This file provides guidance for AI assistants working in this repository.

## Project Overview

**ymkn** is a TypeScript utility library that detects and resolves the path to `git-bash` (`bash.exe`) on Windows for use by Claude Code. On non-Windows platforms it returns `null`. The library has no runtime dependencies — only Node.js built-ins (`fs`, `path`).

## Repository Structure

```
YMKN/
├── src/
│   └── utils/
│       ├── gitBashConfig.ts       # All production logic (single module)
│       └── gitBashConfig.test.ts  # Jest unit tests
├── dist/                          # Compiled output (generated, not committed)
├── package.json
└── tsconfig.json
```

## Tech Stack

| Tool | Version | Purpose |
|------|---------|---------|
| TypeScript | ^5.4.5 | Language |
| Jest | ^29.7.0 | Test runner |
| ts-jest | ^29.2.3 | TypeScript integration for Jest |
| Node.js | ≥20 | Runtime (built-ins only) |

## Development Commands

```bash
npm run build   # Compile TypeScript → dist/
npm run test    # Run all tests with Jest
```

No install step is needed if `node_modules/` is already present; otherwise run `npm install` first.

## Key Module: `src/utils/gitBashConfig.ts`

### Exported API

| Export | Signature | Description |
|--------|-----------|-------------|
| `isWindows` | `() => boolean` | Returns `true` when `process.platform === "win32"` |
| `resolveGitBashPath` | `() => string` | Finds `bash.exe` on Windows; throws on failure |
| `getShellPath` | `() => string \| null` | Returns `bash.exe` path on Windows, `null` elsewhere |

### Resolution Order in `resolveGitBashPath`

1. `CLAUDE_CODE_GIT_BASH_PATH` environment variable (if set, the file **must** exist or an error is thrown)
2. `bash.exe` anywhere on `PATH`
3. Seven hard-coded common installation locations (e.g., `C:\Program Files\Git\bin\bash.exe`, MSYS2, Cygwin)

If not found, throws a user-friendly error with a download link and instructions for setting `CLAUDE_CODE_GIT_BASH_PATH`.

### Internal Helpers (not exported)

- `expandWindowsEnvVars(filePath)` — expands `%VAR%` tokens in paths
- `fileExists(filePath)` — checks `F_OK | X_OK` via `fs.accessSync`
- `findBashInPath()` — iterates `PATH` directories
- `findBashInCommonLocations()` — iterates the predefined path list

## Testing

Tests live alongside the source in `src/utils/gitBashConfig.test.ts`. The suite uses `jest.spyOn(fs, "accessSync")` to mock file existence, and `Object.defineProperty(process, "platform", ...)` to simulate Windows/Linux/macOS.

Test suites:
- `isWindows` — 3 tests (win32, linux, darwin)
- `resolveGitBashPath` — 5 tests (env var hit, env var miss, PATH hit, common-location fallback, not-found error)
- `getShellPath` — 2 tests (non-Windows returns null, Windows returns path)

**Run tests:**
```bash
npm test
```

All tests must pass before committing. Never add tests that depend on actual filesystem state — mock everything with `accessSyncSpy`.

## TypeScript Configuration

- **Target:** ES2020 / CommonJS modules
- **Strict mode:** enabled (`strict: true`)
- **Output:** `./dist` (declarations + source maps generated)
- **Test files excluded** from compilation (`**/*.test.ts` excluded in `tsconfig.json`)

## Code Conventions

- **No external runtime dependencies.** Use only Node.js built-ins.
- **Strict TypeScript.** All new code must satisfy `strict: true` with no `any` casts unless unavoidable.
- **Pure functions.** Side effects are limited to `fs.accessSync` reads; no writes, no network calls.
- **User-friendly errors.** When throwing, include actionable guidance: the env var name, expected format, and a download URL.
- **No global state.** Functions read from `process.env` and `process.platform` at call time; they do not cache results.
- **Test isolation.** Tests must restore mocked globals in `afterEach`/`afterAll` to avoid cross-test pollution.

## Git Workflow

- The main branch is `master`.
- Feature work happens on `claude/...` branches.
- Commit messages use the conventional format: `type: description` (e.g., `feat:`, `fix:`, `chore:`).

## What to Avoid

- Do not introduce external `npm` runtime dependencies.
- Do not cache `process.env` values at module load time (breaks testability).
- Do not silence TypeScript errors with `// @ts-ignore` or `as any` without a documented reason.
- Do not write tests that touch the real filesystem.

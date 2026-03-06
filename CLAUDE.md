# CLAUDE.md

This file provides guidance to AI assistants working in this repository.

## Project Overview

**ymkn** is a TypeScript utility library for Claude Code that handles Windows git-bash detection and path resolution. Its sole purpose is to locate `bash.exe` on Windows machines so Claude Code can use git-bash as its shell.

## Repository Structure

```
YMKN/
├── package.json                 # NPM config, scripts, jest config
├── tsconfig.json                # TypeScript compiler config
└── src/
    └── utils/
        ├── gitBashConfig.ts     # Main module (122 lines)
        └── gitBashConfig.test.ts # Jest tests (151 lines)
```

The build output goes to `dist/` (not committed), with `dist/index.js` as the declared main entry point. Note: no `src/index.ts` exists yet — this is a future integration point.

## Development Commands

```bash
npm test        # Run Jest test suite
npm run build   # Compile TypeScript → dist/
```

## Key Module: `src/utils/gitBashConfig.ts`

### Exported Public API

| Export | Signature | Description |
|--------|-----------|-------------|
| `isWindows` | `() => boolean` | Returns true if `process.platform === "win32"` |
| `resolveGitBashPath` | `() => string` | Resolves bash.exe path; throws if not found |
| `getShellPath` | `() => string \| null` | Returns bash.exe path on Windows, null elsewhere |

### Resolution Priority in `resolveGitBashPath()`

1. `CLAUDE_CODE_GIT_BASH_PATH` environment variable (user override)
2. System PATH scan for `bash.exe`
3. Common installation directories:
   - `C:\Program Files\Git\bin\bash.exe`
   - `C:\Program Files (x86)\Git\bin\bash.exe`
   - `C:\Users\%USERNAME%\AppData\Local\Programs\Git\bin\bash.exe`
   - `C:\msys64\usr\bin\bash.exe`
   - `C:\cygwin64\bin\bash.exe`
   - `C:\cygwin\bin\bash.exe`

If none found, throws an error with the git-bash download URL (`https://git-scm.com/downloads/win`) and setup instructions.

### Internal Helpers (not exported)

- `expandWindowsEnvVars(filePath)` — Expands `%VAR%` style Windows env vars in paths
- `fileExists(filePath)` — Checks file existence and executability via `fs.accessSync` with `F_OK | X_OK`
- `findBashInPath()` — Scans PATH entries for `bash.exe`
- `findBashInCommonLocations()` — Iterates `COMMON_GIT_BASH_PATHS` after expanding env vars

## TypeScript Configuration

- **Target:** ES2020, CommonJS modules
- **Strict mode:** enabled — no `any` types, full type safety required
- **Outputs:** JS files + `.d.ts` declarations + source maps to `dist/`
- **Test files excluded** from build (`**/*.test.ts` excluded in tsconfig.json)

## Testing Conventions

- Tests live alongside source files (e.g., `gitBashConfig.test.ts` next to `gitBashConfig.ts`)
- Jest + ts-jest preset, `testEnvironment: node`
- **Mocking pattern:** Use `Object.defineProperty` for `process.platform` and `jest.spyOn` for `fs.accessSync`
- **Isolation:** Always restore mocks with `afterEach`/`afterAll` — do not let mocks leak between tests
- Test structure: `describe` blocks per function, descriptive `it`/`test` names

Example mock pattern used in this codebase:
```typescript
// Platform mocking
Object.defineProperty(process, "platform", { value: "win32", writable: true });

// File system mocking
jest.spyOn(fs, "accessSync").mockImplementation(() => { /* no-op = file exists */ });
```

## Code Conventions

- **Functional style:** All exports are standalone functions, no classes
- **Error throwing:** Functions throw descriptive errors (not return null) when required resources are missing
- **JSDoc:** All public exports have JSDoc with `@param`, `@returns`, and `@throws`
- **No `any`:** Strict TypeScript throughout
- **Platform guard:** `getShellPath()` returns `null` on non-Windows; callers must handle this

## Git Conventions

- Branch naming: `claude/<description>-<session-id>`
- Commit style: Conventional commits (`feat:`, `fix:`, `docs:`, etc.)
- Commit messages include rationale and reference the Claude Code session URL

## What This Project Is NOT

- Not a CLI tool (no bin entry in package.json)
- Not a server or API
- No database, no network calls (only local filesystem + env vars)
- No CI/CD configuration yet

## Adding New Functionality

When extending this library:
1. Add new utilities under `src/utils/` or create new subdirectories as needed
2. Export public API through `src/index.ts` (create this file when first needed)
3. Keep platform-specific code clearly separated and guarded by `isWindows()`
4. Write collocated tests for any new module
5. Maintain strict TypeScript — no `any`, no type assertions without justification

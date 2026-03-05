import * as fs from "fs";
import * as path from "path";

const GIT_BASH_ENV_VAR = "CLAUDE_CODE_GIT_BASH_PATH";
const GIT_BASH_DOWNLOAD_URL = "https://git-scm.com/downloads/win";

// Common git-bash installation paths on Windows
const COMMON_GIT_BASH_PATHS = [
  "C:\\Program Files\\Git\\bin\\bash.exe",
  "C:\\Program Files (x86)\\Git\\bin\\bash.exe",
  "C:\\Users\\%USERNAME%\\AppData\\Local\\Programs\\Git\\bin\\bash.exe",
  "C:\\msys64\\usr\\bin\\bash.exe",
  "C:\\cygwin64\\bin\\bash.exe",
  "C:\\cygwin\\bin\\bash.exe",
];

export function isWindows(): boolean {
  return process.platform === "win32";
}

/**
 * Resolves Windows-style paths with environment variable expansion.
 * Handles %USERNAME% and other common Windows env vars.
 */
function expandWindowsEnvVars(filePath: string): string {
  return filePath.replace(/%([^%]+)%/g, (_, varName) => {
    return process.env[varName] ?? `%${varName}%`;
  });
}

/**
 * Checks if a file exists and is executable.
 */
function fileExists(filePath: string): boolean {
  try {
    fs.accessSync(filePath, fs.constants.F_OK | fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Searches for bash.exe in the system PATH.
 */
function findBashInPath(): string | null {
  const pathDirs = (process.env.PATH ?? "").split(path.delimiter);
  for (const dir of pathDirs) {
    const candidate = path.join(dir, "bash.exe");
    if (fileExists(candidate)) {
      return candidate;
    }
  }
  return null;
}

/**
 * Searches common Windows installation directories for git-bash.
 */
function findBashInCommonLocations(): string | null {
  for (const rawPath of COMMON_GIT_BASH_PATHS) {
    const expandedPath = expandWindowsEnvVars(rawPath);
    if (fileExists(expandedPath)) {
      return expandedPath;
    }
  }
  return null;
}

/**
 * Resolves the path to git-bash (bash.exe) on Windows.
 *
 * Resolution order:
 * 1. CLAUDE_CODE_GIT_BASH_PATH environment variable
 * 2. bash.exe found in PATH
 * 3. Common installation locations
 *
 * @throws {Error} If git-bash cannot be found and we are on Windows.
 */
export function resolveGitBashPath(): string {
  // 1. Check user-specified environment variable
  const envPath = process.env[GIT_BASH_ENV_VAR];
  if (envPath) {
    if (!fileExists(envPath)) {
      throw new Error(
        `${GIT_BASH_ENV_VAR} is set to "${envPath}" but the file was not found or is not executable.`
      );
    }
    return envPath;
  }

  // 2. Search PATH
  const pathBash = findBashInPath();
  if (pathBash) {
    return pathBash;
  }

  // 3. Search common installation locations
  const commonBash = findBashInCommonLocations();
  if (commonBash) {
    return commonBash;
  }

  // Not found — emit the user-friendly error
  throw new Error(
    `Claude Code on Windows requires git-bash (${GIT_BASH_DOWNLOAD_URL}). ` +
      `If installed but not in PATH, set environment variable pointing to your bash.exe, similar to: ` +
      `${GIT_BASH_ENV_VAR}=C:\\Program Files\\Git\\bin\\bash.exe`
  );
}

/**
 * Returns the git-bash path when running on Windows, or null on other platforms.
 *
 * @throws {Error} On Windows when git-bash cannot be located.
 */
export function getShellPath(): string | null {
  if (!isWindows()) {
    return null;
  }
  return resolveGitBashPath();
}

import * as fs from "fs";
import * as path from "path";
import {
  isWindows,
  resolveGitBashPath,
  getShellPath,
} from "./gitBashConfig";

// We test the module in isolation by mocking process.platform and fs.accessSync.

const GIT_BASH_ENV_VAR = "CLAUDE_CODE_GIT_BASH_PATH";

describe("isWindows", () => {
  const originalPlatform = Object.getOwnPropertyDescriptor(process, "platform");

  afterEach(() => {
    if (originalPlatform) {
      Object.defineProperty(process, "platform", originalPlatform);
    }
  });

  it("returns true on win32", () => {
    Object.defineProperty(process, "platform", { value: "win32" });
    expect(isWindows()).toBe(true);
  });

  it("returns false on linux", () => {
    Object.defineProperty(process, "platform", { value: "linux" });
    expect(isWindows()).toBe(false);
  });

  it("returns false on darwin", () => {
    Object.defineProperty(process, "platform", { value: "darwin" });
    expect(isWindows()).toBe(false);
  });
});

describe("resolveGitBashPath", () => {
  const originalEnv = { ...process.env };
  const accessSyncSpy = jest.spyOn(fs, "accessSync");

  beforeEach(() => {
    // Reset env and mocks before each test
    process.env = { ...originalEnv };
    delete process.env[GIT_BASH_ENV_VAR];
    process.env.PATH = "";
    accessSyncSpy.mockReset();
  });

  afterAll(() => {
    process.env = originalEnv;
    accessSyncSpy.mockRestore();
  });

  it("returns path from env variable when file exists", () => {
    const customPath = "D:\\CustomGit\\bin\\bash.exe";
    process.env[GIT_BASH_ENV_VAR] = customPath;
    accessSyncSpy.mockImplementation(() => {
      /* file exists, no throw */
    });

    expect(resolveGitBashPath()).toBe(customPath);
    expect(accessSyncSpy).toHaveBeenCalledWith(
      customPath,
      fs.constants.F_OK | fs.constants.X_OK
    );
  });

  it("throws when env variable path does not exist", () => {
    const badPath = "Z:\\nonexistent\\bash.exe";
    process.env[GIT_BASH_ENV_VAR] = badPath;
    accessSyncSpy.mockImplementation(() => {
      throw new Error("ENOENT");
    });

    expect(() => resolveGitBashPath()).toThrow(GIT_BASH_ENV_VAR);
    expect(() => resolveGitBashPath()).toThrow(badPath);
  });

  it("finds bash.exe in PATH", () => {
    const bashDir = "C:\\Program Files\\Git\\bin";
    process.env.PATH = bashDir;
    const expectedPath = path.join(bashDir, "bash.exe");

    accessSyncSpy.mockImplementation((p) => {
      if (p === expectedPath) return; // exists
      throw new Error("ENOENT");
    });

    expect(resolveGitBashPath()).toBe(expectedPath);
  });

  it("falls back to common location when not in PATH", () => {
    process.env.PATH = "C:\\Windows\\System32";
    // Only the first common location exists
    const firstCommon = "C:\\Program Files\\Git\\bin\\bash.exe";

    accessSyncSpy.mockImplementation((p) => {
      if (p === firstCommon) return; // exists
      throw new Error("ENOENT");
    });

    expect(resolveGitBashPath()).toBe(firstCommon);
  });

  it("throws helpful error when git-bash is not found anywhere", () => {
    process.env.PATH = "";
    accessSyncSpy.mockImplementation(() => {
      throw new Error("ENOENT");
    });

    expect(() => resolveGitBashPath()).toThrow("git-bash");
    expect(() => resolveGitBashPath()).toThrow(
      "https://git-scm.com/downloads/win"
    );
    expect(() => resolveGitBashPath()).toThrow(GIT_BASH_ENV_VAR);
  });
});

describe("getShellPath", () => {
  const originalPlatform = Object.getOwnPropertyDescriptor(process, "platform");
  const accessSyncSpy = jest.spyOn(fs, "accessSync");

  afterEach(() => {
    if (originalPlatform) {
      Object.defineProperty(process, "platform", originalPlatform);
    }
    accessSyncSpy.mockReset();
  });

  afterAll(() => {
    accessSyncSpy.mockRestore();
  });

  it("returns null on non-Windows platforms", () => {
    Object.defineProperty(process, "platform", { value: "linux" });
    expect(getShellPath()).toBeNull();
  });

  it("returns git-bash path on Windows", () => {
    Object.defineProperty(process, "platform", { value: "win32" });
    const envPath = "C:\\Git\\bin\\bash.exe";
    process.env[GIT_BASH_ENV_VAR] = envPath;
    accessSyncSpy.mockImplementation(() => {
      /* exists */
    });

    expect(getShellPath()).toBe(envPath);
    delete process.env[GIT_BASH_ENV_VAR];
  });
});

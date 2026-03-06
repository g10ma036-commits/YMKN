import * as fs from "fs";
import * as path from "path";
import {
  isWindows,
  isJapaneseLocale,
  resolveGitBashPath,
  getShellPath,
} from "./gitBashConfig";

jest.mock("fs");

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

describe("isJapaneseLocale", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("returns true when LANG is ja_JP.UTF-8", () => {
    delete process.env.LC_ALL;
    delete process.env.LC_MESSAGES;
    process.env.LANG = "ja_JP.UTF-8";
    expect(isJapaneseLocale()).toBe(true);
  });

  it("returns true when LC_ALL is ja_JP.UTF-8", () => {
    process.env.LC_ALL = "ja_JP.UTF-8";
    expect(isJapaneseLocale()).toBe(true);
  });

  it("returns true when LC_MESSAGES is ja", () => {
    delete process.env.LC_ALL;
    process.env.LC_MESSAGES = "ja";
    expect(isJapaneseLocale()).toBe(true);
  });

  it("returns false when LANG is en_US.UTF-8", () => {
    delete process.env.LC_ALL;
    delete process.env.LC_MESSAGES;
    process.env.LANG = "en_US.UTF-8";
    expect(isJapaneseLocale()).toBe(false);
  });

  it("returns false when no locale env vars are set", () => {
    delete process.env.LC_ALL;
    delete process.env.LC_MESSAGES;
    delete process.env.LANG;
    expect(isJapaneseLocale()).toBe(false);
  });
});

describe("resolveGitBashPath", () => {
  const originalEnv = { ...process.env };
  const accessSyncMock = fs.accessSync as jest.Mock;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env[GIT_BASH_ENV_VAR];
    delete process.env.LC_ALL;
    delete process.env.LC_MESSAGES;
    delete process.env.LANG;
    process.env.PATH = "";
    accessSyncMock.mockReset();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("returns path from env variable when file exists", () => {
    const customPath = "D:\\CustomGit\\bin\\bash.exe";
    process.env[GIT_BASH_ENV_VAR] = customPath;
    accessSyncMock.mockImplementation(() => {
      /* file exists, no throw */
    });

    expect(resolveGitBashPath()).toBe(customPath);
    expect(accessSyncMock).toHaveBeenCalledWith(
      customPath,
      fs.constants.F_OK | fs.constants.X_OK
    );
  });

  it("throws when env variable path does not exist", () => {
    const badPath = "Z:\\nonexistent\\bash.exe";
    process.env[GIT_BASH_ENV_VAR] = badPath;
    accessSyncMock.mockImplementation(() => {
      throw new Error("ENOENT");
    });

    expect(() => resolveGitBashPath()).toThrow(GIT_BASH_ENV_VAR);
    expect(() => resolveGitBashPath()).toThrow(badPath);
  });

  it("finds bash.exe in PATH", () => {
    // Use a path without a colon so it works on Linux (path.delimiter=":") as well as Windows
    const bashDir = "\\Program Files\\Git\\bin";
    process.env.PATH = bashDir;
    const expectedPath = path.join(bashDir, "bash.exe");

    accessSyncMock.mockImplementation((p) => {
      if (p === expectedPath) return; // exists
      throw new Error("ENOENT");
    });

    expect(resolveGitBashPath()).toBe(expectedPath);
  });

  it("falls back to common location when not in PATH", () => {
    process.env.PATH = "C:\\Windows\\System32";
    // Only the first common location exists
    const firstCommon = "C:\\Program Files\\Git\\bin\\bash.exe";

    accessSyncMock.mockImplementation((p) => {
      if (p === firstCommon) return; // exists
      throw new Error("ENOENT");
    });

    expect(resolveGitBashPath()).toBe(firstCommon);
  });

  it("throws helpful error when git-bash is not found anywhere", () => {
    process.env.PATH = "";
    accessSyncMock.mockImplementation(() => {
      throw new Error("ENOENT");
    });

    expect(() => resolveGitBashPath()).toThrow("git-bash");
    expect(() => resolveGitBashPath()).toThrow(
      "https://git-scm.com/downloads/win"
    );
    expect(() => resolveGitBashPath()).toThrow(GIT_BASH_ENV_VAR);
  });

  describe("Japanese locale messages", () => {
    beforeEach(() => {
      process.env.LC_ALL = "ja_JP.UTF-8";
    });

    afterEach(() => {
      delete process.env.LC_ALL;
    });

    it("throws Japanese error when env variable path does not exist", () => {
      const badPath = "Z:\\nonexistent\\bash.exe";
      process.env[GIT_BASH_ENV_VAR] = badPath;
      accessSyncMock.mockImplementation(() => {
        throw new Error("ENOENT");
      });

      expect(() => resolveGitBashPath()).toThrow(GIT_BASH_ENV_VAR);
      expect(() => resolveGitBashPath()).toThrow(badPath);
      expect(() => resolveGitBashPath()).toThrow("設定されていますが");
    });

    it("throws Japanese error when git-bash is not found anywhere", () => {
      process.env.PATH = "";
      accessSyncMock.mockImplementation(() => {
        throw new Error("ENOENT");
      });

      expect(() => resolveGitBashPath()).toThrow("git-bash");
      expect(() => resolveGitBashPath()).toThrow(
        "https://git-scm.com/downloads/win"
      );
      expect(() => resolveGitBashPath()).toThrow(GIT_BASH_ENV_VAR);
      expect(() => resolveGitBashPath()).toThrow("Windows");
    });
  });
});

describe("getShellPath", () => {
  const originalPlatform = Object.getOwnPropertyDescriptor(process, "platform");
  const accessSyncMock = fs.accessSync as jest.Mock;

  afterEach(() => {
    if (originalPlatform) {
      Object.defineProperty(process, "platform", originalPlatform);
    }
    accessSyncMock.mockReset();
  });

  it("returns null on non-Windows platforms", () => {
    Object.defineProperty(process, "platform", { value: "linux" });
    expect(getShellPath()).toBeNull();
  });

  it("returns git-bash path on Windows", () => {
    Object.defineProperty(process, "platform", { value: "win32" });
    const envPath = "C:\\Git\\bin\\bash.exe";
    process.env[GIT_BASH_ENV_VAR] = envPath;
    accessSyncMock.mockImplementation(() => {
      /* exists */
    });

    expect(getShellPath()).toBe(envPath);
    delete process.env[GIT_BASH_ENV_VAR];
  });
});

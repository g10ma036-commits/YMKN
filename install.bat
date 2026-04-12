@echo off
chcp 65001 > nul
echo DOE アナリストのインストールを開始します...
echo.
where node >nul 2>&1
if %errorlevel% neq 0 (
  echo エラー: Node.js がインストールされていません。
  echo https://nodejs.org から Node.js をダウンロードしてインストールしてください。
  pause
  exit /b 1
)
echo Node.js を確認しました。
echo 依存パッケージをインストール中...
npm install
if %errorlevel% neq 0 (
  echo インストールに失敗しました。
  pause
  exit /b 1
)
echo.
echo インストール完了！
echo start.bat をダブルクリックしてアプリを起動してください。
pause

@echo off
chcp 65001 > nul
echo DOE アナリストを起動しています...
npm start
if %errorlevel% neq 0 (
  echo エラーが発生しました。install.bat を先に実行してください。
  pause
)

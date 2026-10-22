@echo off
setlocal
title OpenCircle Installer
echo.
echo  ========================================
echo   OpenCircle for Windows
echo  ========================================
echo.

set "APP_URL=https://opencircle-lol-creative.vercel.app/app"
set "SHORTCUT=%USERPROFILE%\Desktop\OpenCircle.lnk"
set "START_MENU=%APPDATA%\Microsoft\Windows\Start Menu\Programs\OpenCircle.lnk"

:: Prefer Edge/Chrome app mode for a native-feeling window
set "BROWSER="
where msedge >nul 2>&1 && set "BROWSER=msedge"
if not defined BROWSER where chrome >nul 2>&1 && set "BROWSER=chrome"
if not defined BROWSER where "C:\Program Files\Google\Chrome\Application\chrome.exe" >nul 2>&1 && set "BROWSER=C:\Program Files\Google\Chrome\Application\chrome.exe"
if not defined BROWSER where "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" >nul 2>&1 && set "BROWSER=C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

echo Creating desktop shortcut...

powershell -NoProfile -Command ^
  "$s=(New-Object -COM WScript.Shell).CreateShortcut('%SHORTCUT%');"^
  "if ('%BROWSER%' -ne '') { $s.TargetPath='%BROWSER%'; $s.Arguments='--app=%APP_URL% --new-window' } else { $s.TargetPath='%APP_URL%' };"^
  "$s.IconLocation='%%SystemRoot%%\System32\shell32.dll,14'; $s.Save()"

powershell -NoProfile -Command ^
  "$s=(New-Object -COM WScript.Shell).CreateShortcut('%START_MENU%');"^
  "if ('%BROWSER%' -ne '') { $s.TargetPath='%BROWSER%'; $s.Arguments='--app=%APP_URL% --new-window' } else { $s.TargetPath='%APP_URL%' };"^
  "$s.IconLocation='%%SystemRoot%%\System32\shell32.dll,14'; $s.Save()"

echo.
echo  Done! Shortcuts created on Desktop and Start Menu.
echo  OpenCircle opens in app mode (no browser chrome).
echo.
if defined BROWSER (
  start "" "%BROWSER%" --app=%APP_URL% --new-window
) else (
  start "" "%APP_URL%"
)
pause

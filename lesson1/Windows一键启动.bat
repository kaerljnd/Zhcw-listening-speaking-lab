@echo off
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel%==0 (
  start "Zhcw Lesson 1" py -m http.server 8765
  timeout /t 2 /nobreak >nul
  start "" "http://127.0.0.1:8765/"
  exit /b
)
where python >nul 2>nul
if %errorlevel%==0 (
  start "Zhcw Lesson 1" python -m http.server 8765
  timeout /t 2 /nobreak >nul
  start "" "http://127.0.0.1:8765/"
  exit /b
)
start "" "开始使用.html"


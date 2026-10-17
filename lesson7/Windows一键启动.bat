@echo off
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel%==0 (
  start "Zhcw Lesson 7" py -m http.server 8769
  timeout /t 2 /nobreak >nul
  start "" "http://127.0.0.1:8769/"
  exit /b
)
where python >nul 2>nul
if %errorlevel%==0 (
  start "Zhcw Lesson 7" python -m http.server 8769
  timeout /t 2 /nobreak >nul
  start "" "http://127.0.0.1:8769/"
  exit /b
)
start "" "开始使用.html"


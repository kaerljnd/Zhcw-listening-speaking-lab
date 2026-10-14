@echo off
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel%==0 (
  start "Zhcw Lesson 3" py -m http.server 8767
  timeout /t 2 /nobreak >nul
  start "" "http://127.0.0.1:8767/"
  exit /b
)
where python >nul 2>nul
if %errorlevel%==0 (
  start "Zhcw Lesson 3" python -m http.server 8767
  timeout /t 2 /nobreak >nul
  start "" "http://127.0.0.1:8767/"
  exit /b
)
start "" "开始使用.html"


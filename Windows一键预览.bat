@echo off
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel%==0 (
  start "Zhcw Course Portal" py -m http.server 8000
  timeout /t 2 /nobreak >nul
  start "" "http://127.0.0.1:8000/"
  exit /b
)
where python >nul 2>nul
if %errorlevel%==0 (
  start "Zhcw Course Portal" python -m http.server 8000
  timeout /t 2 /nobreak >nul
  start "" "http://127.0.0.1:8000/"
  exit /b
)
start "" "index.html"

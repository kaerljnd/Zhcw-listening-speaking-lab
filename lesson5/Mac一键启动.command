#!/bin/bash
cd "$(dirname "$0")"
PORT=8767
if command -v python3 >/dev/null 2>&1; then
  python3 -m http.server "$PORT" >/tmp/zhcw_lesson5_server.log 2>&1 &
  SERVER_PID=$!
  sleep 1
  open "http://127.0.0.1:$PORT/"
  wait "$SERVER_PID"
else
  open "开始使用.html"
fi


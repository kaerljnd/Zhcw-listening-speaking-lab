#!/bin/bash
cd "$(dirname "$0")"
PORT=8000
python3 -m http.server "$PORT" >/tmp/zhcw_course_portal.log 2>&1 &
SERVER_PID=$!
sleep 1
open "http://127.0.0.1:$PORT/"
wait "$SERVER_PID"

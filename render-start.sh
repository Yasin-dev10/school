#!/bin/sh
set -eu

cd /app/backend
npx prisma migrate deploy
PORT="${BACKEND_PORT:-5000}" npm start &
backend_pid=$!

cd /app/frontend
npm start -- -H 0.0.0.0 -p "${PORT:-3000}" &
frontend_pid=$!

trap 'kill "$backend_pid" "$frontend_pid" 2>/dev/null || true' INT TERM

while kill -0 "$backend_pid" 2>/dev/null && kill -0 "$frontend_pid" 2>/dev/null; do
  sleep 5
done

kill "$backend_pid" "$frontend_pid" 2>/dev/null || true
wait

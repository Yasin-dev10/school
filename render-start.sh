#!/bin/sh
set -eu

cd /app/backend

MIGRATE_RETRIES="${DATABASE_MIGRATE_RETRIES:-12}"
MIGRATE_RETRY_SECONDS="${DATABASE_MIGRATE_RETRY_SECONDS:-5}"

run_migrations() {
  attempt=1

  while [ "$attempt" -le "$MIGRATE_RETRIES" ]; do
    if npx prisma migrate deploy; then
      return 0
    fi

    if [ "$attempt" -eq "$MIGRATE_RETRIES" ]; then
      echo "Prisma migration failed after $MIGRATE_RETRIES attempts."
      return 1
    fi

    echo "Database not ready for migration (attempt $attempt/$MIGRATE_RETRIES). Retrying in ${MIGRATE_RETRY_SECONDS}s..."
    attempt=$((attempt + 1))
    sleep "$MIGRATE_RETRY_SECONDS"
  done
}

run_migrations

backend_port="${BACKEND_PORT:-5000}"
echo "Starting backend on port $backend_port"
PORT="$backend_port" npm start &
backend_pid=$!

cd /app/frontend
frontend_port="${PORT:-3000}"
echo "Starting frontend on port $frontend_port"
npm start -- -H 0.0.0.0 -p "$frontend_port" &
frontend_pid=$!

trap 'kill "$backend_pid" "$frontend_pid" 2>/dev/null || true' INT TERM

while kill -0 "$backend_pid" 2>/dev/null && kill -0 "$frontend_pid" 2>/dev/null; do
  sleep 5
done

kill "$backend_pid" "$frontend_pid" 2>/dev/null || true
wait

#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
export PGDATA="${PGDATA:-/data/postgres}"
password_file=/data/app-db-password
pg_pid=
app_pid=
cleanup() {
  local status=$?
  trap - EXIT TERM INT
  if [[ -n "$app_pid" ]]; then kill -TERM "$app_pid" 2>/dev/null || true; fi
  if [[ -n "$pg_pid" ]]; then
    gosu postgres pg_ctl -D "$PGDATA" -m fast -w -t 20 stop || true
  fi
  wait 2>/dev/null || true
  exit "$status"
}
trap cleanup EXIT
trap 'exit 0' TERM INT
mkdir -p /data "$PGDATA" /var/run/postgresql
chmod 755 /data
chown postgres:postgres "$PGDATA" /var/run/postgresql
chmod 700 "$PGDATA"
if [[ ! -s "$password_file" ]]; then
  if [[ -s "$PGDATA/PG_VERSION" ]]; then
    echo 'Missing /data/app-db-password for existing database; restore it from backup.' >&2
    exit 1
  fi
  node -e 'process.stdout.write(require("node:crypto").randomBytes(32).toString("hex"))' > "$password_file"
fi
chmod 600 "$password_file"
password=$(cat "$password_file")
if [[ ! "$password" =~ ^[a-f0-9]{64}$ ]]; then
  echo 'Invalid persisted database password.' >&2
  exit 1
fi
if [[ ! -s "$PGDATA/PG_VERSION" ]]; then
  gosu postgres initdb -D "$PGDATA" --auth-local=peer --auth-host=reject --encoding=UTF8 --locale=C
fi
if [[ $(cat "$PGDATA/PG_VERSION") != 16 ]]; then
  echo 'Expected PostgreSQL 16 data; upgrade the database explicitly before changing the image.' >&2
  exit 1
fi
# No TCP superuser login, even from the same host.
cat > "$PGDATA/pg_hba.conf" <<'HBA'
local all postgres peer
host life_os life_os 127.0.0.1/32 scram-sha-256
HBA
chown postgres:postgres "$PGDATA/pg_hba.conf"
gosu postgres postgres -D "$PGDATA" -c config_file=/usr/local/lib/life-os/postgresql.conf &
pg_pid=$!
ready=false
for ((attempt=0; attempt<60; attempt++)); do
  if gosu postgres pg_isready -q -h /var/run/postgresql; then ready=true; break; fi
  if ! kill -0 "$pg_pid" 2>/dev/null; then echo 'PostgreSQL exited at startup.' >&2; exit 1; fi
  sleep 1
done
if [[ "$ready" != true ]]; then echo 'PostgreSQL readiness timed out.' >&2; exit 1; fi
# Retry-safe even after interrupted initialization. Password is generated hex, never user SQL.
gosu postgres psql -v ON_ERROR_STOP=1 --dbname=postgres <<SQL
SELECT 'CREATE ROLE life_os LOGIN' WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'life_os') \gexec
ALTER ROLE life_os PASSWORD '$password';
SELECT 'CREATE DATABASE life_os OWNER life_os' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'life_os') \gexec
SQL
export DATABASE_URL="postgresql://life_os:${password}@127.0.0.1:5432/life_os"
unset password
if [[ -z "${APP_ORIGIN:-}" && -n "${FLY_APP_NAME:-}" ]]; then
  export APP_ORIGIN="https://${FLY_APP_NAME}.fly.dev"
fi
cd /app
gosu app node scripts/migrate.mjs
gosu app node scripts/seed-finance.mjs
gosu app node server.js &
app_pid=$!
# A failed database or web server terminates the whole Machine so Fly can restart it.
set +e
wait -n "$pg_pid" "$app_pid"
status=$?
set -e
if [[ "$status" == 0 ]]; then status=1; fi
exit "$status"

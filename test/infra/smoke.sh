#!/usr/bin/env bash
# Run after: docker build -t life-os-single .
# Creates and removes only its own disposable container and volume.
set -Eeuo pipefail
image=${1:-life-os-single}
access_password=life-os-disposable-smoke-password-2026
name="life-os-infra-${RANDOM}-$$"
volume="$name-data"
backup=$(mktemp)
cleanup() {
  status=$?
  trap - EXIT
  if ((status != 0)); then docker logs "$name" >&2 || true; fi
  docker rm -f "$name" >/dev/null 2>&1 || true
  docker volume rm "$volume" >/dev/null 2>&1 || true
  rm -f "$backup"
  exit "$status"
}
trap cleanup EXIT
docker volume create "$volume" >/dev/null
docker run -d --name "$name" --memory=256m --memory-swap=256m --cpus=1 -e "LIFE_OS_ACCESS_PASSWORD=$access_password" -v "$volume:/data" "$image" >/dev/null
healthy() {
  local attempt
  for ((attempt=0; attempt<90; attempt++)); do
    if docker exec "$name" node -e 'fetch("http://127.0.0.1:3000/api/health").then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))' >/dev/null 2>&1; then return 0; fi
    if [[ $(docker inspect -f '{{.State.Running}}' "$name") != true ]]; then return 1; fi
    sleep 1
  done
  return 1
}
healthy
docker exec "$name" node -e 'fetch("http://127.0.0.1:3000/tasks", {redirect:"manual"}).then(r=>process.exit(r.status===307?0:1))' >/dev/null
docker exec "$name" node -e 'fetch("http://127.0.0.1:3000/api/finance/transactions", {method:"POST"}).then(r=>process.exit(r.status===401?0:1))' >/dev/null
# Prove real SQL data persists through the production entrypoint's restart.
docker exec "$name" gosu postgres psql -v ON_ERROR_STOP=1 -d life_os -c "CREATE TABLE infra_persistence_probe (value text); INSERT INTO infra_persistence_probe VALUES ('survives restart');" >/dev/null
docker exec "$name" /usr/local/lib/life-os/backup.sh > "$backup"
test -s "$backup"
docker exec -i "$name" gosu postgres pg_restore --list < "$backup" | sed -n '1,12p'
docker restart --time 30 "$name" >/dev/null
healthy
value=$(docker exec "$name" gosu postgres psql -At -d life_os -c 'SELECT value FROM infra_persistence_probe')
[[ "$value" == 'survives restart' ]]
docker stats --no-stream "$name"
# The supervisor must fail the container when PostgreSQL exits independently.
docker exec "$name" gosu postgres pg_ctl -D /data/postgres -m fast stop >/dev/null 2>&1 || true
for ((attempt=0; attempt<30; attempt++)); do
  if [[ $(docker inspect -f '{{.State.Running}}' "$name") == false ]]; then break; fi
  sleep 1
done
[[ $(docker inspect -f '{{.State.Running}}' "$name") == false ]]
status=$(docker inspect -f '{{.State.ExitCode}}' "$name")
[[ "$status" != 0 ]]
[[ $(docker inspect -f '{{.State.OOMKilled}}' "$name") == false ]]
echo 'PASS: health, backup, restart persistence, 256MB limit, database-exit supervision'

# Single-Machine Fly.io deployment

This configuration runs Next.js and PostgreSQL 16 together on **one shared-cpu-1x Machine with 256MB RAM and one 1GB volume** in Frankfurt. There is no managed database or separate database Machine. PostgreSQL listens only on loopback. The web app requires a single access password supplied as a Fly secret. Use a unique randomly generated password of at least 24 characters and save it in a password manager. The browser session lasts 30 days; changing the password invalidates existing sessions.

The 256MB budget is deliberately tight: Node's old-generation heap is capped at 128MB and PostgreSQL uses 16MB shared buffers, 12 connections and one autovacuum worker. This is a starting configuration for light personal use, not a proven capacity guarantee. Observe real memory usage and database size. A Machine failure or deployment causes downtime; there is no replica. Never scale this design above one Machine: each volume would contain an independent database.

## First deployment

The existing local database is not migrated in place. Before discarding it, export the training configuration: activity tags and groups, custom fields, exercises and groups, workout plans, and splits with their days and links. Recorded activities and other modules' data can be omitted. The selective export/import workflow is separate from this deployment setup; keep the old database until that transfer is verified.

Install `flyctl`, log in with `fly auth login`, then run these commands from the repository root. Choose a globally unique app name; none is committed in `fly.toml`.

```sh
export LIFE_OS_APP=your-unique-life-os-name
fly apps create "$LIFE_OS_APP"
fly config validate --strict --app "$LIFE_OS_APP"
fly volumes create life_os_data --app "$LIFE_OS_APP" --region fra --size 1
LIFE_OS_ACCESS_PASSWORD=$(openssl rand -base64 36)
printf 'Save this password in your password manager: %s\n' "$LIFE_OS_ACCESS_PASSWORD"
printf 'LIFE_OS_ACCESS_PASSWORD=%s\n' "$LIFE_OS_ACCESS_PASSWORD" | fly secrets import --stage --app "$LIFE_OS_APP"
unset LIFE_OS_ACCESS_PASSWORD
fly deploy --app "$LIFE_OS_APP" --ha=false --strategy immediate
fly machine list --app "$LIFE_OS_APP"
fly volumes list --app "$LIFE_OS_APP"
fly checks list --app "$LIFE_OS_APP"
```

Verify that the lists show exactly one Machine and one attached 1GB volume. Always include `--ha=false` on deploy: the CLI otherwise defaults to creating spare Machines. `immediate` updates this single Machine without a parallel replacement database. Do not use blue/green, canary, automatic volume extension, multiple regions, or horizontal scaling for this layout. If changing the region, change both the configuration and volume creation command before the first deployment.

The access password is required at runtime. If absent or shorter than 24 characters, all private routes remain closed. Do not put the real password in `.env.example`, `fly.toml`, build arguments, or a Git commit. The login form works on desktop and mobile browsers over HTTPS. `/api/health` remains public so Fly can check the Machine. Change the secret to revoke every browser session.

No database secret is needed at build time or in Fly secrets. The entrypoint generates a random app database password in `/data/app-db-password`, initializes `/data/postgres` only when empty, and reuses both on restart. PostgreSQL superuser access uses a local peer-authenticated Unix socket; TCP allows only the application's database role. The app runs as UID 10001, PostgreSQL as its own system user, and the supervisor initializes ownership as root.

Startup waits for PostgreSQL, runs `node scripts/migrate.mjs`, then `node scripts/seed-finance.mjs`, then starts the standalone Next.js server. Migrations and the seed must remain retry-safe. No Fly `release_command` is used because release Machines cannot access this persistent database volume. `/api/health` verifies the app/database health. The supervisor shuts down both processes on termination and exits if either server dies.

`APP_ORIGIN` defaults at runtime to `https://<FLY_APP_NAME>.fly.dev`. Set it explicitly via `fly secrets set --app "$LIFE_OS_APP" APP_ORIGIN=https://your-domain.example` when using a custom domain. Optional integration credentials can be set as Fly secrets; absent cron/shortcut credentials leave those endpoints disabled. Never put credentials in `fly.toml`, Docker build arguments or the image.

## Subsequent deployments and inspection

```sh
fly deploy --app "$LIFE_OS_APP" --ha=false --strategy immediate
fly logs --app "$LIFE_OS_APP"
fly status --app "$LIFE_OS_APP"
fly ssh console --app "$LIFE_OS_APP" -C 'df -h /data'
fly ssh console --app "$LIFE_OS_APP" -C 'gosu postgres psql -d life_os -c "SELECT pg_size_pretty(pg_database_size(current_database()));"'
```

Take an off-Machine backup before deployments that change the schema. Keep old image references for code rollback, but do not assume old code is compatible with a newer schema. Do not downgrade PostgreSQL or erase `PG_VERSION`; a major version upgrade needs an explicit export/restore procedure. A missing password on an existing volume fails startup rather than silently rotating credentials.

## Backups and recovery

Stream a consistent custom-format database backup directly to your computer. Do not add a pseudo-terminal, since it can corrupt binary output. The command does not store a second copy on the small data volume.

```sh
mkdir -p backups
fly ssh console --app "$LIFE_OS_APP" --quiet --command /usr/local/lib/life-os/backup.sh > "backups/life-os-$(date +%Y%m%d-%H%M%S).dump"
```

Check the command's exit status and inspect the dump with PostgreSQL 16 `pg_restore --list`; regularly test a restore into a disposable database. Store backups somewhere durable off this Machine. Logical dumps omit the generated password and cluster roles by design; a fresh deployment creates the role/database/password before restoration.

For a **new recovery app and new volume**, deploy once to initialize its database. Upload the chosen dump using `fly ssh sftp shell --app RECOVERY_APP` (`put LOCAL_DUMP /tmp/restore.dump`). During the maintenance window, with no writes from clients, restore through the local PostgreSQL superuser, assigning restored objects to the app role:

```sh
fly ssh console --app RECOVERY_APP --command 'gosu postgres pg_restore --dbname=life_os --clean --if-exists --no-owner --no-acl --role=life_os /tmp/restore.dump'
```

Verify restore output, restart the recovery Machine to re-run outstanding migrations/seed, and verify records before directing traffic to it. Restoring with `--clean` replaces destination objects: use the recovery app, never your only production database. Remove the uploaded dump afterward. For a strict no-writes restore window, restore locally into a disposable PostgreSQL 16 instance first, then plan recovery cutover separately.

The configuration also keeps seven days of Fly volume snapshots. These are supplemental; Fly explicitly says snapshots should not be the primary backup method. Snapshot recovery restores the whole volume, including its password file:

```sh
fly volumes snapshots list VOLUME_ID --app "$LIFE_OS_APP"
fly volumes create life_os_data --app RECOVERY_APP --region fra --size 1 --snapshot-id SNAPSHOT_ID
```

Create the recovery volume before deploying the recovery app and ensure only that volume is available for attachment. Keep the original volume until recovery has been verified.

## Local image verification

```sh
docker build -t life-os-single .
docker volume create life-os-smoke
docker run --name life-os-smoke --memory=256m --cpus=1 -e LIFE_OS_ACCESS_PASSWORD=life-os-disposable-smoke-password-2026 -p 127.0.0.1:3000:3000 -v life-os-smoke:/data life-os-single
```

For an automated disposable test of health, backups, restart persistence and database-exit supervision, run `bash test/infra/smoke.sh life-os-single` after building the image. It creates and removes its own container and volume.

For a browser check of account, category, expense, JSON export and finance pages at 360, 390 and 430 px, run `bash test/infra/browser-smoke.sh life-os-single`. This starts and removes a disposable container on local port 3210. Install Playwright Chromium with `pnpm exec playwright install chromium`, or set `LIFE_OS_E2E_CHANNEL=chrome` to use an installed Chrome browser. Set `LIFE_OS_E2E_PORT` if port 3210 is occupied. The browser check does not replace testing on a physical phone.

From another terminal, check `curl --fail http://localhost:3000/api/health`, create a disposable record, restart the container, and confirm that record survives. Check `docker stats --no-stream life-os-smoke` under representative usage. `docker stop life-os-smoke` should stop both servers cleanly. Remove the disposable container/volume only after testing.

References: [Fly configuration](https://fly.io/docs/reference/configuration/), [deploy CLI and HA option](https://fly.io/docs/flyctl/deploy/), [volumes](https://fly.io/docs/volumes/overview/), [volume snapshots](https://fly.io/docs/volumes/snapshots/).

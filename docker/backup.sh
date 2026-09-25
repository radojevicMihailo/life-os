#!/usr/bin/env bash
set -Eeuo pipefail
# Stream a consistent logical backup. Redirect stdout to storage OFF the Machine.
exec gosu postgres pg_dump --host=/var/run/postgresql --dbname=life_os --format=custom --no-owner --no-acl

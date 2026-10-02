# Local port inspection — 2026-10-02

Inspected TCP listeners with `lsof` and Docker container port mappings. No leftover test containers or extra Life OS development servers were running.

| Port | Observed owner | Purpose |
| --- | --- | --- |
| 3000 | Docker `curvy-gateway`, nginx:1.27-alpine | Curvy HTTP gateway |
| 3211 | Next.js 16.3.2 node process | Life OS local preview |
| 5432 | Docker `curvy-db`, postgres:16 | Curvy PostgreSQL |
| 5433 | Docker `lifeos-postgres`, postgres:16 | Life OS PostgreSQL |
| 5100 | Docker `otterscan`, otterscan/otterscan | Otterscan HTTP |
| 5000, 7000 | macOS ControlCenter | System process listeners |
| 61007, 49821, 49822 | macOS rapportd | System process listeners |
| 45112 | Viber | Local application listener |
| 63342, 62808, 4931, 63113, 56108, 63811 | DataGrip and its Java JDBC subprocesses | Local application/database tooling |
| 52340, 62352, 52356 | VS Code helper processes | Local editor tooling |
| 62183 | Codex | Local application listener |

The gateway and database containers were left running; this inspection cannot determine whether unrelated projects are still needed. No unrelated services were stopped. Application-assigned ephemeral ports can change after restarting apps.

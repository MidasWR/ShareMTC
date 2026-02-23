# ShareMTC Platform (MTS x Space 2026)

ShareMTC is a provider marketplace for VM and Pod capacity where users can both buy compute and monetize their own hardware (CPU, GPU, RAM, network).

## Repository Structure

- `installer/` - one-command installer and bootstrap scripts.
- `services/` - all custom microservices and frontend.
- `charts/` - Helm charts for app services and infrastructure.
- `reports/` - iteration reports.

## Services

- `services/authservice` - email/password + Google OAuth2 authentication.
- `services/adminservice` - provider management for internal and donor machines.
- `services/resourceservice` - host heartbeats, free resource state, allocation and release with cgroups v2 limits.
- `services/billingservice` - plans, usage ingestion, accrual history, VIP network bonus logic.
- `services/hostagent` - host-side metrics collector for user PCs; can publish to Kafka and/or directly to `resourceservice` heartbeat API.
- `services/frontend` - TypeScript + Tailwind control plane UI with design-system-first architecture.
- `services/sdk` - shared logger, DB, JWT, HTTP utilities.

## Frontend UI Architecture

`services/frontend` is organized around reusable design primitives and domain screens.

### Frontend structure

- `src/design/tokens|primitives|components|patterns` - design system layers.
- `src/lib` - shared request helpers and low-level utilities.
- `src/types` - API-facing frontend types.
- `src/ui` - screen composition and control-plane sections.

### UX principles currently implemented

- Contract-safe refactor: API routes and data models are preserved.
- Single primary CTA in page header with role-oriented section navigation.
- Explicit screen states: loading, empty, error, and success feedback.
- Data-heavy consistency: search, filter, sort, density, pagination, column visibility.
- Accessibility baseline: focus rings, skip link, overlay keyboard close, table semantics.

### Frontend quality checks

Run frontend build:

```bash
cd services/frontend
npm run build
```

Run smoke e2e checks:

```bash
cd services/frontend
npx playwright install chromium
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
# in another terminal:
npm run test:e2e
```

Run local dev:

```bash
cd services/frontend
npm run dev
```

## Architecture Notes

- Go microservices use `net/http`, clear separation (`cmd`, `config`, `internal/adapter`, `internal/models`, `internal/service`).
- Logging is unified through `zerolog` and `github.com/MidasWR/mc-go-writer`.
- User PC `hostagent` instances send resource heartbeat to `resourceservice` (`/v1/resources/heartbeat`) and can additionally publish to Kafka for stream processing.
- Envoy Gateway is used as the external entrypoint.
- Postgres stores auth, provider, resource, and billing data.

## Prerequisites

- Linux host with `docker`, `kubectl`, `helm`, `gh`, `git`.
- Optional local Postgres for direct service runs.
- K3s for cluster deployment path.

## Local Service Development

Run any service:

```bash
cd services/authservice && go run ./cmd
```

Run frontend:

```bash
cd services/frontend
npm install
npm run dev
```

## Release Flow

The `Makefile` implements:

- one tag = one version (`TAG=vX.Y.Z`)
- optional skip matrix (`SKIP=1,2,...`)
- Docker build/push to Docker Hub
- Helm packaging
- GitHub release artifact publication
- overwrite mode for existing GitHub release tags (`gh release upload --clobber`)
- optional auto git add/commit/push before release

```bash
make release TAG=v1.0.0 SKIP=
```

With auto commit and push:

```bash
make release TAG=v1.0.0 AUTO_COMMIT_PUSH=1 COMMIT_MSG="chore: release v1.0.0"
```

Skip flags:

- `1` tests
- `2` image build/push
- `3` chart package
- `4` installer packaging
- `5` GitHub release publish

## Installer

Installer is idempotent and supports repeated runs through `helm upgrade --install`.

```bash
sudo ./installer/host-installer.sh
```

Install node agent on user PC (shared-hosting donor model):

```bash
sudo RESOURCE_API_URL=http://<platform-host-ip> ./installer/hostagent-node-installer.sh
```

`hostagent-node-installer.sh` installs a `systemd` service (`sharemct-hostagent`) that runs hostagent in Docker on the user's machine and reports available resources to the platform.

Release download example:

```bash
gh release download --repo MidasWR/ShareMTC --pattern "host-installer" --clobber && chmod +x host-installer && sudo ./host-installer
```

## Helm Layout

- `charts/ChartsServices`:
  - `template/auth|admin|resource|billing|frontend|hostagent/{deployment,service,vpa}.yaml`
  - `template/config.yaml`
- `charts/ChartsInfra`:
  - `template/kafka|envoy-gateway|redis|prometheus|postgres|falco|kyverno/*`
  - `template/config.yaml`

All service names are controlled through `values.yaml` `dns` fields.
`hostagent` chart deployment is disabled by default because primary deployment target is user PCs.

## Security and Observability

- Falco and Kyverno are part of the infra chart.
- Prometheus deployment is included for metrics collection.
- Every service exposes `/healthz`.

## Documentation Process

- Architecture and iteration tracking live in `reports/`.
- Notion MCP can be used to maintain synchronized project documentation.
- Frontend refactor progress:
  - `reports/2_frontend_ui_system_refactor.md`
  - `reports/3_frontend_pr_breakdown.md`
  - `reports/4_frontend_scale_roadmap.md`
  - `reports/5_frontend_ux_polish_iteration.md`

## Current Limitations

- Spark jobs are expected to be deployed separately or added as dedicated infra chart templates.
- GPU metrics currently use host-level detection and require NVIDIA driver paths to be present.
# ShareMTC

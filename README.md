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
- `services/hostagent` - host-side metrics collector and Kafka publisher.
- `services/frontend` - TypeScript + Tailwind control panel (auth/admin/host/vip).
- `services/sdk` - shared logger, DB, JWT, HTTP utilities.

## Architecture Notes

- Go microservices use `net/http`, clear separation (`cmd`, `config`, `internal/adapter`, `internal/models`, `internal/service`).
- Logging is unified through `zerolog` and `github.com/MidasWR/mc-go-writer`.
- Kafka receives host metrics from `hostagent`; Spark integration is expected to consume these topics for aggregate processing.
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

## Security and Observability

- Falco and Kyverno are part of the infra chart.
- Prometheus deployment is included for metrics collection.
- Every service exposes `/healthz`.

## Documentation Process

- Architecture and iteration tracking live in `reports/`.
- Notion MCP can be used to maintain synchronized project documentation.

## Current Limitations

- Spark jobs are expected to be deployed separately or added as dedicated infra chart templates.
- GPU metrics currently use host-level detection and require NVIDIA driver paths to be present.
# ShareMTC

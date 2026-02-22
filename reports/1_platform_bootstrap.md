# Iteration 1 - Platform Bootstrap

## What was implemented

- Created repository layout for installer, services, charts, and reports.
- Implemented core Go services: auth, admin, resource, billing, hostagent.
- Added shared SDK for logging, JWT, DB, and HTTP responses.
- Implemented frontend microservice using TypeScript + Tailwind.
- Added Helm charts for services and infrastructure.
- Added installer script and Makefile release pipeline.
- Added unit tests for critical logic in auth, billing, and resource services.

## Why this approach

- The system required immediate end-to-end viability from empty repo.
- A service-oriented layout with clear boundaries supports SRP and scale-out.
- Shared SDK prevents duplication and keeps behavior consistent across services.
- Helm split between infra and services maps to deployment lifecycle differences.

## Main challenges

- Bootstrapping the whole stack from zero while preserving strict structure and consistency.
- Defining cgroups v2 integration in a service-friendly way.
- Building a minimal but real billing flow without payment gateway dependencies.

## Decisions made

- Chosen `net/http` + clean layers for all Go services.
- Added network-speed-based VIP accrual bonus directly in billing domain logic.
- Implemented host metrics publishing via Kafka producer in hostagent.
- Used idempotent installer behavior with install guards and skip options.

## Next iteration plan

- Add Spark stream jobs for metrics aggregation and resource anomaly detection.
- Add database migration workflow with Atlas CRD integration details.
- Expand integration tests with containerized Postgres/Kafka.
- Harden OAuth2 flows with state persistence and callback CSRF protections.

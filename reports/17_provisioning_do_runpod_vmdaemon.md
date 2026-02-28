# Iteration 17: provisioning do-runpod vmdaemon

## Что сделано

- Добавлен новый микросервис `services/provisioningservice`:
  - REST API для `create/delete` VM (DigitalOcean) и Pod (RunPod);
  - idempotency по `request_id`;
  - хранение job-статусов и внешних ресурсов в PostgreSQL;
  - TTL worker для автоудаления просроченных ресурсов.
- Расширен `services/resourceservice`:
  - интеграция с `provisioningservice`;
  - рейт-лимит `5 RPM` на операции создания VM/Pod (серверная фиксация событий);
  - поддержка Pod lifecycle (`create/list/get/terminate`);
  - авто-expire pass для VM/Pod и перевод статусов в `expired`;
  - API/хранилище для `root_input_logs`.
- Добавлен `services/vmdaemon` как VM-side daemon:
  - systemd-ready бинарь;
  - публикация health/metrics/agent/root-input событий в Kafka;
  - ingestion audit log (`/var/log/audit/audit.log`) для root command history.
- Обновлены миграции `migrations/resourceservice/*`:
  - `provisioning_jobs`, `external_resources`, `pod_instances`, `root_input_logs`, `create_rate_limit_events`;
  - доп. поля `vms.external_id` и `vms.expires_at`.
- Обновлены Helm шаблоны:
  - deployment/service/vpa для `provisioningservice`;
  - env wiring для secrets (`DIGITALOCEAN_TOKEN`, `RUNPOD_API_KEY`, internal tokens).
- Обновлён frontend admin access:
  - поля `username/password` предзаполняются из env;
  - сценарий «нажать только вход» реализован.

## Почему так сделано

- Отделённый provisioning-сервис изолирует интеграции с внешними облаками и снижает связанность control-plane логики.
- Idempotent jobs + TTL worker позволяют безопасно обрабатывать повторные запросы, ошибки провайдера и авто-cleanup без ручного вмешательства.
- VM daemon вынесен в отдельный модуль для прозрачного, независимого и переиспользуемого канала телеметрии и audit данных.
- Серверный rate-limit в БД делает ограничение детерминированным между репликами.

## С какими трудностями столкнулся

- Сервисные маршруты `resourceservice` изначально были полностью под JWT middleware, что конфликтовало с daemon-only каналом.
- Нужно было согласовать одновременную модель: внешний TTL worker в provisioningservice и внутренний статус-sync в resourceservice.
- RunPod интеграция в проекте отсутствовала, пришлось добавить GraphQL-клиент и обработку ошибок с нуля.

## Какие решения принял

- Для daemon telemetry выбран интеграционный путь через Kafka (без прямого daemon->HTTP в resourceservice).
- Для `resourceservice` добавлен отдельный expiry pass, чтобы локальные статусы VM/Pod всегда синхронизировались с фактом удаления.
- Для cloud-init bootstrap в VM добавлен шаблон генерации systemd unit + env-файла daemon.
- Для Pod lifecycle использована новая таблица `pod_instances` вместо перегрузки `vms`.

## Планы на следующую итерацию

- Добавить integration-тесты с mockable HTTP transport для DigitalOcean/RunPod ошибок и retry-политик.
- Вынести provider-специфику размеров/образов в конфиг-каталог вместо внутренних мапперов.
- Добавить admin UI для просмотра `root_input_logs` и TTL/deletion lag метрик.
- Усилить network/security policy между `resourceservice` и `provisioningservice` на уровне cluster policies.

#!/usr/bin/env bash
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root: sudo ./installer/hostagent-node-installer.sh"
  exit 1
fi

if [[ "$(uname -s)" != "Linux" ]]; then
  echo "This installer supports Linux provider nodes only (MVP Linux-first)."
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required but not installed."
  exit 1
fi
DOCKER_BIN="$(command -v docker)"
if [[ -z "${DOCKER_BIN}" || ! -x "${DOCKER_BIN}" ]]; then
  echo "Docker executable path is invalid: ${DOCKER_BIN}"
  exit 1
fi

IMAGE_REPO="${IMAGE_REPO:-midaswr/host-hostagent}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
PROVIDER_ID="${PROVIDER_ID:-$(hostname)}"
RESOURCE_API_URL="${RESOURCE_API_URL:-}"
AGENT_TOKEN="${AGENT_TOKEN:-}"
KAFKA_BROKERS="${KAFKA_BROKERS:-}"
KAFKA_TOPIC="${KAFKA_TOPIC:-host.metrics}"
METRICS_INTERVAL_SECONDS="${METRICS_INTERVAL_SECONDS:-5}"

if [[ -z "${RESOURCE_API_URL}" && -z "${KAFKA_BROKERS}" ]]; then
  echo "Set RESOURCE_API_URL or KAFKA_BROKERS before installation."
  exit 1
fi

mkdir -p /etc/sharemct
cat >/etc/sharemct/hostagent.env <<EOF
PROVIDER_ID=${PROVIDER_ID}
RESOURCE_API_URL=${RESOURCE_API_URL}
AGENT_TOKEN=${AGENT_TOKEN}
KAFKA_BROKERS=${KAFKA_BROKERS}
KAFKA_TOPIC=${KAFKA_TOPIC}
METRICS_INTERVAL_SECONDS=${METRICS_INTERVAL_SECONDS}
EOF

cat >/etc/systemd/system/sharemct-hostagent.service <<EOF
[Unit]
Description=ShareMTC Host Agent
After=network-online.target
Wants=network-online.target

[Service]
Restart=always
RestartSec=5
EnvironmentFile=/etc/sharemct/hostagent.env
ExecStartPre=${DOCKER_BIN} pull ${IMAGE_REPO}:${IMAGE_TAG}
ExecStart=${DOCKER_BIN} run --rm --name sharemct-hostagent --privileged --network host --env-file /etc/sharemct/hostagent.env ${IMAGE_REPO}:${IMAGE_TAG}
ExecStop=${DOCKER_BIN} stop sharemct-hostagent

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now sharemct-hostagent

if systemctl is-active --quiet sharemct-hostagent; then
  echo "ShareMTC hostagent installed and started."
else
  echo "ShareMTC hostagent installed, but service is not active yet."
  echo "Check logs: journalctl -u sharemct-hostagent -n 100 --no-pager"
  exit 1
fi

echo "Check status: systemctl status sharemct-hostagent"

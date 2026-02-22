#!/usr/bin/env bash
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root: sudo ./installer/hostagent-node-installer.sh"
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required but not installed."
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
After=network-online.target docker.service
Wants=network-online.target
Requires=docker.service

[Service]
Restart=always
RestartSec=5
EnvironmentFile=/etc/sharemct/hostagent.env
ExecStartPre=/usr/bin/docker pull ${IMAGE_REPO}:${IMAGE_TAG}
ExecStart=/usr/bin/docker run --rm --name sharemct-hostagent --privileged --network host --env-file /etc/sharemct/hostagent.env ${IMAGE_REPO}:${IMAGE_TAG}
ExecStop=/usr/bin/docker stop sharemct-hostagent

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now sharemct-hostagent

echo "ShareMTC hostagent installed and started."
echo "Check status: systemctl status sharemct-hostagent"

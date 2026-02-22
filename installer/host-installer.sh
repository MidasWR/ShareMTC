#!/usr/bin/env bash
set -euo pipefail

export KUBECONFIG="${KUBECONFIG:-/etc/rancher/k3s/k3s.yaml}"

TAG="${TAG:-v1.0.0}"
NAMESPACE="${NAMESPACE:-host}"
SKIP="${SKIP:-}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

is_skipped() {
  local key="$1"
  [[ ",${SKIP}," == *",${key},"* ]]
}

if ! command -v k3s >/dev/null 2>&1; then
  if ! is_skipped "k3s"; then
    curl -sfL https://get.k3s.io | sh -
  fi
fi

if ! command -v helm >/dev/null 2>&1; then
  if ! is_skipped "helm"; then
    curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
  fi
fi

if ! is_skipped "sysctl"; then
  sudo sysctl -w net.core.somaxconn=4096
  sudo sysctl -w fs.file-max=1048576
fi

kubectl create namespace "${NAMESPACE}" --dry-run=client -o yaml | kubectl apply -f -

if ! is_skipped "infra"; then
  helm upgrade --install host-infra "${ROOT_DIR}/charts/ChartsInfra" \
    --namespace "${NAMESPACE}" \
    --set global.namespace="${NAMESPACE}"
fi

if ! is_skipped "services"; then
  helm upgrade --install host-services "${ROOT_DIR}/charts/ChartsServices" \
    --namespace "${NAMESPACE}" \
    --set global.namespace="${NAMESPACE}" \
    --set global.tag="${TAG}"
fi

LB_IP="$(kubectl get svc -n ${NAMESPACE} -o jsonpath='{.items[0].status.loadBalancer.ingress[0].ip}' 2>/dev/null || true)"
if [[ -z "${LB_IP}" ]]; then
  LB_IP="$(hostname -I | awk '{print $1}')"
fi

echo "Host platform deployed."
echo "Frontend URL: http://${LB_IP}"

#!/usr/bin/env bash
set -euo pipefail

export KUBECONFIG="${KUBECONFIG:-/etc/rancher/k3s/k3s.yaml}"

TAG="${TAG:-v1.0.0}"
NAMESPACE="${NAMESPACE:-host}"
SKIP="${SKIP:-}"
RELEASE_REPO="${RELEASE_REPO:-MidasWR/ShareMTC}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

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

INFRA_CHART_PATH="${ROOT_DIR}/charts/ChartsInfra"
SERVICES_CHART_PATH="${ROOT_DIR}/charts/ChartsServices"

if [[ ! -d "${INFRA_CHART_PATH}" || ! -d "${SERVICES_CHART_PATH}" ]]; then
  INFRA_CHART_PATH="${SCRIPT_DIR}/host-infra-${TAG}.tgz"
  SERVICES_CHART_PATH="${SCRIPT_DIR}/host-services-${TAG}.tgz"

  if [[ ! -f "${INFRA_CHART_PATH}" || ! -f "${SERVICES_CHART_PATH}" ]]; then
    if command -v gh >/dev/null 2>&1; then
      gh release download --repo "${RELEASE_REPO}" \
        --pattern "host-infra-${TAG}.tgz" \
        --pattern "host-services-${TAG}.tgz" \
        --dir "${SCRIPT_DIR}" \
        --clobber
    fi
  fi

  if [[ ! -f "${INFRA_CHART_PATH}" || ! -f "${SERVICES_CHART_PATH}" ]]; then
    echo "Charts not found for TAG=${TAG}."
    echo "Download assets with:"
    echo "gh release download --repo ${RELEASE_REPO} --pattern \"host-infra-${TAG}.tgz\" --pattern \"host-services-${TAG}.tgz\" --clobber"
    exit 1
  fi
fi

if ! is_skipped "infra"; then
  helm upgrade --install host-infra "${INFRA_CHART_PATH}" \
    --namespace "${NAMESPACE}" \
    --set global.namespace="${NAMESPACE}"
fi

if ! is_skipped "services"; then
  helm upgrade --install host-services "${SERVICES_CHART_PATH}" \
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

#!/usr/bin/env bash
set -euo pipefail

export KUBECONFIG="${KUBECONFIG:-/etc/rancher/k3s/k3s.yaml}"

TAG="${TAG:-v1.0.0}"
NAMESPACE="${NAMESPACE:-host}"
SKIP="${SKIP:-}"
RELEASE_REPO="${RELEASE_REPO:-MidasWR/ShareMTC}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "${TMP_DIR}"' EXIT

is_skipped() {
  local key="$1"
  [[ ",${SKIP}," == *",${key},"* ]]
}

wait_for_crd() {
  local crd="$1"
  local max_attempts="${2:-60}"
  local i=0
  until kubectl get crd "${crd}" >/dev/null 2>&1; do
    i=$((i + 1))
    if [[ "${i}" -ge "${max_attempts}" ]]; then
      echo "Timed out waiting for CRD ${crd}"
      exit 1
    fi
    sleep 2
  done
}

wait_for_atlas_crd() {
  local max_attempts="${1:-60}"
  local i=0
  until kubectl get crd atlasmigrations.db.atlasgo.io >/dev/null 2>&1 || kubectl get crd atlasschemas.db.atlasgo.io >/dev/null 2>&1; do
    i=$((i + 1))
    if [[ "${i}" -ge "${max_attempts}" ]]; then
      echo "Timed out waiting for Atlas Operator CRDs (atlasmigrations/atlasschemas)"
      exit 1
    fi
    sleep 2
  done
}

install_prerequisites() {
  helm repo add kyverno https://kyverno.github.io/kyverno
  helm repo add postgres-operator-charts https://opensource.zalando.com/postgres-operator/charts/postgres-operator
  helm repo add fairwinds-stable https://charts.fairwinds.com/stable
  helm repo update

  helm upgrade --install kyverno kyverno/kyverno -n kyverno --create-namespace
  helm upgrade --install postgres-operator postgres-operator-charts/postgres-operator -n postgres-operator --create-namespace
  helm upgrade --install atlas-operator oci://ghcr.io/ariga/charts/atlas-operator -n atlas-system --create-namespace
  helm upgrade --install vpa fairwinds-stable/vpa -n vpa --create-namespace

  wait_for_crd "clusterpolicies.kyverno.io"
  wait_for_crd "postgresqls.acid.zalan.do"
  wait_for_atlas_crd
  wait_for_crd "verticalpodautoscalers.autoscaling.k8s.io"
}

normalize_infra_chart_for_atlas_api() {
  local chart_path="$1"

  if [[ -f "${chart_path}" ]]; then
    local inspect_file
    inspect_file="$(tar -xOf "${chart_path}" host-infra/templates/atlas/crd.yaml 2>/dev/null || true)"
    if [[ "${inspect_file}" == *"apiVersion: atlasgo.io/v1alpha1"* ]]; then
      local unpack_dir="${TMP_DIR}/host-infra"
      mkdir -p "${unpack_dir}"
      tar -xzf "${chart_path}" -C "${TMP_DIR}"
      sed -i 's|apiVersion: atlasgo.io/v1alpha1|apiVersion: db.atlasgo.io/v1alpha1|g' \
        "${unpack_dir}/templates/atlas/crd.yaml"
      echo "${unpack_dir}"
      return 0
    fi
  fi

  echo "${chart_path}"
}

if ! command -v k3s >/dev/null 2>&1; then
  if ! is_skipped "k3s"; then
    curl -sfL https://get.k3s.io | sh -
  fi
fi

if ! kubectl cluster-info >/dev/null 2>&1; then
  systemctl restart k3s >/dev/null 2>&1 || true
fi

if ! kubectl cluster-info >/dev/null 2>&1; then
  echo "Kubernetes cluster is unreachable. Check k3s status and KUBECONFIG=${KUBECONFIG}"
  exit 1
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

if ! is_skipped "prereqs"; then
  install_prerequisites
fi

kubectl create namespace "${NAMESPACE}" --dry-run=client -o yaml | kubectl apply -f -

# Align namespace ownership metadata so Helm can manage Namespace resource from host-infra chart.
kubectl label namespace "${NAMESPACE}" app.kubernetes.io/managed-by=Helm --overwrite
kubectl annotate namespace "${NAMESPACE}" meta.helm.sh/release-name=host-infra --overwrite
kubectl annotate namespace "${NAMESPACE}" meta.helm.sh/release-namespace="${NAMESPACE}" --overwrite

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

INFRA_CHART_PATH="$(normalize_infra_chart_for_atlas_api "${INFRA_CHART_PATH}")"

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

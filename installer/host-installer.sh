#!/usr/bin/env bash
set -euo pipefail

export KUBECONFIG="${KUBECONFIG:-/etc/rancher/k3s/k3s.yaml}"

TAG="${TAG:-v1.0.0}"
NAMESPACE="${NAMESPACE:-host}"
SKIP="${SKIP:-}"
RELEASE_REPO="${RELEASE_REPO:-MidasWR/ShareMTC}"
FORCE_HELM_UPGRADE="${FORCE_HELM_UPGRADE:-1}"
HELM_TIMEOUT="${HELM_TIMEOUT:-15m}"
STRIMZI_NAMESPACE="${STRIMZI_NAMESPACE:-strimzi-system}"
SPARK_ENABLED="${SPARK_ENABLED:-0}"
SPARK_IMAGE="${SPARK_IMAGE:-apache/spark}"
SPARK_TAG="${SPARK_TAG:-3.5.8-scala2.12-java17-python3-ubuntu}"
FALCO_ENABLED="${FALCO_ENABLED:-0}"
REFRESH_RELEASE_ASSETS="${REFRESH_RELEASE_ASSETS:-1}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TMP_DIR="$(mktemp -d)"
echo "Version ${TAG}"
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

ensure_namespace_active() {
  local ns="$1"
  local phase
  phase="$(kubectl get namespace "${ns}" -o jsonpath='{.status.phase}' 2>/dev/null || true)"
  if [[ "${phase}" == "Terminating" ]]; then
    echo "Namespace ${ns} is Terminating; clearing finalizers to recover."
    kubectl patch namespace "${ns}" --type=merge -p '{"spec":{"finalizers":[]}}' >/dev/null 2>&1 || true
    kubectl wait --for=delete "namespace/${ns}" --timeout=120s >/dev/null 2>&1 || true
  fi
  if ! kubectl get namespace "${ns}" >/dev/null 2>&1; then
    kubectl create namespace "${ns}" >/dev/null
  fi
}

adopt_strimzi_cluster_resources() {
  local target_ns="$1"
  local release_name="strimzi-kafka-operator"
  local resource

  while IFS= read -r resource; do
    kubectl label "${resource}" app.kubernetes.io/managed-by=Helm --overwrite >/dev/null 2>&1 || true
    kubectl annotate "${resource}" meta.helm.sh/release-name="${release_name}" --overwrite >/dev/null 2>&1 || true
    kubectl annotate "${resource}" meta.helm.sh/release-namespace="${target_ns}" --overwrite >/dev/null 2>&1 || true
  done < <(kubectl get clusterrole -o name 2>/dev/null | grep '^clusterrole/strimzi-' || true)

  while IFS= read -r resource; do
    kubectl label "${resource}" app.kubernetes.io/managed-by=Helm --overwrite >/dev/null 2>&1 || true
    kubectl annotate "${resource}" meta.helm.sh/release-name="${release_name}" --overwrite >/dev/null 2>&1 || true
    kubectl annotate "${resource}" meta.helm.sh/release-namespace="${target_ns}" --overwrite >/dev/null 2>&1 || true
  done < <(kubectl get clusterrolebinding -o name 2>/dev/null | grep '^clusterrolebinding/strimzi-' || true)
}

install_prerequisites() {
  ensure_namespace_active "${NAMESPACE}"
  ensure_namespace_active "${STRIMZI_NAMESPACE}"

  helm repo add kyverno https://kyverno.github.io/kyverno
  helm repo add postgres-operator-charts https://opensource.zalando.com/postgres-operator/charts/postgres-operator
  helm repo add fairwinds-stable https://charts.fairwinds.com/stable
  helm repo add strimzi https://strimzi.io/charts/
  helm repo update

  adopt_strimzi_cluster_resources "${STRIMZI_NAMESPACE}"
  helm upgrade --install strimzi-kafka-operator strimzi/strimzi-kafka-operator -n "${STRIMZI_NAMESPACE}" --create-namespace
  helm upgrade --install kyverno kyverno/kyverno -n kyverno --create-namespace
  helm upgrade --install postgres-operator postgres-operator-charts/postgres-operator -n postgres-operator --create-namespace
  helm upgrade --install atlas-operator oci://ghcr.io/ariga/charts/atlas-operator -n atlas-system --create-namespace
  helm upgrade --install vpa fairwinds-stable/vpa -n vpa --create-namespace

  wait_for_crd "kafkas.kafka.strimzi.io"
  wait_for_crd "kafkatopics.kafka.strimzi.io"
  wait_for_crd "clusterpolicies.kyverno.io"
  wait_for_crd "postgresqls.acid.zalan.do"
  wait_for_atlas_crd
  wait_for_crd "verticalpodautoscalers.autoscaling.k8s.io"
}

normalize_infra_chart_for_compat() {
  local chart_path="$1"
  local work_dir=""
  local changed=0

  if [[ -d "${chart_path}" ]]; then
    work_dir="${TMP_DIR}/host-infra-dir"
    cp -R "${chart_path}" "${work_dir}"
  elif [[ -f "${chart_path}" ]]; then
    tar -xzf "${chart_path}" -C "${TMP_DIR}"
    work_dir="${TMP_DIR}/host-infra"
  else
    echo "${chart_path}"
    return 0
  fi

  local atlas_tpl="${work_dir}/templates/atlas/crd.yaml"
  if [[ -f "${atlas_tpl}" ]]; then
    local inspect_file
    inspect_file="$(cat "${atlas_tpl}")"
    if [[ "${inspect_file}" == *"apiVersion: atlasgo.io/v1alpha1"* || "${inspect_file}" == *"spec.target"* || "${inspect_file}" == *"spec.projectConfig"* ]]; then
      rm -f "${atlas_tpl}"
      changed=1
    fi
  fi

  local spark_tpl="${work_dir}/templates/spark/deployment.yaml"
  local spark_vpa_tpl="${work_dir}/templates/spark/vpa.yaml"
  if [[ -f "${spark_tpl}" ]]; then
    if [[ "${SPARK_ENABLED}" != "1" ]]; then
      rm -f "${spark_tpl}" "${spark_vpa_tpl}"
      changed=1
    else
      if grep -q 'bitnami/spark:3.5.2' "${spark_tpl}" 2>/dev/null; then
        sed -i "s|bitnami/spark:3.5.2|${SPARK_IMAGE}:${SPARK_TAG}|g" "${spark_tpl}"
        changed=1
      fi
    fi
  fi

  local falco_tpl="${work_dir}/templates/falco/deployment.yaml"
  local falco_vpa_tpl="${work_dir}/templates/falco/vpa.yaml"
  if [[ -f "${falco_tpl}" ]] && [[ "${FALCO_ENABLED}" != "1" ]]; then
    # Old chart variants could always render falco; enforce disable at installer level.
    rm -f "${falco_tpl}" "${falco_vpa_tpl}"
    changed=1
  fi

  if [[ "${changed}" -eq 1 ]]; then
    echo "${work_dir}"
  else
    echo "${chart_path}"
  fi
}

apply_runtime_spark_guard() {
  if [[ "${SPARK_ENABLED}" != "1" ]]; then
    kubectl delete deployment spark -n "${NAMESPACE}" --ignore-not-found >/dev/null 2>&1 || true
    kubectl delete vpa spark-vpa -n "${NAMESPACE}" --ignore-not-found >/dev/null 2>&1 || true
    kubectl delete pod -n "${NAMESPACE}" -l app=spark --ignore-not-found >/dev/null 2>&1 || true
    return 0
  fi

  local spark_image
  spark_image="$(kubectl get deployment spark -n "${NAMESPACE}" -o jsonpath='{.spec.template.spec.containers[0].image}' 2>/dev/null || true)"
  if [[ "${spark_image}" == "bitnami/spark:3.5.2" ]]; then
    kubectl set image deployment/spark spark="${SPARK_IMAGE}:${SPARK_TAG}" -n "${NAMESPACE}" >/dev/null 2>&1 || true
    kubectl rollout restart deployment/spark -n "${NAMESPACE}" >/dev/null 2>&1 || true
  fi
}

apply_runtime_falco_guard() {
  if [[ "${FALCO_ENABLED}" != "1" ]]; then
    kubectl delete daemonset falco -n "${NAMESPACE}" --ignore-not-found >/dev/null 2>&1 || true
    kubectl delete vpa falco-vpa -n "${NAMESPACE}" --ignore-not-found >/dev/null 2>&1 || true
    kubectl delete pod -n "${NAMESPACE}" -l app=falco --ignore-not-found >/dev/null 2>&1 || true
  fi
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

ensure_namespace_active "${NAMESPACE}"
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

  if [[ "${REFRESH_RELEASE_ASSETS}" == "1" ]]; then
    if command -v gh >/dev/null 2>&1; then
      gh release download --repo "${RELEASE_REPO}" \
        --tag "${TAG}" \
        --pattern "host-infra-${TAG}.tgz" \
        --pattern "host-services-${TAG}.tgz" \
        --dir "${SCRIPT_DIR}" \
        --clobber
    fi
  elif [[ ! -f "${INFRA_CHART_PATH}" || ! -f "${SERVICES_CHART_PATH}" ]]; then
    if command -v gh >/dev/null 2>&1; then
      gh release download --repo "${RELEASE_REPO}" \
        --tag "${TAG}" \
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

INFRA_CHART_PATH="$(normalize_infra_chart_for_compat "${INFRA_CHART_PATH}")"

HELM_UPGRADE_FLAGS=(--install --namespace "${NAMESPACE}" --atomic --cleanup-on-fail --wait --timeout "${HELM_TIMEOUT}" --reset-values)
if [[ "${FORCE_HELM_UPGRADE}" == "1" ]]; then
  HELM_UPGRADE_FLAGS+=(--force)
fi

if ! is_skipped "infra"; then
  helm upgrade host-infra "${INFRA_CHART_PATH}" "${HELM_UPGRADE_FLAGS[@]}" \
    --set global.namespace="${NAMESPACE}" \
    --set falco.enabled="${FALCO_ENABLED}" \
    --set spark.enabled="${SPARK_ENABLED}" \
    --set spark.image="${SPARK_IMAGE}" \
    --set spark.tag="${SPARK_TAG}"
fi

if ! is_skipped "services"; then
  helm upgrade host-services "${SERVICES_CHART_PATH}" "${HELM_UPGRADE_FLAGS[@]}" \
    --set global.namespace="${NAMESPACE}" \
    --set global.tag="${TAG}"
fi

apply_runtime_spark_guard
apply_runtime_falco_guard

LB_IP="$(kubectl get svc -n ${NAMESPACE} -o jsonpath='{.items[0].status.loadBalancer.ingress[0].ip}' 2>/dev/null || true)"
if [[ -z "${LB_IP}" ]]; then
  LB_IP="$(hostname -I | awk '{print $1}')"
fi

echo "Host platform deployed."
echo "Frontend URL: http://${LB_IP}"

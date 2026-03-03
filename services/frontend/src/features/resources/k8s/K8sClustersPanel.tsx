import { FormEvent, useEffect, useState } from "react";
import { useToast } from "../../../design/components/Toast";
import { Table } from "../../../design/components/Table";
import { EmptyState } from "../../../design/patterns/EmptyState";
import { DataFreshnessBadge } from "../../../design/patterns/DataFreshnessBadge";
import { PageSectionHeader } from "../../../design/patterns/PageSectionHeader";
import { Button } from "../../../design/primitives/Button";
import { Card } from "../../../design/primitives/Card";
import { Input } from "../../../design/primitives/Input";
import { Select } from "../../../design/primitives/Select";
import { formatOperationMessage } from "../../../design/utils/operationFeedback";
import { createK8sCluster, deleteK8sCluster, listK8sClusters, refreshK8sCluster } from "../api/resourcesApi";
import { KubernetesCluster } from "../../../types/api";
import { StatusBadge } from "../../../design/patterns/StatusBadge";
import { ActionDropdown } from "../../../design/components/ActionDropdown";
import { Modal } from "../../../design/components/Modal";
import { useProviderOptions } from "../../providers/useProviderOptions";

export function K8sClustersPanel() {
  const [rows, setRows] = useState<KubernetesCluster[]>([]);
  const [name, setName] = useState("core-k8s");
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<KubernetesCluster | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const { push } = useToast();
  const providerState = useProviderOptions();

  async function refresh() {
    setLoading(true);
    try {
      setRows(await listK8sClusters());
      setLastUpdatedAt(new Date());
    } catch (error) {
      push("error", error instanceof Error ? error.message : "Failed to load clusters", "Kubernetes clusters");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function create(event: FormEvent) {
    event.preventDefault();
    if (!providerState.providerID.trim()) {
      push("error", "Provider is required", "Kubernetes");
      return;
    }
    setLoading(true);
    try {
      const created = await createK8sCluster({
        name,
        provider_id: providerState.providerID,
        node_count: 3,
        node_type: "shared-cpu",
        k8s_version: "1.30"
      });
      await refresh();
      push(
        "success",
        formatOperationMessage({ action: "Create", entityType: "Cluster", entityName: created.name || name, entityId: created.id, result: "success" }),
        "Kubernetes"
      );
    } catch (error) {
      push("error", error instanceof Error ? error.message : "Failed to create cluster", "Kubernetes");
    } finally {
      setLoading(false);
    }
  }

  async function sync(clusterID: string) {
    setLoading(true);
    try {
      await refreshK8sCluster(clusterID);
      await refresh();
      push("info", formatOperationMessage({ action: "Refresh", entityType: "Cluster", entityId: clusterID, result: "updated" }), "Kubernetes");
    } catch (error) {
      push("error", error instanceof Error ? error.message : "Failed to refresh cluster", "Kubernetes");
    } finally {
      setLoading(false);
    }
  }

  async function remove(clusterID: string) {
    setLoading(true);
    try {
      await deleteK8sCluster(clusterID);
      await refresh();
      push("info", formatOperationMessage({ action: "Delete", entityType: "Cluster", entityId: clusterID, result: "success" }), "Kubernetes");
    } catch (error) {
      push("error", error instanceof Error ? error.message : "Failed to delete cluster", "Kubernetes");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="section-stack">
      <PageSectionHeader title="Kubernetes Clusters" description="Create and manage clusters through internal orchestrator." />
      <Card title="Quick Create Cluster" description="Minimal create form for internal orchestrator.">
        <form className="grid items-end gap-3 md:grid-cols-[1fr_1fr_auto]" onSubmit={create}>
          <Input label="Cluster Name" value={name} onChange={(event) => setName(event.target.value)} />
          <Select
            label="Provider"
            value={providerState.providerID}
            error={providerState.error}
            onChange={(event) => providerState.setProviderID(event.target.value)}
            options={
              providerState.options.length > 0
                ? providerState.options
                : [{ value: "", label: providerState.loading ? "Loading providers..." : "No providers available" }]
            }
          />
          <Button loading={loading} type="submit">Create</Button>
        </form>
      </Card>
      <Card
        title="Clusters"
        description="Cluster status, endpoint and lifecycle actions."
        actions={(
          <div className="flex items-center gap-2">
            <DataFreshnessBadge ts={lastUpdatedAt} label="Clusters" />
            <Button variant="secondary" onClick={refresh} loading={loading}>Refresh</Button>
          </div>
        )}
      >
        <div className="mt-3">
          <Table
            dense
            ariaLabel="Kubernetes cluster table"
            rowKey={(row) => row.id ?? row.name}
            items={rows}
            emptyState={<EmptyState title="No clusters yet" description="Create the first cluster to start orchestration." />}
            columns={[
              { key: "name", header: "Name", render: (row) => row.name },
              { key: "provider", header: "Provider", render: (row) => row.provider_id },
              { key: "nodes", header: "Nodes", render: (row) => String(row.node_count) },
              {
                key: "status",
                header: "Status",
                render: (row) => {
                  const value = row.status || "unknown";
                  if (value === "running") return <StatusBadge status="running" />;
                  if (value === "creating" || value === "suspended") return <StatusBadge status="starting" />;
                  if (value === "deleting" || value === "deleted") return <StatusBadge status="stopped" />;
                  return <StatusBadge status="error" />;
                }
              },
              { key: "endpoint", header: "Endpoint", render: (row) => row.endpoint || "-" },
              {
                key: "actions",
                header: "Actions",
                render: (row) => (
                  <ActionDropdown
                    label="Actions"
                    disabled={!row.id || loading}
                    options={[
                      { value: "refresh", label: "Refresh" },
                      { value: "delete", label: "Delete" }
                    ]}
                    onSelect={(action) => {
                      if (!row.id) return;
                      if (action === "refresh") sync(row.id);
                      if (action === "delete") setDeleteTarget(row);
                    }}
                  />
                )
              }
            ]}
          />
        </div>
      </Card>
      <Modal
        open={Boolean(deleteTarget)}
        title="Delete Kubernetes cluster"
        description={deleteTarget ? `Cluster ${deleteTarget.name} will be permanently deleted.` : undefined}
        confirmLabel="Delete"
        confirmVariant="destructive"
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget?.id) {
            setDeleteTarget(null);
            return;
          }
          void remove(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />
    </section>
  );
}

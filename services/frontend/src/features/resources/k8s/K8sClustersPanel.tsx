import { FormEvent, useEffect, useState } from "react";
import { useToast } from "../../../design/components/Toast";
import { Table } from "../../../design/components/Table";
import { EmptyState } from "../../../design/patterns/EmptyState";
import { PageSectionHeader } from "../../../design/patterns/PageSectionHeader";
import { Button } from "../../../design/primitives/Button";
import { Card } from "../../../design/primitives/Card";
import { Input } from "../../../design/primitives/Input";
import { createK8sCluster, deleteK8sCluster, listK8sClusters, refreshK8sCluster } from "../api/resourcesApi";
import { KubernetesCluster } from "../../../types/api";
import { StatusBadge } from "../../../design/patterns/StatusBadge";
import { ActionDropdown } from "../../../design/components/ActionDropdown";

export function K8sClustersPanel() {
  const [rows, setRows] = useState<KubernetesCluster[]>([]);
  const [name, setName] = useState("core-k8s");
  const [providerID, setProviderID] = useState("provider-default");
  const [loading, setLoading] = useState(false);
  const { push } = useToast();

  async function refresh() {
    setLoading(true);
    try {
      setRows(await listK8sClusters());
    } catch (error) {
      push("error", error instanceof Error ? error.message : "Failed to load clusters");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function create(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      await createK8sCluster({
        name,
        provider_id: providerID,
        node_count: 3,
        node_type: "shared-cpu",
        k8s_version: "1.30"
      });
      await refresh();
      push("success", "Kubernetes cluster created");
    } catch (error) {
      push("error", error instanceof Error ? error.message : "Failed to create cluster");
    } finally {
      setLoading(false);
    }
  }

  async function sync(clusterID: string) {
    setLoading(true);
    try {
      await refreshK8sCluster(clusterID);
      await refresh();
      push("info", "Cluster status refreshed");
    } catch (error) {
      push("error", error instanceof Error ? error.message : "Failed to refresh cluster");
    } finally {
      setLoading(false);
    }
  }

  async function remove(clusterID: string) {
    setLoading(true);
    try {
      await deleteK8sCluster(clusterID);
      await refresh();
      push("info", "Cluster deleted");
    } catch (error) {
      push("error", error instanceof Error ? error.message : "Failed to delete cluster");
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
          <Input label="Provider ID" value={providerID} onChange={(event) => setProviderID(event.target.value)} />
          <Button loading={loading} type="submit">Create</Button>
        </form>
      </Card>
      <Card
        title="Clusters"
        description="Cluster status, endpoint and lifecycle actions."
        actions={<Button variant="secondary" onClick={refresh} loading={loading}>Refresh</Button>}
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
                      if (action === "delete") remove(row.id);
                    }}
                  />
                )
              }
            ]}
          />
        </div>
      </Card>
    </section>
  );
}

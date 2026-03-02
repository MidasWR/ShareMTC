import { FormEvent, useEffect, useState } from "react";
import { deletePodCatalog, getPodProxyInfo, getPodProxyURL, listPodCatalog, listPodTemplates, upsertPodCatalog, upsertPodTemplate } from "../api/adminApi";
import { PodCatalogItem, PodTemplate } from "../../../types/api";
import { Card } from "../../../design/primitives/Card";
import { Input } from "../../../design/primitives/Input";
import { Select } from "../../../design/primitives/Select";
import { Button } from "../../../design/primitives/Button";
import { Table } from "../../../design/components/Table";
import { Modal } from "../../../design/components/Modal";
import { DataFreshnessBadge } from "../../../design/patterns/DataFreshnessBadge";
import { EmptyState } from "../../../design/patterns/EmptyState";
import { useToast } from "../../../design/components/Toast";
import { formatOperationMessage } from "../../../design/utils/operationFeedback";
import { resolvePodLogoURL } from "../../../lib/logoResolver";

export function AdminPodsPanel() {
  const [pods, setPods] = useState<PodCatalogItem[]>([]);
  const [templates, setTemplates] = useState<PodTemplate[]>([]);
  const [podName, setPodName] = useState("");
  const [hostIP, setHostIP] = useState("");
  const [sshUser, setSSHUser] = useState("root");
  const [sshAuthRef, setSSHAuthRef] = useState("");
  const [routeTarget, setRouteTarget] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [templateClass, setTemplateClass] = useState("all");
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PodCatalogItem | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [templateError, setTemplateError] = useState("");
  const [podErrors, setPodErrors] = useState<Record<string, string>>({});
  const { push } = useToast();

  async function refresh() {
    setLoading(true);
    try {
      const [podRows, templateRows] = await Promise.all([listPodCatalog(), listPodTemplates()]);
      setPods(podRows);
      setTemplates(templateRows);
      setLastUpdatedAt(new Date());
    } catch (error) {
      push("error", error instanceof Error ? error.message : "Failed to load catalog", "Admin POD catalog");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function createTemplate(event: FormEvent) {
    event.preventDefault();
    if (!templateName.trim()) {
      setTemplateError("Template name is required");
      return;
    }
    setTemplateError("");
    try {
      await upsertPodTemplate({
        id: "",
        code: `tmpl-${Date.now()}`,
        name: templateName.trim(),
        description: "Custom workload template",
        gpu_class: templateClass
      });
      setTemplateName("");
      await refresh();
      push("success", formatOperationMessage({ action: "Create", entityType: "Template", entityName: templateName.trim(), result: "success" }), "Admin POD catalog");
    } catch (error) {
      push("error", error instanceof Error ? error.message : "Error adding template", "Admin POD catalog");
    }
  }

  async function createPod(event: FormEvent) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!podName.trim()) nextErrors.podName = "Instance name is required";
    if (!hostIP.trim()) nextErrors.hostIP = "Host IP is required";
    if (!sshUser.trim()) nextErrors.sshUser = "SSH user is required";
    setPodErrors(nextErrors);
    const firstError = Object.values(nextErrors)[0];
    if (firstError) {
      push("error", firstError, "Admin POD catalog");
      return;
    }
    try {
      await upsertPodCatalog({
        id: "",
        code: `pod-${Date.now()}`,
        name: podName.trim(),
        description: "Custom instance",
        gpu_model: "NVIDIA RTX 4090",
        gpu_vram_gb: 24,
        cpu_cores: 16,
        ram_gb: 64,
        network_mbps: 1000,
        hourly_price_usd: 1.5,
        monthly_price_usd: 820,
        os_name: "Ubuntu 22.04",
        logo_url: resolvePodLogoURL(`pod-${podName.trim().toLowerCase().replace(/\s+/g, "-")}`, "NVIDIA RTX 4090"),
        host_ip: hostIP,
        ssh_user: sshUser,
        ssh_auth_ref: sshAuthRef,
        route_target: routeTarget,
        template_ids: templates.map((item) => item.id)
      });
      setPodName("");
      setHostIP("");
      setRouteTarget("");
      await refresh();
      push("success", formatOperationMessage({ action: "Create", entityType: "Instance", entityName: podName.trim(), result: "success" }), "Admin POD catalog");
    } catch (error) {
      push("error", error instanceof Error ? error.message : "Error adding instance", "Admin POD catalog");
    }
  }

  async function removePod(id: string, name: string) {
    try {
      await deletePodCatalog(id);
      await refresh();
      push("info", formatOperationMessage({ action: "Delete", entityType: "Instance", entityName: name, entityId: id, result: "success" }), "Admin POD catalog");
    } catch (error) {
      push("error", error instanceof Error ? error.message : "Error removing instance", "Admin POD catalog");
    }
  }

  async function showProxy(id: string) {
    try {
      const info = await getPodProxyInfo(id);
      push("info", `Proxy target: ${info.route_target || "-"} | host: ${info.host_ip || "-"}`, "Admin POD catalog");
      window.open(getPodProxyURL(id, "/"), "_blank", "noopener,noreferrer");
    } catch (error) {
      push("error", error instanceof Error ? error.message : "Failed to resolve proxy info", "Admin POD catalog");
    }
  }

  return (
    <section className="section-stack">
      <Card title="Manage Templates" description="CRUD operations for environment templates.">
        <form className="grid gap-3 md:grid-cols-3 items-end" onSubmit={createTemplate}>
          <Input label="New Template Name" required error={templateError} value={templateName} onChange={(event) => setTemplateName(event.target.value)} />
          <Select 
            label="Template Type" 
            value={templateClass} 
            onChange={(e) => setTemplateClass(e.target.value)}
            options={[
              { value: "all", label: "General GPU" },
              { value: "high-end", label: "High-End LLM" },
              { value: "none", label: "CPU Only (Docker)" }
            ]}
          />
          <Button type="submit" variant="secondary">Add Template</Button>
        </form>
      </Card>

      <Card title="Manage Catalog Instances" description="Add or remove hardware instances from catalog.">
        <form className="grid gap-2 md:grid-cols-3" onSubmit={createPod}>
          <Input label="Instance Name" required error={podErrors.podName} value={podName} onChange={(event) => setPodName(event.target.value)} />
          <Input label="Host IP" required error={podErrors.hostIP} value={hostIP} onChange={(event) => setHostIP(event.target.value)} />
          <Input label="SSH User" required error={podErrors.sshUser} value={sshUser} onChange={(event) => setSSHUser(event.target.value)} />
          <Input label="SSH Auth Ref" value={sshAuthRef} onChange={(event) => setSSHAuthRef(event.target.value)} />
          <Input label="Route target" value={routeTarget} onChange={(event) => setRouteTarget(event.target.value)} placeholder="http://10.0.0.2:3000" />
          <Button className="mt-7" type="submit" variant="secondary">Add Instance</Button>
        </form>
        <div className="mt-4">
          <div className="mb-3 flex justify-end">
            <DataFreshnessBadge ts={lastUpdatedAt} label="Catalog" />
          </div>
          <Table
            ariaLabel="Admin Catalog"
            rowKey={(row) => row.id}
            items={pods}
            emptyState={<EmptyState title="Catalog is empty" description="Add the first instance." />}
            columns={[
              { key: "name", header: "Instance", render: (row) => row.name },
              { key: "gpu", header: "GPU", render: (row) => row.gpu_model },
              { key: "host", header: "Host", render: (row) => row.host_ip || "-" },
              { key: "route", header: "Route", render: (row) => row.route_target || "-" },
              { key: "price", header: "$/hr", render: (row) => row.hourly_price_usd.toFixed(2) },
              { key: "templates", header: "Templates", render: (row) => `${row.template_ids?.length ?? 0}` },
              {
                key: "actions",
                header: "Actions",
                render: (row) => (
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => showProxy(row.id)}>Proxy</Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(row)} disabled={loading}>Delete</Button>
                  </div>
                )
              }
            ]}
          />
        </div>
      </Card>
      <Modal
        open={Boolean(deleteTarget)}
        title="Delete catalog instance"
        description={deleteTarget ? `Instance ${deleteTarget.name} will be removed from catalog.` : undefined}
        confirmLabel="Delete"
        confirmVariant="destructive"
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          void removePod(deleteTarget.id, deleteTarget.name);
          setDeleteTarget(null);
        }}
      />
    </section>
  );
}

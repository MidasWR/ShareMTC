import { useMemo, useState } from "react";
import { listAllAccruals } from "../../billing/api/billingApi";
import { listAllAllocations } from "../../resources/api/resourcesApi";
import { useToast } from "../../../design/components/Toast";
import { Tabs } from "../../../design/primitives/Tabs";
import { EmptyState } from "../../../design/patterns/EmptyState";
import { PageSectionHeader } from "../../../design/patterns/PageSectionHeader";
import { Card } from "../../../design/primitives/Card";
import { Button } from "../../../design/primitives/Button";
import { Table } from "../../../design/components/Table";
import { AdminDashboardPanel } from "../../dashboard/admin/AdminDashboardPanel";
import { AdminServersPanel } from "../servers/AdminServersPanel";
import { SharingAdminPanel } from "../sharing/SharingAdminPanel";
import { getAgentInstallCommand } from "../api/adminApi";
import { AdminPodsPanel } from "../catalog/AdminPodsPanel";

type AdminTab = "overview" | "providers" | "pods" | "allocations" | "billing" | "risk";

export function AdminConsolePanel() {
  const [tab, setTab] = useState<AdminTab>("overview");
  const [loading, setLoading] = useState(false);
  const [commandLoading, setCommandLoading] = useState(false);
  const [allocations, setAllocations] = useState<Array<{ id: string; provider_id: string; cpu_cores: number; ram_mb: number; gpu_units: number; released_at?: string | null }>>([]);
  const [accruals, setAccruals] = useState<Array<{ id: string; provider_id: string; total_usd: number; vip_bonus_usd: number; created_at: string }>>([]);
  const [installCommand, setInstallCommand] = useState("");
  const [installerURL, setInstallerURL] = useState("");
  const [lastDataRefreshAt, setLastDataRefreshAt] = useState<Date | null>(null);
  const [lastCommandRefreshAt, setLastCommandRefreshAt] = useState<Date | null>(null);
  const { push } = useToast();

  async function refreshData() {
    setLoading(true);
    try {
      const [allocRows, accrualRows] = await Promise.all([listAllAllocations(200, 0), listAllAccruals(200, 0)]);
      setAllocations(allocRows);
      setAccruals(accrualRows);
      setLastDataRefreshAt(new Date());
      push("info", "Admin console data refreshed");
    } catch (error) {
      push("error", error instanceof Error ? error.message : "Failed to refresh admin console");
    } finally {
      setLoading(false);
    }
  }

  async function refreshInstallCommand() {
    setCommandLoading(true);
    try {
      const payload = await getAgentInstallCommand();
      setInstallCommand(payload.command);
      setInstallerURL(payload.installer_url);
      setLastCommandRefreshAt(new Date());
    } catch (error) {
      push("error", error instanceof Error ? error.message : "Failed to fetch install command");
    } finally {
      setCommandLoading(false);
    }
  }

  async function copyInstallerURL() {
    if (!installerURL) {
      push("error", "Installer URL is empty");
      return;
    }
    try {
      await navigator.clipboard.writeText(installerURL);
      push("success", "Installer URL copied");
    } catch {
      push("error", "Clipboard unavailable");
    }
  }

  const riskRows = useMemo(() => {
    const runningByProvider = new Map<string, number>();
    for (const item of allocations) {
      if (!item.released_at) runningByProvider.set(item.provider_id, (runningByProvider.get(item.provider_id) ?? 0) + 1);
    }
    return [...runningByProvider.entries()]
      .filter(([, count]) => count > 5)
      .map(([providerID, count]) => ({
        provider_id: providerID,
        issue: "High load from active allocations",
        score: count
      }));
  }, [allocations]);
  const highRiskCount = useMemo(() => riskRows.filter((row) => row.score > 10).length, [riskRows]);

  return (
    <section className="section-stack">
      <PageSectionHeader
        title="Admin Console"
        description="Unified admin module: overview, providers, allocations, billing, and risk."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={refreshInstallCommand} loading={commandLoading}>
              Refresh curl
            </Button>
            <Button variant="secondary" onClick={refreshData} loading={loading}>
              Refresh console
            </Button>
          </div>
        }
      />
      <Card
        title="Data Freshness"
        description="Track recency of console datasets and installer command."
      >
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-textSecondary">
            Console data: {lastDataRefreshAt ? lastDataRefreshAt.toLocaleString() : "not refreshed yet"}
          </span>
          <span className="text-xs text-textSecondary">
            Installer command: {lastCommandRefreshAt ? lastCommandRefreshAt.toLocaleString() : "not refreshed yet"}
          </span>
        </div>
      </Card>
      <Card title="Agent Install (one-command)" description="Copy this command to install hostagent on a host machine.">
        <div className="rounded-md border border-border bg-elevated p-3 font-mono text-xs text-textSecondary">
          {installCommand || "Press 'Refresh curl' to fetch the latest command."}
        </div>
        <div className="mt-3 rounded-md border border-border bg-canvas p-3 text-xs text-textSecondary">
          <div className="mb-2 uppercase tracking-wide text-textMuted">Direct installer URL</div>
          <div className="break-all font-mono">{installerURL || "Press 'Refresh curl' to fetch installer URL."}</div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={copyInstallerURL} disabled={!installerURL}>
              Copy installer URL
            </Button>
            <a
              className="focus-ring inline-flex h-10 items-center justify-center rounded-md border border-border px-4 text-sm font-medium text-textPrimary hover:border-brand hover:text-brand"
              href={installerURL || "#"}
              target="_blank"
              rel="noreferrer"
              aria-disabled={!installerURL}
            >
              Open installer URL
            </a>
          </div>
        </div>
      </Card>
      <Tabs
        items={[
          { id: "overview", label: "Overview" },
          { id: "providers", label: "Providers" },
          { id: "pods", label: "POD Catalog" },
          { id: "allocations", label: "Allocations" },
          { id: "billing", label: "Billing" },
          { id: "risk", label: "Risk & Sharing" }
        ]}
        value={tab}
        onChange={(next) => setTab(next)}
      />

      {tab === "overview" ? <AdminDashboardPanel /> : null}
      {tab === "providers" ? <AdminServersPanel /> : null}
      {tab === "pods" ? <AdminPodsPanel /> : null}
      {tab === "risk" ? (
        <Card title="Risk and Sharing Summary" description="Unified view for risk posture and sharing moderation signals.">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-md border border-border bg-elevated p-3 text-xs text-textSecondary">
              Total risk signals: <span className="font-semibold text-textPrimary">{riskRows.length}</span>
            </div>
            <div className="rounded-md border border-border bg-elevated p-3 text-xs text-textSecondary">
              High-load providers: <span className="font-semibold text-textPrimary">{highRiskCount}</span>
            </div>
            <div className="rounded-md border border-border bg-elevated p-3 text-xs text-textSecondary">
              Sharing moderation source: <span className="font-semibold text-textPrimary">Admin Sharing panel</span>
            </div>
          </div>
          <div className="mt-4">
            <SharingAdminPanel />
          </div>
        </Card>
      ) : null}

      {tab === "allocations" ? (
        <Card title="Allocation Registry" description="Admin flow of allocations across all providers.">
          <Table
            dense
            ariaLabel="Admin allocations"
            rowKey={(row) => row.id}
            items={allocations}
            emptyState={<EmptyState title="No allocations found" description="Allocation stream is empty for the selected period." />}
            columns={[
              { key: "id", header: "Allocation", render: (row) => <span className="font-mono text-xs">{row.id}</span> },
              { key: "provider", header: "Provider", render: (row) => <span className="font-mono text-xs">{row.provider_id}</span> },
              { key: "cpu", header: "CPU", render: (row) => row.cpu_cores },
              { key: "ram", header: "RAM MB", render: (row) => row.ram_mb },
              { key: "gpu", header: "GPU", render: (row) => row.gpu_units },
              { key: "status", header: "Status", render: (row) => (row.released_at ? "released" : "active") }
            ]}
          />
        </Card>
      ) : null}

      {tab === "billing" ? (
        <Card title="Billing Registry" description="Accrual stream for reconciliation and payout control.">
          <Table
            dense
            ariaLabel="Admin billing accruals"
            rowKey={(row) => row.id}
            items={accruals}
            emptyState={<EmptyState title="No accruals found" description="Billing stream is empty for the selected period." />}
            columns={[
              { key: "id", header: "Accrual", render: (row) => <span className="font-mono text-xs">{row.id}</span> },
              { key: "provider", header: "Provider", render: (row) => <span className="font-mono text-xs">{row.provider_id}</span> },
              { key: "bonus", header: "Bonus", render: (row) => `$${row.vip_bonus_usd.toFixed(2)}` },
              { key: "total", header: "Total", render: (row) => `$${row.total_usd.toFixed(2)}` },
              { key: "created", header: "Created", render: (row) => new Date(row.created_at).toLocaleString() }
            ]}
          />
        </Card>
      ) : null}

      {tab === "risk" ? (
        <Card title="Automated Risk Signals" description="Derived risks based on utilization patterns.">
          <Table
            dense
            ariaLabel="Admin risk signals"
            rowKey={(row) => `${row.provider_id}-${row.issue}`}
            items={riskRows}
            emptyState={<EmptyState title="No risks detected" description="No providers with high-load pattern were found." />}
            columns={[
              { key: "provider", header: "Provider", render: (row) => row.provider_id },
              { key: "issue", header: "Issue", render: (row) => row.issue },
              { key: "score", header: "Score", render: (row) => row.score }
            ]}
          />
        </Card>
      ) : null}
    </section>
  );
}

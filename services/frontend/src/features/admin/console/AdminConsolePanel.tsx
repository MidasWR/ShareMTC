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

type AdminTab = "overview" | "providers" | "allocations" | "billing" | "risk";

export function AdminConsolePanel() {
  const [tab, setTab] = useState<AdminTab>("overview");
  const [loading, setLoading] = useState(false);
  const [allocations, setAllocations] = useState<Array<{ id: string; provider_id: string; cpu_cores: number; ram_mb: number; gpu_units: number; released_at?: string | null }>>([]);
  const [accruals, setAccruals] = useState<Array<{ id: string; provider_id: string; total_usd: number; vip_bonus_usd: number; created_at: string }>>([]);
  const { push } = useToast();

  async function refreshData() {
    setLoading(true);
    try {
      const [allocRows, accrualRows] = await Promise.all([listAllAllocations(200, 0), listAllAccruals(200, 0)]);
      setAllocations(allocRows);
      setAccruals(accrualRows);
      push("info", "Admin console data refreshed");
    } catch (error) {
      push("error", error instanceof Error ? error.message : "Admin console refresh failed");
    } finally {
      setLoading(false);
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
        issue: "High concurrent allocation pressure",
        score: count
      }));
  }, [allocations]);

  return (
    <section className="section-stack">
      <PageSectionHeader
        title="Admin Console"
        description="Unified admin module with overview, provider operations, allocations, billing, and risk."
        actions={
          <Button variant="secondary" onClick={refreshData} loading={loading}>
            Refresh console
          </Button>
        }
      />
      <Tabs
        items={[
          { id: "overview", label: "Overview" },
          { id: "providers", label: "Providers" },
          { id: "allocations", label: "Allocations" },
          { id: "billing", label: "Billing" },
          { id: "risk", label: "Risk/Sharing" }
        ]}
        value={tab}
        onChange={(next) => setTab(next)}
      />

      {tab === "overview" ? <AdminDashboardPanel /> : null}
      {tab === "providers" ? <AdminServersPanel /> : null}
      {tab === "risk" ? <SharingAdminPanel /> : null}

      {tab === "allocations" ? (
        <Card title="Allocation registry" description="Server-side admin feed across all providers.">
          <Table
            dense
            ariaLabel="Admin allocations"
            rowKey={(row) => row.id}
            items={allocations}
            emptyState={<EmptyState title="No allocations found" description="Allocation feed is empty for the selected time window." />}
            columns={[
              { key: "id", header: "Allocation", render: (row) => <span className="font-mono text-xs">{row.id}</span> },
              { key: "provider", header: "Provider", render: (row) => <span className="font-mono text-xs">{row.provider_id}</span> },
              { key: "cpu", header: "CPU", render: (row) => row.cpu_cores },
              { key: "ram", header: "RAM MB", render: (row) => row.ram_mb },
              { key: "gpu", header: "GPU", render: (row) => row.gpu_units },
              { key: "status", header: "Status", render: (row) => (row.released_at ? "released" : "running") }
            ]}
          />
        </Card>
      ) : null}

      {tab === "billing" ? (
        <Card title="Billing registry" description="Accrual feed for reconciliation and payout control.">
          <Table
            dense
            ariaLabel="Admin billing accruals"
            rowKey={(row) => row.id}
            items={accruals}
            emptyState={<EmptyState title="No accruals found" description="Billing feed is empty for the selected time window." />}
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
        <Card title="Automated risk signals" description="Derived risks from utilization patterns.">
          <Table
            dense
            ariaLabel="Admin computed risk rows"
            rowKey={(row) => `${row.provider_id}-${row.issue}`}
            items={riskRows}
            emptyState={<EmptyState title="No computed risks" description="No high-pressure providers detected right now." />}
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

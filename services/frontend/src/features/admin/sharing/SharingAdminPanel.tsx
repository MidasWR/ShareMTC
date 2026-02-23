import { useMemo, useState } from "react";
import { Table } from "../../../design/components/Table";
import { useToast } from "../../../design/components/Toast";
import { EmptyState } from "../../../design/patterns/EmptyState";
import { InlineAlert } from "../../../design/patterns/InlineAlert";
import { MetricTile } from "../../../design/patterns/MetricTile";
import { PageSectionHeader } from "../../../design/patterns/PageSectionHeader";
import { SkeletonBlock } from "../../../design/patterns/SkeletonBlock";
import { Button } from "../../../design/primitives/Button";
import { Card } from "../../../design/primitives/Card";
import { Input } from "../../../design/primitives/Input";
import { API_BASE } from "../../../config/apiBase";
import { fetchJSON } from "../../../lib/http";
import { Allocation, Provider, UsageAccrual } from "../../../types/api";


type SharingRow = {
  provider_id: string;
  display_name: string;
  online: boolean;
  active_allocations: number;
  total_allocations: number;
  total_revenue: number;
  risk_level: "low" | "medium" | "high";
};

export function SharingAdminPanel() {
  const [rows, setRows] = useState<SharingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [providerFilter, setProviderFilter] = useState("");
  const [error, setError] = useState("");
  const { push } = useToast();

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const providers = await fetchJSON<Provider[]>(`${API_BASE.admin}/v1/admin/providers/`);
      const nextRows = await Promise.all(
        providers.map(async (provider) => {
          const [allocations, accruals] = await Promise.all([
            fetchJSON<Allocation[]>(`${API_BASE.resource}/v1/resources/allocations?provider_id=${encodeURIComponent(provider.id)}`),
            fetchJSON<UsageAccrual[]>(`${API_BASE.billing}/v1/billing/accruals?provider_id=${encodeURIComponent(provider.id)}`)
          ]);
          const activeAllocations = allocations.filter((item) => !item.released_at).length;
          const totalRevenue = accruals.reduce((sum, item) => sum + item.total_usd, 0);
          const riskLevel: SharingRow["risk_level"] = !provider.online
            ? "high"
            : activeAllocations === 0
              ? "medium"
              : "low";

          return {
            provider_id: provider.id,
            display_name: provider.display_name,
            online: provider.online,
            active_allocations: activeAllocations,
            total_allocations: allocations.length,
            total_revenue: totalRevenue,
            risk_level: riskLevel
          };
        })
      );
      setRows(nextRows);
      push("info", "Sharing admin data synced");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Sharing admin sync failed");
      push("error", requestError instanceof Error ? requestError.message : "Sharing admin sync failed");
    } finally {
      setLoading(false);
    }
  }

  const filteredRows = useMemo(() => {
    const query = providerFilter.toLowerCase().trim();
    if (!query) return rows;
    return rows.filter((row) => row.display_name.toLowerCase().includes(query) || row.provider_id.toLowerCase().includes(query));
  }, [rows, providerFilter]);

  const highRiskCount = filteredRows.filter((row) => row.risk_level === "high").length;

  return (
    <section className="section-stack">
      <PageSectionHeader
        title="Admin Sharing"
        description="Review sharing posture, provider risk, and moderation baseline."
        actions={
          <Button onClick={refresh} loading={loading}>
            Sync providers
          </Button>
        }
      />

      <Card
        title="Sharing overview"
        description="At-a-glance distribution and risk indicators."
        actions={
          <Button variant="secondary" onClick={refresh} loading={loading}>
            Refresh data
          </Button>
        }
      >
        <div className="grid gap-3 md:grid-cols-[2fr_auto]">
          <Input
            label="Filter provider"
            placeholder="Display name or provider id"
            value={providerFilter}
            onChange={(event) => setProviderFilter(event.target.value)}
          />
          <Button variant="secondary" className="md:mt-7" onClick={() => setProviderFilter("")}>
            Clear filter
          </Button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <MetricTile label="Providers in scope" value={`${filteredRows.length}`} />
          <MetricTile label="High risk nodes" value={`${highRiskCount}`} />
          <MetricTile label="Online ratio" value={`${filteredRows.filter((row) => row.online).length}/${Math.max(filteredRows.length, 1)}`} />
        </div>
      </Card>

      <Card title="Sharing risk table" description="Operational posture for provider supply and sharing stability.">
        {loading ? <SkeletonBlock lines={6} /> : null}
        {!loading && error ? <InlineAlert kind="error">{error}</InlineAlert> : null}
        <Table
          dense
          ariaLabel="Sharing admin risk table"
          rowKey={(row) => row.provider_id}
          items={!loading && !error ? filteredRows : []}
          emptyState={<EmptyState title="No sharing data" description="Use Sync providers to build moderation view." />}
          columns={[
            { key: "provider", header: "Provider", render: (row) => row.display_name },
            { key: "id", header: "Provider ID", render: (row) => <span className="font-mono text-xs">{row.provider_id}</span> },
            { key: "online", header: "Online", render: (row) => (row.online ? "yes" : "no") },
            { key: "active", header: "Active allocations", render: (row) => <span className="tabular-nums">{row.active_allocations}</span> },
            { key: "revenue", header: "Revenue", render: (row) => <span className="tabular-nums">${row.total_revenue.toFixed(2)}</span> },
            { key: "risk", header: "Risk level", render: (row) => row.risk_level }
          ]}
        />
      </Card>
    </section>
  );
}

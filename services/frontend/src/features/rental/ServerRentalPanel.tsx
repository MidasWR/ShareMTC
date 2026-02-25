import { useMemo, useState } from "react";
import { LuChevronDown, LuChevronUp, LuExternalLink, LuFileText, LuPlay, LuPower, LuRefreshCw, LuTrash2 } from "react-icons/lu";
import { useSettings } from "../../app/providers/SettingsProvider";
import { EmptyState } from "../../design/patterns/EmptyState";
import { PageSectionHeader } from "../../design/patterns/PageSectionHeader";
import { StatusBadge } from "../../design/patterns/StatusBadge";
import { Button } from "../../design/primitives/Button";
import { Card } from "../../design/primitives/Card";
import { Icon } from "../../design/primitives/Icon";
import { Input } from "../../design/primitives/Input";
import { Select } from "../../design/primitives/Select";
import { getTabElementID, getTabPanelElementID, Tabs } from "../../design/primitives/Tabs";
import { demoInstances } from "../hifi/mockData";
import { DemoInstance } from "../hifi/types";
import { flagFromCountry, formatDateTime, formatUSD } from "../hifi/formatters";

const detailTabs = [
  { id: "overview", label: "Overview" },
  { id: "logs", label: "Logs" },
  { id: "metrics", label: "Metrics" },
  { id: "billing", label: "Billing" }
] as const;

type DetailTab = (typeof detailTabs)[number]["id"];

export function ServerRentalPanel() {
  const { settings } = useSettings();
  const locale = settings.language === "ru" ? "ru" : "en";
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [expandedId, setExpandedId] = useState<string>("");
  const [selectedId, setSelectedId] = useState<string>(demoInstances[0]?.id || "");
  const [detailTab, setDetailTab] = useState<DetailTab>("overview");

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return demoInstances.filter((row) => {
      const matchesSearch = !q || row.name.toLowerCase().includes(q) || row.id.toLowerCase().includes(q) || row.country.toLowerCase().includes(q);
      const matchesStatus = !statusFilter || row.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter]);

  const selected = useMemo(() => demoInstances.find((item) => item.id === selectedId) || null, [selectedId]);

  function renderDetail(instance: DemoInstance) {
    return (
      <div className="rounded-md border border-border bg-canvas p-3 text-sm text-textSecondary">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-textMuted">Endpoints</p>
            <ul className="mt-1 space-y-1">
              {instance.endpoints.map((endpoint) => <li key={endpoint} className="font-mono text-xs">{endpoint}</li>)}
            </ul>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-textMuted">SSH command</p>
            <p className="mt-1 font-mono text-xs">{instance.sshCommand}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-textMuted">Last events</p>
            <ul className="mt-1 space-y-1 text-xs">
              {instance.lastEvents.map((event) => <li key={event}>- {event}</li>)}
            </ul>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-textMuted">Billing summary</p>
            <ul className="mt-1 space-y-1 text-xs">
              <li>On-demand: {instance.billingSummary.onDemandHours}h</li>
              <li>Spot: {instance.billingSummary.spotHours}h</li>
              <li>Total: {formatUSD(instance.billingSummary.total, locale)}</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className="section-stack">
      <PageSectionHeader title={locale === "ru" ? "My Instances" : "My Instances"} description={locale === "ru" ? "Операционный список с быстрыми действиями и раскрытием деталей." : "Operational list with quick actions and expandable details."} />

      <Card title={locale === "ru" ? "Instances list" : "Instances list"} description={locale === "ru" ? "Start/Stop/Reboot/Terminate, Connect и Logs из одной строки." : "Start/Stop/Reboot/Terminate, Connect and Logs from a single row."}>
        <div className="mb-3 grid gap-3 md:grid-cols-[2fr_1fr]">
          <Input label="Search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="name, id, country..." />
          <Select
            label="Status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            options={[
              { value: "", label: "Any" },
              { value: "running", label: "running" },
              { value: "provisioning", label: "provisioning" },
              { value: "stopped", label: "stopped" },
              { value: "error", label: "error" },
              { value: "interrupted", label: "interrupted(spot)" },
              { value: "queued", label: "queued" }
            ]}
          />
        </div>

        {rows.length === 0 ? <EmptyState title={locale === "ru" ? "Нет инстансов" : "No instances"} description={locale === "ru" ? "Проверьте фильтры." : "Check filters."} /> : null}

        <div className="overflow-x-auto rounded-md border border-border">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-elevated text-textSecondary">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Country</th>
                <th className="px-3 py-2">GPU/VRAM</th>
                <th className="px-3 py-2">Price/hr</th>
                <th className="px-3 py-2">Uptime</th>
                <th className="px-3 py-2">Actions</th>
                <th className="px-3 py-2">Details</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const expanded = expandedId === row.id;
                return (
                  <>
                    <tr key={row.id} className="border-t border-border bg-surface hover:bg-elevated/40">
                      <td className="px-3 py-2">
                        <button type="button" className="focus-ring rounded text-left text-brand hover:text-brandSoft" onClick={() => setSelectedId(row.id)}>
                          {row.name}
                        </button>
                      </td>
                      <td className="px-3 py-2"><StatusBadge status={row.status} /></td>
                      <td className="px-3 py-2">{flagFromCountry(row.country)} {row.country}</td>
                      <td className="px-3 py-2">{row.gpuModel} / {row.vramGb} GB</td>
                      <td className="px-3 py-2">{formatUSD(row.pricePerHour, locale)}</td>
                      <td className="px-3 py-2">{row.uptime}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          <Button size="sm" variant="secondary" leftIcon={<Icon glyph={LuPlay} size={16} />}>Start</Button>
                          <Button size="sm" variant="secondary" leftIcon={<Icon glyph={LuPower} size={16} />}>Stop</Button>
                          <Button size="sm" variant="secondary" leftIcon={<Icon glyph={LuRefreshCw} size={16} />}>Reboot</Button>
                          <Button size="sm" variant="destructive" leftIcon={<Icon glyph={LuTrash2} size={16} />}>Terminate</Button>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" leftIcon={<Icon glyph={LuExternalLink} size={16} />}>Connect</Button>
                          <Button size="sm" variant="ghost" leftIcon={<Icon glyph={LuFileText} size={16} />}>Logs</Button>
                          <Button size="sm" variant="ghost" onClick={() => setExpandedId(expanded ? "" : row.id)} leftIcon={<Icon glyph={expanded ? LuChevronUp : LuChevronDown} size={16} />}>
                            Expand
                          </Button>
                        </div>
                      </td>
                    </tr>
                    {expanded ? (
                      <tr className="border-t border-border bg-canvas">
                        <td className="px-3 py-2" colSpan={8}>{renderDetail(row)}</td>
                      </tr>
                    ) : null}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title={locale === "ru" ? "Instance Details" : "Instance Details"} description={locale === "ru" ? "Overview, Logs, Metrics, Billing." : "Overview, Logs, Metrics, Billing."}>
        {!selected ? <EmptyState title="No instance selected" description="Select any instance from the table above." /> : null}
        {selected ? (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-md border border-border bg-canvas p-3">
                <p className="text-xs uppercase tracking-wide text-textMuted">ID</p>
                <p className="mt-1 font-mono text-xs">{selected.id}</p>
              </div>
              <div className="rounded-md border border-border bg-canvas p-3">
                <p className="text-xs uppercase tracking-wide text-textMuted">Created</p>
                <p className="mt-1 text-sm">{formatDateTime(selected.created_at, locale)}</p>
              </div>
              <div className="rounded-md border border-border bg-canvas p-3">
                <p className="text-xs uppercase tracking-wide text-textMuted">Cost to date</p>
                <p className="mt-1 text-sm">{formatUSD(selected.cost_to_date, locale)}</p>
              </div>
              <div className="rounded-md border border-border bg-canvas p-3">
                <p className="text-xs uppercase tracking-wide text-textMuted">SLA</p>
                <p className="mt-1 text-sm">{selected.slaAvailability}</p>
              </div>
            </div>

            <Tabs items={[...detailTabs]} value={detailTab} onChange={setDetailTab} instanceId="instance-details-tabs" ariaLabel="Instance detail tabs" />
            {detailTab === "overview" ? (
              <div role="tabpanel" id={getTabPanelElementID("instance-details-tabs", "overview")} aria-labelledby={getTabElementID("instance-details-tabs", "overview")} className="rounded-md border border-border bg-canvas p-3 text-sm text-textSecondary">
                <p>Name: <span className="text-textPrimary">{selected.name}</span></p>
                <p>Country: {flagFromCountry(selected.country)} {selected.country}</p>
                <p>GPU: {selected.gpuModel} / {selected.vramGb} GB</p>
                {selected.warnings.length ? <p className="mt-2 text-warning">Warnings: {selected.warnings.join(", ")}</p> : <p className="mt-2 text-success">No warnings</p>}
              </div>
            ) : null}
            {detailTab === "logs" ? (
              <div role="tabpanel" id={getTabPanelElementID("instance-details-tabs", "logs")} aria-labelledby={getTabElementID("instance-details-tabs", "logs")} className="rounded-md border border-border bg-canvas p-3">
                {selected.lastEvents.length ? (
                  <pre className="overflow-auto rounded-md bg-surface p-3 text-xs text-textSecondary">{selected.lastEvents.join("\n")}</pre>
                ) : (
                  <EmptyState title="No logs yet" description="Logs appear once workload starts." />
                )}
              </div>
            ) : null}
            {detailTab === "metrics" ? (
              <div role="tabpanel" id={getTabPanelElementID("instance-details-tabs", "metrics")} aria-labelledby={getTabElementID("instance-details-tabs", "metrics")} className="rounded-md border border-border bg-canvas p-3">
                {selected.status === "error" ? <EmptyState kind="error" title="Metrics unavailable" description="Auth required or instance failed to report metrics." /> : <p className="text-sm text-textSecondary">GPU util: 74% · CPU util: 43% · RAM util: 68%</p>}
              </div>
            ) : null}
            {detailTab === "billing" ? (
              <div role="tabpanel" id={getTabPanelElementID("instance-details-tabs", "billing")} aria-labelledby={getTabElementID("instance-details-tabs", "billing")} className="rounded-md border border-border bg-canvas p-3 text-sm text-textSecondary">
                <p>On-demand hours: {selected.billingSummary.onDemandHours}</p>
                <p>Spot hours: {selected.billingSummary.spotHours}</p>
                <p>Total: {formatUSD(selected.billingSummary.total, locale)}</p>
              </div>
            ) : null}
          </div>
        ) : null}
      </Card>
    </section>
  );
}

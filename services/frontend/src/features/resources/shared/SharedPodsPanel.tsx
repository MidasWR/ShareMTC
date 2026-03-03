import { useEffect, useState } from "react";
import { useToast } from "../../../design/components/Toast";
import { Table } from "../../../design/components/Table";
import { DataFreshnessBadge } from "../../../design/patterns/DataFreshnessBadge";
import { EmptyState } from "../../../design/patterns/EmptyState";
import { PageSectionHeader } from "../../../design/patterns/PageSectionHeader";
import { Button } from "../../../design/primitives/Button";
import { Card } from "../../../design/primitives/Card";
import { Input } from "../../../design/primitives/Input";
import { Select } from "../../../design/primitives/Select";
import { formatOperationMessage } from "../../../design/utils/operationFeedback";
import { listSharedOffers, listSharedPods, sharePod, upsertSharedOffer } from "../api/resourcesApi";
import { SharedInventoryOffer, SharedPod } from "../../../types/api";
import { useProviderOptions } from "../../providers/useProviderOptions";

export function SharedPodsPanel() {
  const [rows, setRows] = useState<SharedPod[]>([]);
  const [podCode, setPodCode] = useState("");
  const [targets, setTargets] = useState("");
  const [loading, setLoading] = useState(false);
  const [shareQty, setShareQty] = useState("1");
  const [priceHourlyUSD, setPriceHourlyUSD] = useState("0.59");
  const [cpuCores, setCpuCores] = useState("8");
  const [ramMb, setRamMb] = useState("16384");
  const [gpuUnits, setGpuUnits] = useState("1");
  const [networkMbps, setNetworkMbps] = useState("1000");
  const [offers, setOffers] = useState<SharedInventoryOffer[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const { push } = useToast();
  const providerState = useProviderOptions();

  async function refresh() {
    setLoading(true);
    try {
      const [podRows, offerRows] = await Promise.all([listSharedPods(), listSharedOffers({ status: "active" })]);
      setRows(podRows);
      setOffers(offerRows.filter((item) => item.resource_type === "pod"));
      setLastUpdatedAt(new Date());
    } catch (error) {
      push("error", error instanceof Error ? error.message : "Failed to load shared POD list", "Shared PODs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function createShare() {
    const nextErrors: Record<string, string> = {};
    const sharedWith = targets.split(",").map((item) => item.trim()).filter(Boolean);
    const qty = Math.max(1, Number(shareQty) || 1);
    const cpu = Number(cpuCores) || 0;
    const ram = Number(ramMb) || 0;
    const gpu = Number(gpuUnits) || 0;
    const network = Number(networkMbps) || 0;
    const price = Number(priceHourlyUSD) || 0;
    if (!podCode.trim()) nextErrors.podCode = "POD code is required";
    if (!providerState.providerID.trim()) nextErrors.providerID = "Provider is required";
    if (sharedWith.length === 0) nextErrors.targets = "Provide at least one target user";
    if (cpu <= 0) nextErrors.cpuCores = "CPU must be greater than 0";
    if (ram <= 0) nextErrors.ramMb = "RAM must be greater than 0";
    if (gpu < 0) nextErrors.gpuUnits = "GPU cannot be negative";
    if (network <= 0) nextErrors.networkMbps = "Network must be greater than 0";
    if (price < 0) nextErrors.price = "Price cannot be negative";
    setErrors(nextErrors);
    const firstError = Object.values(nextErrors)[0];
    if (firstError) {
      push("error", firstError, "Share POD");
      return;
    }
    setLoading(true);
    try {
      await sharePod({ pod_code: podCode.trim(), shared_with: sharedWith, access_level: "read" });
      await upsertSharedOffer({
        provider_id: providerState.providerID.trim(),
        resource_type: "pod",
        title: `Shared POD ${podCode.trim()}`,
        description: "Shared POD capacity published from owner",
        cpu_cores: cpu,
        ram_mb: ram,
        gpu_units: gpu,
        network_mbps: network,
        quantity: qty,
        available_qty: qty,
        price_hourly_usd: price,
        status: "active"
      });
      setPodCode("");
      setTargets("");
      setShareQty("1");
      setPriceHourlyUSD("0.59");
      await refresh();
      push(
        "success",
        formatOperationMessage({ action: "Share", entityType: "POD", entityName: podCode.trim(), result: "success" }),
        "Shared marketplace"
      );
    } catch (error) {
      push("error", error instanceof Error ? error.message : "Failed to share POD", "Shared marketplace");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="section-stack">
      <PageSectionHeader title="Shared PODs" description="Track and manage POD sharing across users/providers." />
      <Card title="Quick Share POD" description="Publish share access and explicit marketplace capacity parameters.">
        <div className="grid items-end gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Input label="POD Code" error={errors.podCode} value={podCode} onChange={(event) => setPodCode(event.target.value)} />
          <Select
            label="Provider"
            error={errors.providerID || providerState.error}
            value={providerState.providerID}
            onChange={(event) => providerState.setProviderID(event.target.value)}
            options={
              providerState.options.length > 0
                ? providerState.options
                : [{ value: "", label: providerState.loading ? "Loading providers..." : "No providers available" }]
            }
          />
          <Input label="Share with" error={errors.targets} value={targets} onChange={(event) => setTargets(event.target.value)} placeholder="user1,user2" />
          <Input type="number" min={1} step={1} label="Qty" value={shareQty} onChange={(event) => setShareQty(event.target.value)} />
          <Input type="number" min={1} step={1} label="CPU Cores" error={errors.cpuCores} value={cpuCores} onChange={(event) => setCpuCores(event.target.value)} />
          <Input type="number" min={1} step={512} label="RAM (MB)" error={errors.ramMb} value={ramMb} onChange={(event) => setRamMb(event.target.value)} />
          <Input type="number" min={0} step={1} label="GPU Units" error={errors.gpuUnits} value={gpuUnits} onChange={(event) => setGpuUnits(event.target.value)} />
          <Input type="number" min={1} step={100} label="Network (Mbps)" error={errors.networkMbps} value={networkMbps} onChange={(event) => setNetworkMbps(event.target.value)} />
          <Input type="number" min={0} step={0.01} label="Price $/hr" error={errors.price} value={priceHourlyUSD} onChange={(event) => setPriceHourlyUSD(event.target.value)} />
          <Button onClick={createShare} loading={loading}>Share</Button>
        </div>
      </Card>
      <Card title="Shared POD Marketplace Offers" description="Inventory available for regular users to rent.">
        <Table
          dense
          ariaLabel="Shared POD offers table"
          rowKey={(row) => row.id ?? `${row.provider_id}-${row.title}`}
          items={offers}
          emptyState={<EmptyState title="No POD offers" description="Create sharing entries with quantity to publish offers." />}
          columns={[
            { key: "title", header: "Title", render: (row) => row.title },
            { key: "provider", header: "Provider", render: (row) => row.provider_id },
            { key: "available", header: "Available", render: (row) => `${row.available_qty}/${row.quantity}` },
            { key: "price", header: "$/hr", render: (row) => row.price_hourly_usd.toFixed(2) }
          ]}
        />
      </Card>
      <Card
        title="Shared POD Entries"
        description="POD shares with owner and access level."
        actions={(
          <div className="flex items-center gap-2">
            <DataFreshnessBadge ts={lastUpdatedAt} label="Shared PODs" />
            <Button variant="secondary" onClick={refresh} loading={loading}>Refresh</Button>
          </div>
        )}
      >
        <div className="mt-3">
          <Table
            dense
            ariaLabel="Shared POD table"
            rowKey={(row) => row.id ?? `${row.pod_code}-${row.owner_user_id}`}
            items={rows}
            emptyState={<EmptyState title="No shared PODs yet" description="Share at least one POD to populate this list." />}
            columns={[
              { key: "pod", header: "POD Code", render: (row) => row.pod_code },
              { key: "owner", header: "Owner", render: (row) => row.owner_user_id || "-" },
              { key: "access", header: "Access", render: (row) => row.access_level },
              { key: "targets", header: "Shared With", render: (row) => row.shared_with.join(", ") }
            ]}
          />
        </div>
      </Card>
    </section>
  );
}

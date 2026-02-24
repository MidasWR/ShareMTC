import { useEffect, useState } from "react";
import { useToast } from "../../../design/components/Toast";
import { Table } from "../../../design/components/Table";
import { EmptyState } from "../../../design/patterns/EmptyState";
import { PageSectionHeader } from "../../../design/patterns/PageSectionHeader";
import { Button } from "../../../design/primitives/Button";
import { Card } from "../../../design/primitives/Card";
import { Input } from "../../../design/primitives/Input";
import { listSharedOffers, listSharedPods, sharePod, upsertSharedOffer } from "../api/resourcesApi";
import { SharedInventoryOffer, SharedPod } from "../../../types/api";

export function SharedPodsPanel() {
  const [rows, setRows] = useState<SharedPod[]>([]);
  const [podCode, setPodCode] = useState("");
  const [providerID, setProviderID] = useState("provider-default");
  const [targets, setTargets] = useState("");
  const [loading, setLoading] = useState(false);
  const [shareQty, setShareQty] = useState("1");
  const [priceHourlyUSD, setPriceHourlyUSD] = useState("0.59");
  const [cpuCores, setCpuCores] = useState("8");
  const [ramMb, setRamMb] = useState("16384");
  const [gpuUnits, setGpuUnits] = useState("1");
  const [networkMbps, setNetworkMbps] = useState("1000");
  const [offers, setOffers] = useState<SharedInventoryOffer[]>([]);
  const { push } = useToast();

  async function refresh() {
    setLoading(true);
    try {
      const [podRows, offerRows] = await Promise.all([listSharedPods(), listSharedOffers({ status: "active" })]);
      setRows(podRows);
      setOffers(offerRows.filter((item) => item.resource_type === "pod"));
    } catch (error) {
      push("error", error instanceof Error ? error.message : "Failed to load shared POD list");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function createShare() {
    const sharedWith = targets.split(",").map((item) => item.trim()).filter(Boolean);
    const qty = Math.max(1, Number(shareQty) || 1);
    const cpu = Number(cpuCores) || 0;
    const ram = Number(ramMb) || 0;
    const gpu = Number(gpuUnits) || 0;
    const network = Number(networkMbps) || 0;
    const price = Number(priceHourlyUSD) || 0;
    if (!podCode.trim() || !providerID.trim()) {
      push("error", "POD code and Provider ID are required");
      return;
    }
    if (sharedWith.length === 0) {
      push("error", "Provide at least one target user");
      return;
    }
    if (cpu <= 0 || ram <= 0 || gpu < 0 || network <= 0 || price < 0) {
      push("error", "CPU, RAM and Network must be greater than 0; GPU and price cannot be negative");
      return;
    }
    setLoading(true);
    try {
      await sharePod({ pod_code: podCode.trim(), shared_with: sharedWith, access_level: "read" });
      await upsertSharedOffer({
        provider_id: providerID.trim(),
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
      push("success", "POD shared and marketplace offer published");
    } catch (error) {
      push("error", error instanceof Error ? error.message : "Failed to share POD");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="section-stack">
      <PageSectionHeader title="Shared PODs" description="Track and manage POD sharing across users/providers." />
      <Card title="Quick Share POD" description="Publish share access and explicit marketplace capacity parameters.">
        <div className="grid items-end gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Input label="POD Code" value={podCode} onChange={(event) => setPodCode(event.target.value)} />
          <Input label="Provider ID" value={providerID} onChange={(event) => setProviderID(event.target.value)} />
          <Input label="Share with" value={targets} onChange={(event) => setTargets(event.target.value)} placeholder="user1,user2" />
          <Input type="number" min={1} step={1} label="Qty" value={shareQty} onChange={(event) => setShareQty(event.target.value)} />
          <Input type="number" min={1} step={1} label="CPU Cores" value={cpuCores} onChange={(event) => setCpuCores(event.target.value)} />
          <Input type="number" min={1} step={512} label="RAM (MB)" value={ramMb} onChange={(event) => setRamMb(event.target.value)} />
          <Input type="number" min={0} step={1} label="GPU Units" value={gpuUnits} onChange={(event) => setGpuUnits(event.target.value)} />
          <Input type="number" min={1} step={100} label="Network (Mbps)" value={networkMbps} onChange={(event) => setNetworkMbps(event.target.value)} />
          <Input type="number" min={0} step={0.01} label="Price $/hr" value={priceHourlyUSD} onChange={(event) => setPriceHourlyUSD(event.target.value)} />
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
        actions={<Button variant="secondary" onClick={refresh} loading={loading}>Refresh</Button>}
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

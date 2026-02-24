import { useEffect, useState } from "react";
import { useToast } from "../../../design/components/Toast";
import { Table } from "../../../design/components/Table";
import { EmptyState } from "../../../design/patterns/EmptyState";
import { PageSectionHeader } from "../../../design/patterns/PageSectionHeader";
import { Button } from "../../../design/primitives/Button";
import { Card } from "../../../design/primitives/Card";
import { Input } from "../../../design/primitives/Input";
import { listSharedOffers, listSharedVMs, shareVM, upsertSharedOffer } from "../api/resourcesApi";
import { SharedInventoryOffer, SharedVM } from "../../../types/api";

export function SharedVMPanel() {
  const [rows, setRows] = useState<SharedVM[]>([]);
  const [vmID, setVmID] = useState("");
  const [targets, setTargets] = useState("");
  const [loading, setLoading] = useState(false);
  const [shareQty, setShareQty] = useState("1");
  const [offers, setOffers] = useState<SharedInventoryOffer[]>([]);
  const { push } = useToast();

  async function refresh() {
    setLoading(true);
    try {
      const [vmRows, offerRows] = await Promise.all([listSharedVMs(), listSharedOffers({ status: "active" })]);
      setRows(vmRows);
      setOffers(offerRows.filter((item) => item.resource_type === "vm"));
    } catch (error) {
      push("error", error instanceof Error ? error.message : "Failed to load shared VM list");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function createShare() {
    const sharedWith = targets.split(",").map((item) => item.trim()).filter(Boolean);
    setLoading(true);
    try {
      const qty = Math.max(1, Number(shareQty) || 1);
      await shareVM({ vm_id: vmID, shared_with: sharedWith, access_level: "read" });
      await upsertSharedOffer({
        provider_id: "provider-default",
        resource_type: "vm",
        title: `Shared VM ${vmID}`,
        description: "Shared VM capacity published from owner",
        cpu_cores: 4,
        ram_mb: 8192,
        gpu_units: 1,
        network_mbps: 500,
        quantity: qty,
        available_qty: qty,
        price_hourly_usd: 0.79,
        status: "active"
      });
      setVmID("");
      setTargets("");
      setShareQty("1");
      await refresh();
      push("success", "VM shared");
    } catch (error) {
      push("error", error instanceof Error ? error.message : "Failed to share VM");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="section-stack">
      <PageSectionHeader title="Shared VM" description="Manage shared VM access and visibility." />
      <Card title="Quick Share VM" description="Compact sharing form for user access.">
        <div className="grid items-end gap-3 md:grid-cols-[1fr_1fr_120px_auto]">
          <Input label="VM ID" value={vmID} onChange={(event) => setVmID(event.target.value)} />
          <Input label="Share with" value={targets} onChange={(event) => setTargets(event.target.value)} placeholder="user1,user2" />
          <Input label="Qty" value={shareQty} onChange={(event) => setShareQty(event.target.value)} />
          <Button onClick={createShare} loading={loading}>Share</Button>
        </div>
      </Card>
      <Card title="Shared VM Marketplace Offers" description="Inventory available for regular users to rent.">
        <Table
          dense
          ariaLabel="Shared VM offers table"
          rowKey={(row) => row.id ?? `${row.provider_id}-${row.title}`}
          items={offers}
          emptyState={<EmptyState title="No VM offers" description="Create sharing entries with quantity to publish offers." />}
          columns={[
            { key: "title", header: "Title", render: (row) => row.title },
            { key: "provider", header: "Provider", render: (row) => row.provider_id },
            { key: "available", header: "Available", render: (row) => `${row.available_qty}/${row.quantity}` },
            { key: "price", header: "$/hr", render: (row) => row.price_hourly_usd.toFixed(2) }
          ]}
        />
      </Card>
      <Card
        title="Shared VM Entries"
        description="VMs you own or have access to."
        actions={<Button variant="secondary" onClick={refresh} loading={loading}>Refresh</Button>}
      >
        <div className="mt-3">
          <Table
            dense
            ariaLabel="Shared VM table"
            rowKey={(row) => row.id ?? `${row.vm_id}-${row.owner_user_id}`}
            items={rows}
            emptyState={<EmptyState title="No shared VMs yet" description="Share at least one VM to populate this list." />}
            columns={[
              { key: "vm", header: "VM ID", render: (row) => row.vm_id },
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

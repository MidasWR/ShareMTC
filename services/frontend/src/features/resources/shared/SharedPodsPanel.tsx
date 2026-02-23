import { useEffect, useState } from "react";
import { useToast } from "../../../design/components/Toast";
import { Table } from "../../../design/components/Table";
import { EmptyState } from "../../../design/patterns/EmptyState";
import { PageSectionHeader } from "../../../design/patterns/PageSectionHeader";
import { Button } from "../../../design/primitives/Button";
import { Card } from "../../../design/primitives/Card";
import { Input } from "../../../design/primitives/Input";
import { listSharedPods, sharePod } from "../api/resourcesApi";
import { SharedPod } from "../../../types/api";

export function SharedPodsPanel() {
  const [rows, setRows] = useState<SharedPod[]>([]);
  const [podCode, setPodCode] = useState("");
  const [targets, setTargets] = useState("");
  const [loading, setLoading] = useState(false);
  const { push } = useToast();

  async function refresh() {
    setLoading(true);
    try {
      setRows(await listSharedPods());
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
    setLoading(true);
    try {
      await sharePod({ pod_code: podCode, shared_with: sharedWith, access_level: "read" });
      setPodCode("");
      setTargets("");
      await refresh();
      push("success", "POD shared");
    } catch (error) {
      push("error", error instanceof Error ? error.message : "Failed to share POD");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="section-stack">
      <PageSectionHeader title="Shared PODs" description="Track and manage POD sharing across users/providers." />
      <Card title="Quick Share POD" description="Compact sharing form for POD access.">
        <div className="grid items-end gap-3 md:grid-cols-[1fr_1fr_auto]">
          <Input label="POD Code" value={podCode} onChange={(event) => setPodCode(event.target.value)} />
          <Input label="Share with" value={targets} onChange={(event) => setTargets(event.target.value)} placeholder="user1,user2" />
          <Button onClick={createShare} loading={loading}>Share</Button>
        </div>
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

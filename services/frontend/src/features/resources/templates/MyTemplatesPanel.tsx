import { FormEvent, useEffect, useState } from "react";
import { useToast } from "../../../design/components/Toast";
import { Table } from "../../../design/components/Table";
import { EmptyState } from "../../../design/patterns/EmptyState";
import { PageSectionHeader } from "../../../design/patterns/PageSectionHeader";
import { Button } from "../../../design/primitives/Button";
import { Card } from "../../../design/primitives/Card";
import { Input } from "../../../design/primitives/Input";
import { listVMTemplates, upsertVMTemplate } from "../api/resourcesApi";
import { VMTemplate } from "../../../types/api";

export function MyTemplatesPanel() {
  const [rows, setRows] = useState<VMTemplate[]>([]);
  const [name, setName] = useState("FastPanel");
  const [code, setCode] = useState("fastpanel");
  const [loading, setLoading] = useState(false);
  const { push } = useToast();

  async function refresh() {
    setLoading(true);
    try {
      setRows(await listVMTemplates());
    } catch (error) {
      push("error", error instanceof Error ? error.message : "Failed to load VM templates");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      await upsertVMTemplate({
        code,
        name,
        description: `${name} template`,
        os_name: "Ubuntu 22.04",
        cpu_cores: 4,
        ram_mb: 8192,
        gpu_units: 0,
        network_mbps: 1000
      });
      await refresh();
      push("success", "Template saved");
    } catch (error) {
      push("error", error instanceof Error ? error.message : "Failed to save template");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="section-stack">
      <PageSectionHeader title="My Templates" description="Create and manage server installation templates." />
      <Card title="Create Template" description="Templates used for VM/server bootstrap (FastPanel, aaPanel, etc).">
        <form className="grid gap-3 md:grid-cols-3" onSubmit={submit}>
          <Input label="Template Code" value={code} onChange={(event) => setCode(event.target.value)} />
          <Input label="Template Name" value={name} onChange={(event) => setName(event.target.value)} />
          <Button className="md:mt-7" loading={loading} type="submit">Save Template</Button>
        </form>
      </Card>
      <Card title="Template List" description="Saved templates available for VM creation.">
        <Button variant="secondary" onClick={refresh} loading={loading}>Refresh</Button>
        <div className="mt-3">
          <Table
            ariaLabel="VM templates table"
            rowKey={(row) => row.id ?? row.code}
            items={rows}
            emptyState={<EmptyState title="No templates yet" description="Create your first server template." />}
            columns={[
              { key: "code", header: "Code", render: (row) => row.code },
              { key: "name", header: "Name", render: (row) => row.name },
              { key: "os", header: "OS", render: (row) => row.os_name },
              { key: "shape", header: "Shape", render: (row) => `${row.cpu_cores} CPU / ${row.ram_mb} MB / ${row.gpu_units} GPU` }
            ]}
          />
        </div>
      </Card>
    </section>
  );
}

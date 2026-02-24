import { FormEvent, useEffect, useState } from "react";
import { useToast } from "../../../design/components/Toast";
import { Table } from "../../../design/components/Table";
import { EmptyState } from "../../../design/patterns/EmptyState";
import { PageSectionHeader } from "../../../design/patterns/PageSectionHeader";
import { Button } from "../../../design/primitives/Button";
import { Card } from "../../../design/primitives/Card";
import { Input } from "../../../design/primitives/Input";
import { Select } from "../../../design/primitives/Select";
import { Textarea } from "../../../design/primitives/Textarea";
import { listVMTemplates, upsertVMTemplate } from "../api/resourcesApi";
import { VMTemplate } from "../../../types/api";
import { validateTemplateInput } from "./templateValidation";

export function MyTemplatesPanel() {
  const [rows, setRows] = useState<VMTemplate[]>([]);
  const [name, setName] = useState("FastPanel");
  const [code, setCode] = useState("fastpanel");
  const [logoURL, setLogoURL] = useState("/logos/fastpanel.svg");
  const [osName, setOSName] = useState("Ubuntu 22.04");
  const [osFamily, setOSFamily] = useState<"linux" | "windows" | "bsd">("linux");
  const [envJSON, setEnvJSON] = useState("{\"APP_ENV\":\"production\"}");
  const [sshPublicKey, setSSHPublicKey] = useState("");
  const [bootstrapScript, setBootstrapScript] = useState("#!/usr/bin/env bash; set -e; apt update");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
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
    const validationError = validateTemplateInput({
      code,
      name,
      osName,
      envJSON,
      sshPublicKey,
      bootstrapScript
    });
    if (validationError) {
      setFormError(validationError);
      push("error", validationError);
      return;
    }
    setFormError("");
    setLoading(true);
    try {
      await upsertVMTemplate({
        code,
        name,
        description: `${name} template`,
        logo_url: logoURL,
        os_name: osName,
        os_family: osFamily,
        env_json: envJSON,
        ssh_public_key: sshPublicKey,
        bootstrap_script: bootstrapScript,
        owner_user_id: "self",
        is_public: false,
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
      <Card title="Template Builder" description="Create production-grade templates with ENV, SSH key, bootstrap code and logo.">
        <form className="grid items-end gap-3 md:grid-cols-2" onSubmit={submit}>
          <Input label="Template Code" value={code} onChange={(event) => setCode(event.target.value)} error={formError.includes("code") ? formError : ""} />
          <Input label="Template Name" value={name} onChange={(event) => setName(event.target.value)} error={formError.includes("name") ? formError : ""} />
          <Input label="Logo URL" value={logoURL} onChange={(event) => setLogoURL(event.target.value)} />
          <Input label="OS Name" value={osName} onChange={(event) => setOSName(event.target.value)} error={formError.includes("OS") ? formError : ""} />
          <Select
            label="OS Family"
            value={osFamily}
            onChange={(event) => setOSFamily(event.target.value as "linux" | "windows" | "bsd")}
            options={[
              { value: "linux", label: "Linux" },
              { value: "windows", label: "Windows" },
              { value: "bsd", label: "BSD" }
            ]}
          />
          <Textarea
            label="ENV JSON"
            value={envJSON}
            onChange={(event) => setEnvJSON(event.target.value)}
            error={formError.includes("JSON") ? formError : ""}
            helpText={'Valid JSON object, for example {"APP_ENV":"production"}'}
          />
          <Textarea
            label="SSH Public Key"
            value={sshPublicKey}
            onChange={(event) => setSSHPublicKey(event.target.value)}
            error={formError.includes("SSH") ? formError : ""}
            helpText="Optional, but if present must start with ssh-"
          />
          <Textarea
            label="Bootstrap Script"
            value={bootstrapScript}
            onChange={(event) => setBootstrapScript(event.target.value)}
            error={formError.includes("Bootstrap") ? formError : ""}
          />
          <Button loading={loading} type="submit">Save</Button>
        </form>
      </Card>
      <Card
        title="Template List"
        description="Saved templates available for VM creation."
        actions={<Button variant="secondary" onClick={refresh} loading={loading}>Refresh</Button>}
      >
        <div className="mt-3">
          <Table
            dense
            ariaLabel="VM templates table"
            rowKey={(row) => row.id ?? row.code}
            items={rows}
            emptyState={<EmptyState title="No templates yet" description="Create your first server template." />}
            columns={[
              { key: "code", header: "Code", render: (row) => row.code },
              { key: "name", header: "Name", render: (row) => row.name },
              { key: "os", header: "OS", render: (row) => row.os_name },
              { key: "logo", header: "Logo", render: (row) => row.logo_url || "-" },
              { key: "shape", header: "Shape", render: (row) => `${row.cpu_cores} CPU / ${row.ram_mb} MB / ${row.gpu_units} GPU` }
            ]}
          />
        </div>
      </Card>
    </section>
  );
}

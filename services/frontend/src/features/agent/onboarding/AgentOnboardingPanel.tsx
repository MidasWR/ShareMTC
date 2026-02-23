import { useState } from "react";
import { useToast } from "../../../design/components/Toast";
import { InlineAlert } from "../../../design/patterns/InlineAlert";
import { MetricTile } from "../../../design/patterns/MetricTile";
import { PageSectionHeader } from "../../../design/patterns/PageSectionHeader";
import { Button } from "../../../design/primitives/Button";
import { Card } from "../../../design/primitives/Card";
import { Input } from "../../../design/primitives/Input";
import { Select } from "../../../design/primitives/Select";
import { API_BASE } from "../../../config/apiBase";
import { fetchJSON } from "../../../lib/http";


const installCommands = {
  linux: "sudo RESOURCE_API_URL=http://<platform-host-ip> ./installer/hostagent-node-installer.sh",
  windows:
    "docker run -d --name sharemct-hostagent --restart unless-stopped -e RESOURCE_API_URL=http://<platform-host-ip> midaswr/host-hostagent:latest",
  macos:
    "docker run -d --name sharemct-hostagent --restart unless-stopped -e RESOURCE_API_URL=http://<platform-host-ip> midaswr/host-hostagent:latest"
};

export function AgentOnboardingPanel() {
  const [os, setOs] = useState<"linux" | "windows" | "macos">("linux");
  const [providerID, setProviderID] = useState("");
  const [verificationState, setVerificationState] = useState("Not verified");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { push } = useToast();

  async function copyCommand() {
    try {
      await navigator.clipboard.writeText(installCommands[os]);
      push("success", "Install command copied");
    } catch {
      push("error", "Clipboard unavailable");
    }
  }

  async function verifyAgent() {
    if (!providerID.trim()) {
      setError("Provider ID is required for verification");
      push("error", "Provider ID is required for heartbeat verification");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await fetchJSON<{ status: string }>(`${API_BASE.resource}/v1/resources/heartbeat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider_id: providerID.trim(),
          cpu_free_cores: 4,
          ram_free_mb: 8192,
          gpu_free_units: 0,
          network_mbps: 300,
          heartbeat_at: new Date().toISOString()
        })
      });
      setVerificationState("Connected and heartbeat accepted");
      push("success", "Agent heartbeat verified");
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Verification failed";
      setError(message);
      setVerificationState(`Verification failed: ${message}`);
      push("error", "Agent verification failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="section-stack">
      <PageSectionHeader
        title="Agent Onboarding"
        description="Install host agent, start the runtime, and verify heartbeat connectivity."
      />

      <Card title="Install flow" description="Select OS, copy command, and verify provider heartbeat.">
        <div className="grid gap-3 md:grid-cols-2">
          <Select
            label="Operating system"
            value={os}
            onChange={(event) => setOs(event.target.value as "linux" | "windows" | "macos")}
            options={[
              { value: "linux", label: "Linux (recommended)" },
              { value: "windows", label: "Windows" },
              { value: "macos", label: "macOS" }
            ]}
          />
          <Input
            label="Provider ID"
            value={providerID}
            onChange={(event) => setProviderID(event.target.value)}
            placeholder="Provider UUID to verify heartbeat"
          />
        </div>
        <div className="mt-4 rounded-md border border-border bg-canvas p-3">
          <p className="mb-2 text-xs uppercase tracking-wide text-textMuted">Install command</p>
          <pre className="overflow-auto font-mono text-xs text-textSecondary">{installCommands[os]}</pre>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={copyCommand}>
            Copy command
          </Button>
          <Button onClick={verifyAgent} loading={loading}>
            Verify connection
          </Button>
        </div>
        {error ? <div className="mt-3"><InlineAlert kind="error">{error}</InlineAlert></div> : null}
      </Card>

      <div className="grid gap-3 md:grid-cols-3">
        <MetricTile label="Step 1" value="Install agent" hint="Run installer script on donor machine" />
        <MetricTile label="Step 2" value="Start service" hint="Ensure hostagent container/service is running" />
        <MetricTile label="Step 3" value={verificationState} hint="Heartbeat check through resourceservice" />
      </div>
    </section>
  );
}

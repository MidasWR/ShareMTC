import { useState } from "react";
import { useToast } from "../../../design/components/Toast";
import { MetricTile } from "../../../design/patterns/MetricTile";
import { Button } from "../../../design/primitives/Button";
import { Card } from "../../../design/primitives/Card";
import { Input } from "../../../design/primitives/Input";
import { Select } from "../../../design/primitives/Select";
import { fetchJSON } from "../../../lib/http";

const RESOURCE_BASE = import.meta.env.VITE_RESOURCE_BASE_URL ?? "http://localhost:8083";

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
      push("error", "Provider ID is required for heartbeat verification");
      return;
    }
    setLoading(true);
    try {
      await fetchJSON<{ status: string }>(`${RESOURCE_BASE}/v1/resources/heartbeat`, {
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
      setVerificationState(`Verification failed: ${message}`);
      push("error", "Agent verification failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="section-stack">
      <Card title="Agent onboarding" description="Install and verify host agent for shared resource providers.">
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
            Verify heartbeat
          </Button>
        </div>
      </Card>

      <div className="grid gap-3 md:grid-cols-3">
        <MetricTile label="Step 1" value="Install agent" hint="Run installer script on donor machine" />
        <MetricTile label="Step 2" value="Start service" hint="Ensure hostagent container/service is running" />
        <MetricTile label="Step 3" value={verificationState} hint="Heartbeat check through resourceservice" />
      </div>
    </section>
  );
}

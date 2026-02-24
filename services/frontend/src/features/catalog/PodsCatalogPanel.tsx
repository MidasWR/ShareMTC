import { useEffect, useMemo, useState } from "react";
import { SiNvidia, SiUbuntu, SiPytorch, SiDocker } from "react-icons/si";
import { FaMemory, FaMicrochip, FaNetworkWired, FaCube } from "react-icons/fa6";
import { listPodCatalog, listPodTemplates } from "../admin/api/adminApi";
import { PodCatalogItem, PodTemplate } from "../../types/api";
import { Card } from "../../design/primitives/Card";
import { Input } from "../../design/primitives/Input";
import { Select } from "../../design/primitives/Select";
import { PageSectionHeader } from "../../design/patterns/PageSectionHeader";
import { Button } from "../../design/primitives/Button";
import { useToast } from "../../design/components/Toast";
import { Badge } from "../../design/primitives/Badge";
import { listVMTemplates } from "../resources/api/resourcesApi";

export function PodsCatalogPanel() {
  const [pods, setPods] = useState<PodCatalogItem[]>([]);
  const [templates, setTemplates] = useState<PodTemplate[]>([]);
  const [vmTemplates, setVmTemplates] = useState<Array<{
    id?: string;
    name: string;
    code: string;
    cloud_type?: "secure" | "community";
    region?: string;
    availability_tier?: "low" | "medium" | "high";
    vram_gb?: number;
    network_volume_supported?: boolean;
    global_networking_supported?: boolean;
    max_instances?: number;
    gpu_units: number;
    cpu_cores?: number;
    system_ram_gb?: number;
    vcpu?: number;
    network_mbps: number;
    os_name: string;
  }>>([]);
  const [search, setSearch] = useState("");
  const [computeType, setComputeType] = useState<"gpu" | "cpu">("gpu");
  const [cloudType, setCloudType] = useState<"" | "secure" | "community">("secure");
  const [networkVolume, setNetworkVolume] = useState<"" | "true" | "false">("");
  const [region, setRegion] = useState("");
  const [globalNetworking, setGlobalNetworking] = useState<"" | "true" | "false">("");
  const [availabilityTier, setAvailabilityTier] = useState<"" | "low" | "medium" | "high">("");
  const [sortBy, setSortBy] = useState<"" | "name" | "vram" | "availability">("vram");
  const [minVram, setMinVram] = useState(24);
  const [loading, setLoading] = useState(false);
  const { push } = useToast();

  async function loadCatalog() {
    setLoading(true);
    try {
      const [podRows, templateRows, vmRows] = await Promise.all([
        listPodCatalog(),
        listPodTemplates(),
        listVMTemplates({
          search,
          cloud_type: cloudType,
          region,
          availability_tier: availabilityTier,
          network_volume_supported: networkVolume,
          global_networking_supported: globalNetworking,
          min_vram_gb: minVram,
          sort_by: sortBy
        })
      ]);
      setPods(podRows);
      setTemplates(templateRows);
      setVmTemplates(vmRows as any);
    } catch (error) {
      push("error", error instanceof Error ? error.message : "Failed to load catalog");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCatalog();
  }, []);

  const filteredPods = useMemo(() => {
    const query = search.toLowerCase().trim();
    const rows = pods.filter((item) => {
      const queryMatch =
        query.length === 0 ||
        item.name.toLowerCase().includes(query) ||
        item.gpu_model.toLowerCase().includes(query) ||
        item.os_name.toLowerCase().includes(query);
      return queryMatch;
    });
    return [...rows].sort((a, b) => b.gpu_vram_gb - a.gpu_vram_gb);
  }, [pods, search]);

  const featuredTemplates = useMemo(
    () => vmTemplates.filter((item) => (item.availability_tier || "").toLowerCase() === "high").slice(0, 8),
    [vmTemplates]
  );
  const latestGeneration = useMemo(
    () => vmTemplates.filter((item) => !featuredTemplates.some((f) => f.code === item.code)),
    [vmTemplates, featuredTemplates]
  );

  const templateLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of templates) map.set(item.id, item.name);
    return map;
  }, [templates]);

  return (
    <section className="section-stack">
      <PageSectionHeader
        title="Select an Instance"
        description="RunPod-style catalog: filter by cloud/region/VRAM and pick capacity by availability."
      />
      <Card title="Instance Filters" description="GPU/CPU, cloud, networking, and region controls.">
        <div className="grid gap-2 md:grid-cols-6">
          <Select
            label="Compute"
            value={computeType}
            onChange={(event) => setComputeType(event.target.value as "gpu" | "cpu")}
            options={[
              { value: "gpu", label: "GPU" },
              { value: "cpu", label: "CPU" }
            ]}
          />
          <Select
            label="Cloud type"
            value={cloudType}
            onChange={(event) => setCloudType(event.target.value as "" | "secure" | "community")}
            options={[
              { value: "", label: "Any cloud" },
              { value: "secure", label: "Secure cloud" },
              { value: "community", label: "Community cloud" }
            ]}
          />
          <Select
            label="Network volume"
            value={networkVolume}
            onChange={(event) => setNetworkVolume(event.target.value as "" | "true" | "false")}
            options={[
              { value: "", label: "Any" },
              { value: "true", label: "Supported" },
              { value: "false", label: "Not required" }
            ]}
          />
          <Input label="Region" value={region} onChange={(event) => setRegion(event.target.value)} placeholder="Any Region" />
          <Select
            label="Global networking"
            value={globalNetworking}
            onChange={(event) => setGlobalNetworking(event.target.value as "" | "true" | "false")}
            options={[
              { value: "", label: "Any" },
              { value: "true", label: "Enabled" },
              { value: "false", label: "Disabled" }
            ]}
          />
          <Select
            label="Additional filters"
            value={availabilityTier}
            onChange={(event) => setAvailabilityTier(event.target.value as "" | "low" | "medium" | "high")}
            options={[
              { value: "", label: "Any availability" },
              { value: "high", label: "High" },
              { value: "medium", label: "Medium" },
              { value: "low", label: "Low" }
            ]}
          />
        </div>
        <div className="mt-3 rounded-md border border-border bg-canvas p-3">
          <div className="mb-2 text-xs uppercase tracking-wide text-textMuted">Filter GPUs by VRAM</div>
          <input
            type="range"
            min={8}
            max={160}
            step={8}
            value={minVram}
            onChange={(event) => setMinVram(Number(event.target.value))}
            className="w-full"
          />
          <div className="mt-2 flex items-center justify-between text-xs text-textSecondary">
            <span>Any</span>
            <span>{minVram} GB</span>
            <span>160 GB</span>
          </div>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-[2fr_auto_auto]">
          <Input label="Search for a GPU" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="RTX 4090, H200, L4..." />
          <Select
            label="Sort"
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as "" | "name" | "vram" | "availability")}
            options={[
              { value: "vram", label: "vRAM" },
              { value: "availability", label: "Availability" },
              { value: "name", label: "Name" }
            ]}
          />
          <Button className="md:mt-7" variant="secondary" onClick={loadCatalog} loading={loading}>
            Apply
          </Button>
        </div>
      </Card>

      <Card title="Featured GPUs" description="High availability options with best capacity windows.">
        <div className="grid gap-2 md:grid-cols-4">
          {featuredTemplates.map((item) => (
            <button
              key={item.code}
              type="button"
              className="h-32 rounded-none border border-border bg-surface p-3 text-left transition-colors hover:border-info/60 hover:bg-elevated/50"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="font-semibold">{item.name}</div>
                <Badge variant={(item.availability_tier || "low") === "high" ? "success" : (item.availability_tier || "low") === "medium" ? "warning" : "danger"}>
                  {item.availability_tier || "low"}
                </Badge>
              </div>
              <div className="mt-2 text-xs text-textSecondary">
                <div>{item.vram_gb || 0} GB VRAM</div>
                <div>{item.system_ram_gb || 0} GB RAM • {item.vcpu || item.cpu_cores} vCPU</div>
                <div>{item.max_instances || 1} max • {item.region || "any"} • {item.cloud_type || "secure"}</div>
              </div>
            </button>
          ))}
        </div>
      </Card>

      <Card title="NVIDIA latest generation" description="Full list matching current filters and search.">
        <div className="grid gap-2 md:grid-cols-4">
          {latestGeneration.map((item) => (
            <button
              key={item.code}
              type="button"
              className="h-32 rounded-none border border-border bg-surface p-3 text-left transition-colors hover:border-brand/60 hover:bg-elevated/40"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="font-medium">{item.name}</div>
                <span className="text-xs text-success">{item.network_mbps} Mbps</span>
              </div>
              <div className="mt-2 text-xs text-textSecondary">
                <div>{item.vram_gb || 0} GB VRAM</div>
                <div>{item.system_ram_gb || 0} GB RAM • {item.vcpu || item.cpu_cores} vCPU</div>
                <div>{item.network_volume_supported ? "Network volume" : "No network volume"} • {item.global_networking_supported ? "Global networking" : "Local networking"}</div>
              </div>
            </button>
          ))}
        </div>
      </Card>

      <Card title="POD Catalog" description="Template support and fallback catalog entries from admin service.">
        <div className="grid gap-3 lg:grid-cols-2">
          {filteredPods.map((item) => {
            const hasGPU = item.gpu_model && item.gpu_model !== "None";
            return (
              <Card key={item.id} title={item.name} description={item.description}>
                {item.logo_url ? (
                  <div className="mb-2">
                    <img src={item.logo_url} alt={`${item.name} logo`} className="h-8 w-8 rounded-sm object-contain" />
                  </div>
                ) : null}
                <div className="grid gap-2 text-sm text-textSecondary">
                  <div className="flex items-center gap-2">
                    {hasGPU ? <SiNvidia className="text-success" /> : <FaMicrochip className="text-info" />}
                    {hasGPU ? `${item.gpu_model} (${item.gpu_vram_gb} GB VRAM)` : "No GPU (CPU only)"}
                  </div>
                  <div className="flex items-center gap-2"><FaMicrochip /> CPU: {item.cpu_cores} cores</div>
                  <div className="flex items-center gap-2"><FaMemory /> RAM: {item.ram_gb} GB</div>
                  <div className="flex items-center gap-2"><FaNetworkWired /> Network: {item.network_mbps} Mbps</div>
                  <div className="flex items-center gap-2"><SiUbuntu /> OS: {item.os_name}</div>
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border">
                    <span className="text-xs text-textMuted mr-1">Supported:</span>
                    {item.template_ids?.map((templateID) => (
                      <Badge key={templateID} variant="neutral" className="mr-1">{templateLabelMap.get(templateID) || templateID}</Badge>
                    ))}
                    {item.template_ids?.includes("tmpl-1") && <SiPytorch title="PyTorch" className="text-orange-500 text-lg" />}
                    {item.template_ids?.includes("tmpl-4") && <SiDocker title="Docker" className="text-blue-500 text-lg" />}
                    {item.template_ids?.includes("tmpl-5") && <FaCube title="Kubernetes" className="text-blue-400 text-lg" />}
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between rounded-md border border-border bg-elevated px-3 py-2">
                  <div className="text-xs text-textMuted">Price</div>
                  <div className="text-right text-sm">
                    <div>${item.hourly_price_usd.toFixed(2)}/hr</div>
                    <div className="text-textSecondary">${item.monthly_price_usd.toFixed(2)}/mo</div>
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <Button>Rent this Pod</Button>
                </div>
              </Card>
            );
          })}
        </div>
      </Card>
    </section>
  );
}

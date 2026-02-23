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

export function PodsCatalogPanel() {
  const [pods, setPods] = useState<PodCatalogItem[]>([]);
  const [templates, setTemplates] = useState<PodTemplate[]>([]);
  const [search, setSearch] = useState("");
  const [templateFilter, setTemplateFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"price_hour" | "price_month" | "vram">("price_hour");
  const [loading, setLoading] = useState(false);
  const { push } = useToast();

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [podRows, templateRows] = await Promise.all([listPodCatalog(), listPodTemplates()]);
        setPods(podRows);
        setTemplates(templateRows);
      } catch (error) {
        push("error", error instanceof Error ? error.message : "Failed to load catalog");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    const query = search.toLowerCase().trim();
    const rows = pods.filter((item) => {
      const templateMatch = templateFilter === "all" || item.template_ids?.includes(templateFilter);
      const queryMatch =
        query.length === 0 ||
        item.name.toLowerCase().includes(query) ||
        item.gpu_model.toLowerCase().includes(query) ||
        item.os_name.toLowerCase().includes(query);
      return templateMatch && queryMatch;
    });
    return [...rows].sort((a, b) => {
      if (sortBy === "price_month") return a.monthly_price_usd - b.monthly_price_usd;
      if (sortBy === "vram") return b.gpu_vram_gb - a.gpu_vram_gb;
      return a.hourly_price_usd - b.hourly_price_usd;
    });
  }, [pods, search, templateFilter, sortBy]);

  return (
    <section className="section-stack">
      <PageSectionHeader
        title="GPU & CPU Pods Catalog"
        description="Select computing resources and runtime templates (PyTorch, vLLM, Docker)."
      />
      <Card title="Catalog Filters" description="Find the right instance for inference or training.">
        <div className="grid gap-3 md:grid-cols-3">
          <Input label="Search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="GPU, OS, pod name" />
          <Select
            label="Template"
            value={templateFilter}
            onChange={(event) => setTemplateFilter(event.target.value)}
            options={[
              { value: "all", label: "All templates" },
              ...templates.map((item) => ({ value: item.id, label: item.name }))
            ]}
          />
          <Select
            label="Sort by"
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as "price_hour" | "price_month" | "vram")}
            options={[
              { value: "price_hour", label: "Price/hour (asc)" },
              { value: "price_month", label: "Price/month (asc)" },
              { value: "vram", label: "VRAM (desc)" }
            ]}
          />
          <Button className="md:mt-7" variant="secondary" onClick={() => window.location.reload()} loading={loading}>
            Reload
          </Button>
        </div>
      </Card>

      <div className="grid gap-3 lg:grid-cols-2">
        {filtered.map((item) => {
          const hasGPU = item.gpu_model && item.gpu_model !== "None";
          return (
            <Card key={item.id} title={item.name} description={item.description}>
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
    </section>
  );
}

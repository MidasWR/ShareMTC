import { useEffect, useMemo, useState } from "react";
import { SiNvidia, SiUbuntu } from "react-icons/si";
import { FaMemory, FaMicrochip, FaNetworkWired } from "react-icons/fa6";
import { listPodCatalog, listPodTemplates } from "../admin/api/adminApi";
import { PodCatalogItem, PodTemplate } from "../../types/api";
import { Card } from "../../design/primitives/Card";
import { Input } from "../../design/primitives/Input";
import { Select } from "../../design/primitives/Select";
import { PageSectionHeader } from "../../design/patterns/PageSectionHeader";
import { Button } from "../../design/primitives/Button";
import { useToast } from "../../design/components/Toast";

const mockTemplates: PodTemplate[] = [
  { id: "tmpl-1", name: "PyTorch 2.0 (CUDA 11.8)", description: "Standard image for ML training", gpu_class: "all", code: "pytorch-2.0" },
  { id: "tmpl-2", name: "Stable Diffusion WebUI", description: "Pre-installed SD WebUI", gpu_class: "high-end", code: "sd-webui" },
  { id: "tmpl-3", name: "vLLM / LLM Inference", description: "Optimized for large language models", gpu_class: "high-end", code: "vllm" }
];

const mockPods: PodCatalogItem[] = [
  {
    id: "pod-1",
    code: "rtx-4090",
    name: "RTX 4090 Workstation",
    description: "High-performance GPU for rendering and ML training.",
    gpu_model: "RTX 4090",
    gpu_vram_gb: 24,
    cpu_cores: 16,
    ram_gb: 64,
    network_mbps: 1000,
    hourly_price_usd: 0.45,
    monthly_price_usd: 280,
    os_name: "Ubuntu 22.04",
    template_ids: ["tmpl-1", "tmpl-2", "tmpl-3"]
  },
  {
    id: "pod-2",
    code: "a100-80gb",
    name: "NVIDIA A100 Server",
    description: "Enterprise grade GPU for massive LLM inference.",
    gpu_model: "A100",
    gpu_vram_gb: 80,
    cpu_cores: 32,
    ram_gb: 128,
    network_mbps: 2000,
    hourly_price_usd: 1.5,
    monthly_price_usd: 800,
    os_name: "Ubuntu 22.04",
    template_ids: ["tmpl-1", "tmpl-3"]
  },
  {
    id: "pod-3",
    code: "rtx-3090",
    name: "RTX 3090 Standard",
    description: "Balanced choice for standard deep learning tasks.",
    gpu_model: "RTX 3090",
    gpu_vram_gb: 24,
    cpu_cores: 12,
    ram_gb: 48,
    network_mbps: 1000,
    hourly_price_usd: 0.35,
    monthly_price_usd: 210,
    os_name: "Ubuntu 20.04",
    template_ids: ["tmpl-1", "tmpl-2"]
  },
  {
    id: "pod-4",
    code: "h100-80gb",
    name: "NVIDIA H100 Hopper",
    description: "State of the art hardware for ultimate performance.",
    gpu_model: "H100",
    gpu_vram_gb: 80,
    cpu_cores: 64,
    ram_gb: 256,
    network_mbps: 10000,
    hourly_price_usd: 3.5,
    monthly_price_usd: 2100,
    os_name: "Ubuntu 22.04",
    template_ids: ["tmpl-1", "tmpl-3"]
  }
];

export function PodsCatalogPanel() {
  const [pods, setPods] = useState<PodCatalogItem[]>([]);
  const [templates, setTemplates] = useState<PodTemplate[]>([]);
  const [search, setSearch] = useState("");
  const [templateFilter, setTemplateFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"price_hour" | "price_month" | "vram">("price_hour");
  const { push } = useToast();

  useEffect(() => {
    async function load() {
      try {
        const [podRows, templateRows] = await Promise.all([
          listPodCatalog().catch(() => mockPods),
          listPodTemplates().catch(() => mockTemplates)
        ]);
        setPods(podRows);
        setTemplates(templateRows);
      } catch (error) {
        push("error", error instanceof Error ? error.message : "Не удалось загрузить каталог");
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
        title="Каталог GPU Pods"
        description="Выбор конкретных GPU pods (30+ позиций) и готовых шаблонов запуска."
      />
      <Card title="Фильтры каталога" description="Подберите Pod под вашу задачу инференса или обучения.">
        <div className="grid gap-3 md:grid-cols-3">
          <Input label="Поиск" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="GPU, ОС, название pod" />
          <Select
            label="Шаблон"
            value={templateFilter}
            onChange={(event) => setTemplateFilter(event.target.value)}
            options={[
              { value: "all", label: "Все шаблоны" },
              ...templates.map((item) => ({ value: item.id, label: item.name }))
            ]}
          />
          <Select
            label="Сортировка"
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as "price_hour" | "price_month" | "vram")}
            options={[
              { value: "price_hour", label: "Цена/час (по возрастанию)" },
              { value: "price_month", label: "Цена/месяц (по возрастанию)" },
              { value: "vram", label: "VRAM (по убыванию)" }
            ]}
          />
        </div>
      </Card>

      <div className="grid gap-3 lg:grid-cols-2">
        {filtered.map((item) => (
          <Card key={item.id} title={item.name} description={item.description}>
            <div className="grid gap-2 text-sm text-textSecondary">
              <div className="flex items-center gap-2"><SiNvidia className="text-success" /> {item.gpu_model} ({item.gpu_vram_gb} GB VRAM)</div>
              <div className="flex items-center gap-2"><FaMicrochip /> CPU: {item.cpu_cores}</div>
              <div className="flex items-center gap-2"><FaMemory /> RAM: {item.ram_gb} GB</div>
              <div className="flex items-center gap-2"><FaNetworkWired /> Сеть: {item.network_mbps} Mbps</div>
              <div className="flex items-center gap-2"><SiUbuntu /> ОС: {item.os_name}</div>
            </div>
            <div className="mt-3 flex items-center justify-between rounded-md border border-border bg-elevated px-3 py-2">
              <div className="text-xs text-textMuted">Цена</div>
              <div className="text-right text-sm">
                <div>${item.hourly_price_usd.toFixed(2)}/час</div>
                <div className="text-textSecondary">${item.monthly_price_usd.toFixed(2)}/месяц</div>
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <Button>Арендовать этот Pod</Button>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}

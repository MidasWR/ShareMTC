import { useMemo, useState } from "react";
import { LuArrowRight, LuCircleCheckBig, LuFilter, LuGlobe, LuHardDrive, LuKeyRound, LuMapPin, LuNetwork, LuServer, LuTriangleAlert } from "react-icons/lu";
import { EmptyState } from "../../design/patterns/EmptyState";
import { PageSectionHeader } from "../../design/patterns/PageSectionHeader";
import { StatusBadge } from "../../design/patterns/StatusBadge";
import { Button } from "../../design/primitives/Button";
import { Card } from "../../design/primitives/Card";
import { Icon } from "../../design/primitives/Icon";
import { Input } from "../../design/primitives/Input";
import { MultiSelect } from "../../design/primitives/MultiSelect";
import { Select } from "../../design/primitives/Select";
import { useSettings } from "../../app/providers/SettingsProvider";
import { countryOptions, deployCatalog } from "../hifi/mockData";
import { flagFromCountry, formatUSD } from "../hifi/formatters";

const steps = [
  "Template",
  "Location",
  "Resources",
  "Storage/Networking",
  "Access",
  "Pricing model",
  "Review & Deploy"
] as const;

type PricingModel = "on-demand" | "spot" | "savings";

export function MarketplacePanel() {
  const { settings } = useSettings();
  const locale = settings.language === "ru" ? "ru" : "en";
  const [computeType, setComputeType] = useState<"ALL" | "GPU" | "CPU">("GPU");
  const [countries, setCountries] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [minVram, setMinVram] = useState(12);
  const [maxPrice, setMaxPrice] = useState(4.5);
  const [availability, setAvailability] = useState<"" | "high" | "medium" | "low">("");
  const [networkFeature, setNetworkFeature] = useState("");
  const [selectedId, setSelectedId] = useState<string>(deployCatalog[0]?.id || "");
  const [activeStep, setActiveStep] = useState<number>(1);
  const [instanceName, setInstanceName] = useState("mts-instance-01");
  const [gpuCount, setGpuCount] = useState(1);
  const [cpuCores, setCpuCores] = useState(8);
  const [ramGb, setRamGb] = useState(24);
  const [storageGb, setStorageGb] = useState(120);
  const [network, setNetwork] = useState("Public IPv4");
  const [sshKey, setSshKey] = useState("default-ed25519");
  const [pricingModel, setPricingModel] = useState<PricingModel>("on-demand");
  const [deploySubmitted, setDeploySubmitted] = useState(false);

  const filteredCatalog = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return deployCatalog.filter((item) => {
      const typeMatch = computeType === "ALL" || item.computeType === computeType;
      const countryMatch = countries.length === 0 || countries.includes(item.country);
      const vramMatch = item.vramGb >= minVram;
      const priceMatch = item.pricePerHour <= maxPrice;
      const availabilityMatch = !availability || item.availability === availability;
      const networkMatch = !networkFeature || item.networkFeatures.includes(networkFeature);
      const searchMatch =
        !normalizedSearch ||
        item.gpuModel.toLowerCase().includes(normalizedSearch) ||
        item.region.toLowerCase().includes(normalizedSearch) ||
        item.country.toLowerCase().includes(normalizedSearch);
      return typeMatch && countryMatch && vramMatch && priceMatch && availabilityMatch && networkMatch && searchMatch;
    });
  }, [availability, computeType, countries, maxPrice, minVram, networkFeature, search]);

  const selected = useMemo(() => filteredCatalog.find((item) => item.id === selectedId) || filteredCatalog[0] || null, [filteredCatalog, selectedId]);

  const estimatedCost = useMemo(() => {
    if (!selected) return 0;
    const multiplier = pricingModel === "spot" ? 0.72 : pricingModel === "savings" ? 0.84 : 1;
    return Number((selected.pricePerHour * Math.max(1, gpuCount) * multiplier).toFixed(2));
  }, [gpuCount, pricingModel, selected]);

  const risks = useMemo(() => {
    const values: string[] = [];
    if (!selected) return values;
    if (selected.availability === "low") values.push("Insufficient capacity in selected region");
    if (pricingModel === "spot") values.push("Interrupted(spot) risk for long trainings");
    if (!sshKey) values.push("SSH key missing");
    return values;
  }, [pricingModel, selected, sshKey]);

  return (
    <section className="section-stack">
      <PageSectionHeader
        title={locale === "ru" ? "Marketplace / Deploy" : "Marketplace / Deploy"}
        description={locale === "ru" ? "Каталог, фильтры и пошаговый wizard деплоя на одном экране." : "Catalog, filters and step-by-step deploy wizard on a single screen."}
      />
      <Card title={locale === "ru" ? "Фильтры" : "Filters"} description={locale === "ru" ? "Compute type, регион, VRAM, цена, availability и сеть." : "Compute type, region, VRAM, price, availability and network."}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <Select
            label="Compute type"
            value={computeType}
            onChange={(event) => setComputeType(event.target.value as "ALL" | "GPU" | "CPU")}
            options={[
              { value: "ALL", label: "All" },
              { value: "GPU", label: "GPU" },
              { value: "CPU", label: "CPU" }
            ]}
          />
          <MultiSelect label="Country / Region" value={countries} onChange={setCountries} options={countryOptions.map((item) => ({ value: item.value, label: `${flagFromCountry(item.value)} ${item.label}`, meta: item.value }))} />
          <Input label="Search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="GPU, region, country..." leftIcon={<Icon glyph={LuFilter} size={16} />} />
          <div className="space-y-1.5">
            <span className="text-sm font-medium text-textSecondary">VRAM slider: {minVram} GB</span>
            <input className="focus-ring h-10 w-full accent-brand" type="range" min={0} max={160} step={4} value={minVram} onChange={(event) => setMinVram(Number(event.target.value))} />
          </div>
          <div className="space-y-1.5">
            <span className="text-sm font-medium text-textSecondary">Price range: {formatUSD(maxPrice, locale)}</span>
            <input className="focus-ring h-10 w-full accent-brand" type="range" min={0.18} max={4.5} step={0.05} value={maxPrice} onChange={(event) => setMaxPrice(Number(event.target.value))} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <Select
              label="Availability"
              value={availability}
              onChange={(event) => setAvailability(event.target.value as "" | "high" | "medium" | "low")}
              options={[
                { value: "", label: "Any" },
                { value: "high", label: "High" },
                { value: "medium", label: "Medium" },
                { value: "low", label: "Low" }
              ]}
            />
            <Select
              label="Network"
              value={networkFeature}
              onChange={(event) => setNetworkFeature(event.target.value)}
              options={[
                { value: "", label: "Any" },
                { value: "IPv4", label: "IPv4" },
                { value: "IPv6", label: "IPv6" },
                { value: "SSH", label: "SSH" },
                { value: "Private VPC", label: "Private VPC" }
              ]}
            />
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,1fr)]">
        <Card title={locale === "ru" ? "Каталог" : "Catalog"} description={locale === "ru" ? "Карточки с ценой/час, страной, VRAM и availability." : "Tiles with price/hour, country, VRAM and availability."}>
          <div className="grid gap-3 sm:grid-cols-2">
            {filteredCatalog.map((item) => {
              const isSelected = selected?.id === item.id;
              return (
                <article key={item.id} className={`rounded-lg border p-3 ${isSelected ? "border-brand bg-brand/10" : "border-border bg-surface"}`}>
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-textPrimary">{item.gpuModel}</h3>
                      <p className="text-xs text-textMuted">{item.vcpu} vCPU · {item.ramGb} GB RAM · {item.vramGb} GB VRAM</p>
                    </div>
                    <StatusBadge status={item.availability === "high" ? "running" : item.availability === "medium" ? "queued" : "interrupted"} />
                  </div>
                  <div className="space-y-1 text-xs text-textSecondary">
                    <p className="flex items-center gap-1.5"><Icon glyph={LuMapPin} size={16} /> {flagFromCountry(item.country)} {item.country} · {item.region}</p>
                    <p className="flex items-center gap-1.5"><Icon glyph={LuNetwork} size={16} /> {item.networkFeatures.join(", ")}</p>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-sm font-semibold text-textPrimary">{formatUSD(item.pricePerHour, locale)}/hr</span>
                    <Button variant={isSelected ? "primary" : "secondary"} onClick={() => setSelectedId(item.id)}>Select</Button>
                  </div>
                </article>
              );
            })}
          </div>
          {filteredCatalog.length === 0 ? (
            <div className="mt-3">
              <EmptyState title={locale === "ru" ? "Ничего не найдено" : "No results"} description={locale === "ru" ? "Измените фильтры и попробуйте снова." : "Adjust filters and try again."} />
            </div>
          ) : null}
        </Card>

        <Card title={locale === "ru" ? "Deploy wizard" : "Deploy wizard"} description={locale === "ru" ? "Пошаговый деплой в side panel стиле." : "Step-by-step deployment in side panel style."}>
          <ol className="mb-4 grid gap-2 rounded-md border border-border bg-canvas p-2">
            {steps.map((step, index) => {
              const current = index + 1 === activeStep;
              const done = index + 1 < activeStep;
              return (
                <li key={step}>
                  <button type="button" className={`focus-ring flex min-h-9 w-full items-center justify-between rounded-md px-2 py-1.5 text-left ${current ? "bg-brand/20 text-textPrimary" : "text-textSecondary hover:bg-elevated"}`} onClick={() => setActiveStep(index + 1)}>
                    <span>{index + 1}. {step}</span>
                    {done ? <Icon glyph={LuCircleCheckBig} size={16} className="text-success" /> : <Icon glyph={LuArrowRight} size={16} />}
                  </button>
                </li>
              );
            })}
          </ol>

          <div className="space-y-3">
            <Input label="1) Template / Pod Name" value={instanceName} onChange={(event) => setInstanceName(event.target.value)} />
            <Input label="2) Location (country / region / datacenter)" value={selected ? `${selected.country}/${selected.region}/${selected.datacenter}` : ""} readOnly />
            <div className="grid gap-3 sm:grid-cols-3">
              <Input type="number" min={1} label="3) GPU count" value={String(gpuCount)} onChange={(event) => setGpuCount(Number(event.target.value) || 1)} />
              <Input type="number" min={2} label="3) CPU" value={String(cpuCores)} onChange={(event) => setCpuCores(Number(event.target.value) || 2)} />
              <Input type="number" min={4} label="3) RAM (GB)" value={String(ramGb)} onChange={(event) => setRamGb(Number(event.target.value) || 4)} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input type="number" min={20} label="4) Storage (GB)" value={String(storageGb)} onChange={(event) => setStorageGb(Number(event.target.value) || 20)} leftIcon={<Icon glyph={LuHardDrive} size={16} />} />
              <Select label="4) Networking" value={network} onChange={(event) => setNetwork(event.target.value)} options={[{ value: "Public IPv4", label: "Public IPv4" }, { value: "Private VPC", label: "Private VPC" }, { value: "Dual Stack IPv4/IPv6", label: "Dual Stack IPv4/IPv6" }]} />
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <Select label="5) Access / SSH key" value={sshKey} onChange={(event) => setSshKey(event.target.value)} options={[{ value: "default-ed25519", label: "default-ed25519" }, { value: "ml-team-rsa", label: "ml-team-rsa" }, { value: "", label: "No key selected" }]} />
              <div className="sm:mt-7">
                <Button variant="secondary" leftIcon={<Icon glyph={LuKeyRound} size={16} />}>Add SSH key</Button>
              </div>
            </div>
            <Select
              label="6) Pricing model"
              value={pricingModel}
              onChange={(event) => setPricingModel(event.target.value as PricingModel)}
              options={[
                { value: "on-demand", label: "On-demand" },
                { value: "spot", label: "Spot" },
                { value: "savings", label: "Savings plan" }
              ]}
            />
            <div className="rounded-md border border-border bg-elevated/40 p-3 text-sm">
              <h4 className="mb-2 flex items-center gap-2 font-semibold text-textPrimary"><Icon glyph={LuServer} size={16} /> 7) Review</h4>
              <div className="space-y-1 text-textSecondary">
                <p><span className="text-textMuted">Name:</span> <span className="text-textPrimary">{instanceName}</span></p>
                <p><span className="text-textMuted">Location:</span> {selected ? `${flagFromCountry(selected.country)} ${selected.country} / ${selected.region}` : "-"}</p>
                <p><span className="text-textMuted">Cost/hour:</span> <span className="text-textPrimary">{formatUSD(estimatedCost, locale)}</span></p>
                <p><span className="text-textMuted">SLA / availability:</span> {selected?.availability || "-"}</p>
                <p><span className="text-textMuted">Pricing:</span> {pricingModel}</p>
              </div>
              {risks.length ? (
                <div className="mt-3 rounded-md border border-warning/50 bg-warning/10 p-2">
                  <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-warning"><Icon glyph={LuTriangleAlert} size={16} /> Risks</p>
                  <ul className="space-y-1 text-xs text-textSecondary">
                    {risks.map((risk) => <li key={risk}>- {risk}</li>)}
                  </ul>
                </div>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setDeploySubmitted(true)} leftIcon={<Icon glyph={LuGlobe} size={16} />}>
                {locale === "ru" ? "Review & Deploy" : "Review & Deploy"}
              </Button>
              <Button variant="ghost" onClick={() => setActiveStep((prev) => Math.min(7, prev + 1))}>Next step</Button>
            </div>
            {deploySubmitted ? (
              <p className="rounded-md border border-success/40 bg-success/10 p-2 text-sm text-textSecondary">
                {locale === "ru" ? "Запуск деплоя принят. Проверьте My Instances для статуса provisioning/queued." : "Deployment request accepted. Check My Instances for provisioning/queued status."}
              </p>
            ) : null}
          </div>
        </Card>
      </div>
    </section>
  );
}

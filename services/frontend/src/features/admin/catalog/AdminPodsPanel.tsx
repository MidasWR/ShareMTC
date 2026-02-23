import { FormEvent, useEffect, useState } from "react";
import { deletePodCatalog, listPodCatalog, listPodTemplates, upsertPodCatalog, upsertPodTemplate } from "../api/adminApi";
import { PodCatalogItem, PodTemplate } from "../../../types/api";
import { Card } from "../../../design/primitives/Card";
import { Input } from "../../../design/primitives/Input";
import { Button } from "../../../design/primitives/Button";
import { Table } from "../../../design/components/Table";
import { EmptyState } from "../../../design/patterns/EmptyState";
import { useToast } from "../../../design/components/Toast";

export function AdminPodsPanel() {
  const [pods, setPods] = useState<PodCatalogItem[]>([]);
  const [templates, setTemplates] = useState<PodTemplate[]>([]);
  const [podName, setPodName] = useState("");
  const [templateName, setTemplateName] = useState("");
  const { push } = useToast();

  async function refresh() {
    try {
      const [podRows, templateRows] = await Promise.all([listPodCatalog(), listPodTemplates()]);
      setPods(podRows);
      setTemplates(templateRows);
    } catch (error) {
      push("error", error instanceof Error ? error.message : "Ошибка загрузки каталога");
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function createTemplate(event: FormEvent) {
    event.preventDefault();
    if (!templateName.trim()) return;
    try {
      await upsertPodTemplate({
        id: "",
        code: `tmpl-${Date.now()}`,
        name: templateName.trim(),
        description: "Шаблон GPU workload",
        gpu_class: "custom"
      });
      setTemplateName("");
      await refresh();
      push("success", "Шаблон добавлен");
    } catch (error) {
      push("error", error instanceof Error ? error.message : "Ошибка добавления шаблона");
    }
  }

  async function createPod(event: FormEvent) {
    event.preventDefault();
    if (!podName.trim()) return;
    try {
      await upsertPodCatalog({
        id: "",
        code: `pod-${Date.now()}`,
        name: podName.trim(),
        description: "Пользовательский GPU pod",
        gpu_model: "NVIDIA RTX 4090",
        gpu_vram_gb: 24,
        cpu_cores: 16,
        ram_gb: 64,
        network_mbps: 1000,
        hourly_price_usd: 1.5,
        monthly_price_usd: 820,
        os_name: "Ubuntu 22.04",
        template_ids: templates.map((item) => item.id)
      });
      setPodName("");
      await refresh();
      push("success", "Pod добавлен в каталог");
    } catch (error) {
      push("error", error instanceof Error ? error.message : "Ошибка добавления pod");
    }
  }

  async function removePod(id: string) {
    try {
      await deletePodCatalog(id);
      await refresh();
      push("info", "Pod удален");
    } catch (error) {
      push("error", error instanceof Error ? error.message : "Ошибка удаления pod");
    }
  }

  return (
    <section className="section-stack">
      <Card title="Управление шаблонами" description="CRUD шаблонов GPU workloads для pods каталога.">
        <form className="flex gap-2" onSubmit={createTemplate}>
          <Input label="Новый шаблон" value={templateName} onChange={(event) => setTemplateName(event.target.value)} />
          <Button className="mt-7" type="submit">Добавить шаблон</Button>
        </form>
      </Card>

      <Card title="Управление Pods каталогом" description="Добавление и удаление позиций каталога через админку.">
        <form className="flex gap-2" onSubmit={createPod}>
          <Input label="Название pod" value={podName} onChange={(event) => setPodName(event.target.value)} />
          <Button className="mt-7" type="submit">Добавить Pod</Button>
        </form>
        <div className="mt-4">
          <Table
            ariaLabel="Админский каталог pods"
            rowKey={(row) => row.id}
            items={pods}
            emptyState={<EmptyState title="Каталог пуст" description="Добавьте первый pod." />}
            columns={[
              { key: "name", header: "Pod", render: (row) => row.name },
              { key: "gpu", header: "GPU", render: (row) => row.gpu_model },
              { key: "price", header: "$/час", render: (row) => row.hourly_price_usd.toFixed(2) },
              { key: "templates", header: "Шаблоны", render: (row) => `${row.template_ids?.length ?? 0}` },
              { key: "actions", header: "Действия", render: (row) => <Button variant="ghost" size="sm" onClick={() => removePod(row.id)}>Удалить</Button> }
            ]}
          />
        </div>
      </Card>
    </section>
  );
}

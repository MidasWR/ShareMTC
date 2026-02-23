import { Modal } from "../design/components/Modal";
import { InlineAlert } from "../design/patterns/InlineAlert";
import { PageSectionHeader } from "../design/patterns/PageSectionHeader";
import { Button } from "../design/primitives/Button";
import { Card } from "../design/primitives/Card";
import { Input } from "../design/primitives/Input";
import { AllocationDetailsDrawer } from "../features/resources/components/AllocationDetailsDrawer";
import { AllocationFilters } from "../features/resources/components/AllocationFilters";
import { AllocationMetrics } from "../features/resources/components/AllocationMetrics";
import { AllocationTable } from "../features/resources/components/AllocationTable";
import { CreateAllocationModal } from "../features/resources/components/CreateAllocationModal";
import { useAllocations } from "../features/resources/hooks/useAllocations";

export function HostPanel() {
  const state = useAllocations();

  function toggleColumn(key: string) {
    state.setVisibleColumns((prev) => {
      if (prev.includes(key)) return prev.filter((item) => item !== key);
      return [...prev, key];
    });
  }

  return (
    <section className="section-stack">
      <PageSectionHeader
        title="Pods & Allocations"
        description="Create, inspect, and safely stop pod allocations for a provider."
      />

      <Card title="Pod allocations" description="Create and monitor running allocations for provider compute capacity.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr_1fr]">
          <Input
            label="Provider ID"
            value={state.providerID}
            onChange={(event) => state.setProviderID(event.target.value)}
            placeholder="Provider UUID"
            helpText="Used for list/create/release API operations."
          />
          <Button variant="secondary" className="md:mt-7" onClick={state.load} loading={state.loading}>
            Load allocations
          </Button>
          <Button variant="secondary" className="md:mt-7" onClick={state.heartbeat} loading={state.loading}>
            Send heartbeat
          </Button>
          <Button className="md:mt-7" onClick={() => state.setShowCreateModal(true)}>
            Create pod
          </Button>
        </div>
        <AllocationMetrics total={state.allocations.length} running={state.activeAllocations} />
        <div className="mt-4">
          <InlineAlert kind="info">{state.statusText}</InlineAlert>
        </div>
      </Card>

      <Card title="Allocation list" description="Data-dense table with details and safe actions.">
        <AllocationFilters
          search={state.search}
          onSearch={state.setSearch}
          statusFilter={state.statusFilter}
          onStatusFilter={state.setStatusFilter}
          sortBy={state.sortBy}
          onSortBy={state.setSortBy}
        />
        <AllocationTable
          rows={state.filteredAllocations}
          visibleColumns={state.visibleColumns}
          onToggleColumn={toggleColumn}
          onOpenDetails={state.setSelected}
          onStop={state.setReleaseTarget}
          onCreate={() => state.setShowCreateModal(true)}
        />
      </Card>

      <AllocationDetailsDrawer selected={state.selected} onClose={() => state.setSelected(null)} />

      <CreateAllocationModal
        open={state.showCreateModal}
        cpuCores={state.cpuCores}
        ramMB={state.ramMB}
        gpuUnits={state.gpuUnits}
        loading={state.loading}
        onClose={() => state.setShowCreateModal(false)}
        onSubmit={state.create}
        onCPU={state.setCpuCores}
        onRAM={state.setRamMB}
        onGPU={state.setGpuUnits}
      />

      <Modal
        open={Boolean(state.releaseTarget)}
        title="Stop pod allocation"
        description="This will release resources for the selected allocation."
        confirmVariant="destructive"
        confirmLabel="Stop"
        onClose={() => state.setReleaseTarget(null)}
        onConfirm={() => state.releaseTarget && state.release(state.releaseTarget.id)}
      />
    </section>
  );
}

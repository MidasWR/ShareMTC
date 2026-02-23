import { CreateServerModal } from "./components/CreateServerModal";
import { ServerDetailsDrawer } from "./components/ServerDetailsDrawer";
import { ServerFilters } from "./components/ServerFilters";
import { ServerMetrics } from "./components/ServerMetrics";
import { ServerTable } from "./components/ServerTable";
import { SkeletonBlock } from "../../../design/patterns/SkeletonBlock";
import { PageSectionHeader } from "../../../design/patterns/PageSectionHeader";
import { InlineAlert } from "../../../design/patterns/InlineAlert";
import { Button } from "../../../design/primitives/Button";
import { Card } from "../../../design/primitives/Card";
import { useServers } from "./hooks/useServers";

export function AdminServersPanel() {
  const state = useServers();

  function toggleColumn(key: string) {
    state.setVisibleColumns((prev) => (prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]));
  }

  return (
    <section className="section-stack">
      <PageSectionHeader
        title="Admin Servers"
        description="Manage provider machines, capacity metadata, and operational visibility."
        actions={
          <>
            <Button variant="secondary" onClick={state.refresh} loading={state.loading}>
              Refresh
            </Button>
            <Button onClick={() => state.setIsCreateOpen(true)}>Add server</Button>
          </>
        }
      />

      <ServerMetrics total={state.providers.length} online={state.onlineCount} />

      <Card title="Server inventory" description="Search, filter, and inspect provider nodes.">
        {state.loading ? <SkeletonBlock lines={6} /> : null}
        {!state.loading && state.error ? <InlineAlert kind="error">{state.error}</InlineAlert> : null}
        {!state.loading && !state.error ? (
          <>
            <ServerFilters
              search={state.search}
              statusFilter={state.statusFilter}
              sortBy={state.sortBy}
              onSearch={state.setSearch}
              onStatus={state.setStatusFilter}
              onSort={state.setSortBy}
            />
            <ServerTable
              rows={state.filteredProviders}
              visibleColumns={state.visibleColumns}
              onToggleColumn={toggleColumn}
              onOpenDetails={state.setSelected}
            />
          </>
        ) : null}
      </Card>

      <ServerDetailsDrawer selected={state.selected} onClose={() => state.setSelected(null)} />

      <CreateServerModal
        open={state.isCreateOpen}
        creating={state.creating}
        form={state.form}
        onClose={() => state.setIsCreateOpen(false)}
        onSubmit={state.create}
        onChange={(name, value) => state.setForm((prev) => ({ ...prev, [name]: value }))}
      />
    </section>
  );
}

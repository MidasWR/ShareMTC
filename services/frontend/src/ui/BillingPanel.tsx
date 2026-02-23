import { AccrualTable } from "../features/billing/components/AccrualTable";
import { BillingMetrics } from "../features/billing/components/BillingMetrics";
import { useBilling } from "../features/billing/hooks/useBilling";
import { InlineAlert } from "../design/patterns/InlineAlert";
import { PageSectionHeader } from "../design/patterns/PageSectionHeader";
import { SkeletonBlock } from "../design/patterns/SkeletonBlock";
import { Button } from "../design/primitives/Button";
import { Card } from "../design/primitives/Card";
import { Input } from "../design/primitives/Input";

export function BillingPanel() {
  const state = useBilling();

  function toggleColumn(key: string) {
    state.setVisibleColumns((prev) => {
      if (prev.includes(key)) return prev.filter((item) => item !== key);
      return [...prev, key];
    });
  }

  return (
    <section className="section-stack">
      <PageSectionHeader
        title="Billing & Usage"
        description="Process usage and review accrual history with predictable financial visibility."
      />

      <Card title="Billing usage" description="Use existing billing contract for cost preview and accrual history.">
        <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-[2fr_2fr_1fr_1fr]" onSubmit={state.previewUsage}>
          <Input label="Provider ID" value={state.providerID} onChange={(event) => state.setProviderID(event.target.value)} />
          <Input label="Plan ID" value={state.planID} onChange={(event) => state.setPlanID(event.target.value)} />
          <Button type="submit" className="md:mt-7" loading={state.loading}>
            Process usage
          </Button>
          <Button type="button" variant="secondary" className="md:mt-7" onClick={state.loadAccrualRows} loading={state.loading}>
            Load accruals
          </Button>
        </form>
        <BillingMetrics costPreview={state.costPreview} totalAccrued={state.totalAccrued} totalBonus={state.totalBonus} />
        <div className="mt-4">
          {state.error ? <InlineAlert kind="error">{state.error}</InlineAlert> : <InlineAlert kind="info">{state.statusMessage}</InlineAlert>}
        </div>
      </Card>

      <Card title="Accrual history" description="Data density mode for financial records.">
        {state.loading ? <SkeletonBlock lines={4} /> : null}
        <AccrualTable
          rows={state.filteredAccruals}
          visibleColumns={state.visibleColumns}
          sortBy={state.sortBy}
          search={state.search}
          onSortBy={state.setSortBy}
          onSearch={state.setSearch}
          onToggleColumn={toggleColumn}
          loading={state.loading}
        />
      </Card>
    </section>
  );
}

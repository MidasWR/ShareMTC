const tiers = [
  { name: "Starter", threshold: ">= 200 Mbps", bonus: "5% accrual bonus" },
  { name: "Pro", threshold: ">= 500 Mbps", bonus: "10% accrual bonus" },
  { name: "Ultra", threshold: ">= 1000 Mbps", bonus: "20% accrual bonus + MTS internet perks" }
];

export function VipPanel() {
  return (
    <section className="section-stack">
      <header className="space-y-1">
        <h2 className="text-xl font-semibold">VIP policy</h2>
        <p className="text-sm text-textSecondary">
          Network-quality tiers apply predictable bonus multipliers to usage accruals for providers.
        </p>
      </header>
      <div className="grid gap-3 md:grid-cols-3">
        {tiers.map((tier) => (
          <article key={tier.name} className="rounded-md border border-border bg-surface p-4">
            <h3 className="text-base font-semibold">{tier.name}</h3>
            <p className="mt-1 text-sm text-textSecondary">{tier.threshold}</p>
            <p className="mt-2 text-sm text-brand">{tier.bonus}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

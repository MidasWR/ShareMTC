const tiers = [
  { name: "Starter", threshold: ">= 200 Mbps", bonus: "5% accrual bonus" },
  { name: "Pro", threshold: ">= 500 Mbps", bonus: "10% accrual bonus" },
  { name: "Ultra", threshold: ">= 1000 Mbps", bonus: "20% accrual bonus + MTS internet perks" }
];

export function VipPanel() {
  return (
    <section className="glass p-6 space-y-4">
      <h2 className="text-xl font-semibold">VIP System</h2>
      <p className="text-slate-300">
        The platform rewards both compute buyers and hardware providers with faster queue and revenue multipliers for high quality network.
      </p>
      <div className="grid md:grid-cols-3 gap-4">
        {tiers.map((tier) => (
          <article key={tier.name} className="rounded-lg border border-violet-400/30 bg-violet-500/10 p-4">
            <h3 className="font-semibold text-lg">{tier.name}</h3>
            <p className="text-sm text-slate-300">{tier.threshold}</p>
            <p className="text-sm text-accentLight">{tier.bonus}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

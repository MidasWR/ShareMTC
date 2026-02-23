import { MetricTile } from "../../../design/patterns/MetricTile";

type Props = {
  costPreview: string;
  totalAccrued: number;
  totalBonus: number;
};

export function BillingMetrics({ costPreview, totalAccrued, totalBonus }: Props) {
  return (
    <div className="mt-4 grid gap-3 md:grid-cols-3">
      <MetricTile label="Last preview" value={costPreview} />
      <MetricTile label="Accrued total" value={`$${totalAccrued.toFixed(2)}`} />
      <MetricTile label="VIP bonus total" value={`$${totalBonus.toFixed(2)}`} />
    </div>
  );
}

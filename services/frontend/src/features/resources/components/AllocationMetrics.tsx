import { MetricTile } from "../../../design/patterns/MetricTile";

type Props = {
  total: number;
  running: number;
};

export function AllocationMetrics({ total, running }: Props) {
  return (
    <div className="mt-4 grid gap-3 md:grid-cols-3">
      <MetricTile label="Total allocations" value={`${total}`} />
      <MetricTile label="Running" value={`${running}`} />
      <MetricTile label="Released" value={`${Math.max(0, total - running)}`} />
    </div>
  );
}

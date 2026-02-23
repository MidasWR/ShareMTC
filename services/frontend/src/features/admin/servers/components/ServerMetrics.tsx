import { MetricTile } from "../../../../design/patterns/MetricTile";

type Props = {
  total: number;
  online: number;
};

export function ServerMetrics({ total, online }: Props) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <MetricTile label="Total servers" value={`${total}`} />
      <MetricTile label="Online" value={`${online}`} />
      <MetricTile label="Offline" value={`${Math.max(0, total - online)}`} />
    </div>
  );
}

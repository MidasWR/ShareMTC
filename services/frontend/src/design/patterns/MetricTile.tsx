type MetricTileProps = {
  label: string;
  value: string;
  hint?: string;
};

export function MetricTile({ label, value, hint }: MetricTileProps) {
  return (
    <article className="rounded-md border border-border bg-elevated/30 p-3">
      <p className="text-xs uppercase tracking-wide text-textMuted">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs text-textSecondary">{hint}</p> : null}
    </article>
  );
}

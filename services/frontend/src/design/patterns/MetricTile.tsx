type MetricTileProps = {
  label: string;
  value: string;
  hint?: string;
};

export function MetricTile({ label, value, hint }: MetricTileProps) {
  return (
    <article className="rounded-md border border-border bg-surface p-4 shadow-sm hover:border-brand/50 transition-colors">
      <p className="text-xs font-mono uppercase tracking-widest text-textMuted">{label}</p>
      <p className="mt-2 text-3xl font-mono font-bold tabular-nums text-textPrimary drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">{value}</p>
      {hint ? <p className="mt-2 text-xs font-mono text-textSecondary">{hint}</p> : null}
    </article>
  );
}

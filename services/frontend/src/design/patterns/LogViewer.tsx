type LogViewerProps = {
  lines: string[];
  title?: string;
};

export function LogViewer({ lines, title = "Logs" }: LogViewerProps) {
  return (
    <section className="space-y-2">
      <header className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">{title}</h4>
        <span className="text-xs text-textMuted">{lines.length} lines</span>
      </header>
      <pre className="max-h-72 overflow-auto rounded-md border border-border bg-canvas p-3 font-mono text-xs text-textSecondary">
        {lines.join("\n")}
      </pre>
    </section>
  );
}

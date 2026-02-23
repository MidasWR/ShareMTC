type Crumb = {
  id: string;
  label: string;
};

type BreadcrumbsProps = {
  items: Crumb[];
};

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className="text-xs text-textMuted">
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((item, index) => (
          <li key={item.id} className="flex items-center gap-2">
            {index > 0 ? <span>/</span> : null}
            <span>{item.label}</span>
          </li>
        ))}
      </ol>
    </nav>
  );
}

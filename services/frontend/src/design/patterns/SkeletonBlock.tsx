type SkeletonBlockProps = {
  lines?: number;
};

export function SkeletonBlock({ lines = 3 }: SkeletonBlockProps) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, index) => (
        <div key={index} className="h-4 animate-pulse rounded bg-elevated" />
      ))}
    </div>
  );
}

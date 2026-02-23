import { useMemo, useState } from "react";

export type TableDensity = "comfortable" | "compact";

type UseTableControlsResult<T> = {
  page: number;
  setPage: (value: number) => void;
  pageSize: number;
  setPageSize: (value: number) => void;
  density: TableDensity;
  setDensity: (value: TableDensity) => void;
  totalPages: number;
  pagedItems: T[];
};

export function useTableControls<T>(items: T[], initialPageSize = 10): UseTableControlsResult<T> {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const [density, setDensity] = useState<TableDensity>("compact");

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const pagedItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    const end = start + pageSize;
    return items.slice(start, end);
  }, [items, safePage, pageSize]);

  function setPageSize(value: number) {
    setPageSizeState(value);
    setPage(1);
  }

  return {
    page: safePage,
    setPage,
    pageSize,
    setPageSize,
    density,
    setDensity,
    totalPages,
    pagedItems
  };
}

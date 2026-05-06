import { useState, useMemo } from "react";

/**
 * Gerencia ordenação de tabela.
 * Retorna `sorted` (dados ordenados), `sortConfig` e `handleSort(field)`.
 */
export function useSortTable(data = []) {
  const [sortConfig, setSortConfig] = useState({ key: null, dir: null });

  const sorted = useMemo(() => {
    if (!sortConfig.key || !sortConfig.dir) return data;
    return [...data].sort((a, b) => {
      const va = a[sortConfig.key] ?? "";
      const vb = b[sortConfig.key] ?? "";
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return sortConfig.dir === "asc" ? cmp : -cmp;
    });
  }, [data, sortConfig.key, sortConfig.dir]);

  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return { key: null, dir: null };
    });
  };

  return { sorted, sortConfig, handleSort };
}

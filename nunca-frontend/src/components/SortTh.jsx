import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

/**
 * <th> com ícone de ordenação para tabelas .erp-table.
 * Props: field, sortConfig, onSort, children, className
 */
export default function SortTh({ field, sortConfig, onSort, children, className = "" }) {
  const isActive = sortConfig.key === field;

  return (
    <th onClick={() => onSort(field)} className={className}>
      <span className="inline-flex items-center gap-1 cursor-pointer">
        {children}
        {isActive && sortConfig.dir === "asc" ? (
          <ChevronUp size={11} className="text-white" />
        ) : isActive && sortConfig.dir === "desc" ? (
          <ChevronDown size={11} className="text-white" />
        ) : (
          <ChevronsUpDown size={11} className="opacity-40" />
        )}
      </span>
    </th>
  );
}

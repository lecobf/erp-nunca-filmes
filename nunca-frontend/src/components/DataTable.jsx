import { useState } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

/**
 * DataTable — grade profissional com ordenação, paginação e totalizadores.
 *
 * Props:
 *  columns: [{ field, label, noSort?, render? }]
 *  data: array
 *  rowsPerPageOptions: number[]  (default [10, 25, 50])
 *  totals: [{ label, value, className? }]  — linha de totalizadores
 *  emptyMessage: string
 */
export default function DataTable({
  columns,
  data = [],
  rowsPerPageOptions = [10, 25, 50],
  totals = [],
  emptyMessage = "Nenhum registro encontrado.",
}) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(rowsPerPageOptions[0]);

  // Ordenação
  const sortedData = [...data].sort((a, b) => {
    if (!sortConfig.key || !sortConfig.direction) return 0;
    const valA = a[sortConfig.key] ?? "";
    const valB = b[sortConfig.key] ?? "";
    const cmp = valA < valB ? -1 : valA > valB ? 1 : 0;
    return sortConfig.direction === "asc" ? cmp : -cmp;
  });

  // Paginação
  const totalRecords = sortedData.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * rowsPerPage;
  const pageData = sortedData.slice(startIdx, startIdx + rowsPerPage);

  const goTo = (p) => setCurrentPage(Math.max(1, Math.min(p, totalPages)));

  const handleSort = (field) => {
    setSortConfig((prev) => {
      if (prev.key !== field) return { key: field, direction: "asc" };
      if (prev.direction === "asc") return { key: field, direction: "desc" };
      return { key: null, direction: null };
    });
    setCurrentPage(1);
  };

  const SortIcon = ({ field }) => {
    if (sortConfig.key !== field) return <ChevronsUpDown size={11} className="opacity-40" />;
    if (sortConfig.direction === "asc") return <ChevronUp size={11} className="text-white" />;
    return <ChevronDown size={11} className="text-white" />;
  };

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="erp-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.field}
                  className={col.noSort ? "no-sort" : ""}
                  onClick={() => !col.noSort && handleSort(col.field)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {!col.noSort && <SortIcon field={col.field} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {pageData.length > 0 ? (
              pageData.map((row, i) => (
                <tr key={row.id ?? i}>
                  {columns.map((col) => (
                    <td key={col.field}>
                      {col.render ? col.render(row) : (row[col.field] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="text-center text-neutral-400 py-8 italic">
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Totalizadores */}
      {totals.length > 0 && (
        <div className="totals-bar">
          {totals.map((t, i) => (
            <span key={i} className="total-item">
              <span className="total-label">{t.label}</span>
              <span className={`total-value ${t.className ?? "text-neutral-800"}`}>{t.value}</span>
            </span>
          ))}
        </div>
      )}

      {/* Paginação */}
      <div className="pagination-bar">
        <span>
          Exibindo{" "}
          <strong className="text-neutral-700">
            {totalRecords === 0 ? 0 : startIdx + 1}
          </strong>{" "}
          –{" "}
          <strong className="text-neutral-700">
            {Math.min(startIdx + rowsPerPage, totalRecords)}
          </strong>{" "}
          / <strong className="text-neutral-700">{totalRecords}</strong> registros
        </span>

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            Exibir:
            <select
              className="h-6 px-1.5 text-xs border border-neutral-300 rounded bg-white focus:ring-1 focus:ring-primary-400"
              value={rowsPerPage}
              onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
            >
              {rowsPerPageOptions.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </span>

          <div className="flex items-center gap-0.5">
            <button className="page-btn" onClick={() => goTo(1)} disabled={safePage === 1} title="Primeira">
              <ChevronsLeft size={13} />
            </button>
            <button className="page-btn" onClick={() => goTo(safePage - 1)} disabled={safePage === 1} title="Anterior">
              <ChevronLeft size={13} />
            </button>

            {/* Páginas próximas */}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => Math.abs(p - safePage) <= 2)
              .map((p) => (
                <button
                  key={p}
                  onClick={() => goTo(p)}
                  className={p === safePage ? "page-btn-active" : "page-btn"}
                >
                  {p}
                </button>
              ))}

            <button className="page-btn" onClick={() => goTo(safePage + 1)} disabled={safePage === totalPages} title="Próxima">
              <ChevronRight size={13} />
            </button>
            <button className="page-btn" onClick={() => goTo(totalPages)} disabled={safePage === totalPages} title="Última">
              <ChevronsRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

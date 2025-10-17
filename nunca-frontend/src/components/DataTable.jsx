import { useState } from "react";
import { ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import IconButton from "./IconButton";

export default function DataTable({ columns, data = [], rowsPerPageOptions = [5, 10, 20] }) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(rowsPerPageOptions[0]);

  // 🔹 Ordenação dinâmica
  const sortedData = [...data].sort((a, b) => {
    if (!sortConfig.key) return 0;
    const { key, direction } = sortConfig;
    const valA = a[key] ?? "";
    const valB = b[key] ?? "";
    if (valA < valB) return direction === "asc" ? -1 : 1;
    if (valA > valB) return direction === "asc" ? 1 : -1;
    return 0;
  });

  // 🔹 Paginação
  const totalPages = Math.ceil(sortedData.length / rowsPerPage);
  const paginatedData = sortedData.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const handleSort = (key) => {
    if (key === "acoes") return; // não ordena a coluna de ações
    setSortConfig((prev) => {
      if (prev.key === key) {
        return {
          key,
          direction: prev.direction === "asc" ? "desc" : prev.direction === "desc" ? null : "asc",
        };
      }
      return { key, direction: "asc" };
    });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <ArrowUpDown className="inline w-4 h-4 opacity-50" />;
    if (sortConfig.direction === "asc") return <ArrowUpDown className="inline w-4 h-4 rotate-180" />;
    if (sortConfig.direction === "desc") return <ArrowUpDown className="inline w-4 h-4" />;
    return <ArrowUpDown className="inline w-4 h-4 opacity-50" />;
  };

  return (
    <div className="w-full bg-white rounded-lg shadow">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead className="bg-neutral-100 border-b">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.field}
                  onClick={() => handleSort(col.field)}
                  className={`px-3 py-2 text-left font-medium text-neutral-700 select-none cursor-pointer ${
                    col.field === "acoes" ? "cursor-default" : ""
                  }`}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {col.field !== "acoes" && getSortIcon(col.field)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {paginatedData.length > 0 ? (
              paginatedData.map((row, rowIndex) => (
                <tr
                  key={row.id || rowIndex}
                  className={`border-t hover:bg-neutral-50 ${
                    rowIndex % 2 === 0 ? "bg-white" : "bg-neutral-50/40"
                  }`}
                >
                  {columns.map((col) => (
                    <td key={`${rowIndex}-${col.field}`} className="px-3 py-2">
                      {col.render ? col.render(row) : row[col.field]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="text-center text-neutral-500 py-4 italic"
                >
                  Nenhum registro encontrado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 🔹 Rodapé com paginação e controle de linhas */}
      <div className="flex items-center justify-between p-3 text-sm text-neutral-700 bg-neutral-50 border-t">
        <div className="flex items-center gap-2">
          <span>Linhas por página:</span>
          <select
            className="border rounded px-2 py-1"
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
          >
            {rowsPerPageOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span>
            Página {currentPage} de {totalPages || 1}
          </span>
          <div className="flex gap-1">
            <IconButton
              icon={ChevronLeft}
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
            />
            <IconButton
              icon={ChevronRight}
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages || totalPages === 0}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

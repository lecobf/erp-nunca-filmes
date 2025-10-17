export default function Pagination({ page, total, pageSize, onPage }) {
  const last = Math.max(1, Math.ceil(total / pageSize));
  const prev = () => onPage(Math.max(1, page - 1));
  const next = () => onPage(Math.min(last, page + 1));

  return (
    <div className="flex items-center justify-end gap-2 mt-3">
      <button onClick={prev} className="px-3 py-1 rounded border hover:bg-gray-50">Anterior</button>
      <span className="text-sm text-gray-600">
        Página <b>{page}</b> de <b>{last}</b>
      </span>
      <button onClick={next} className="px-3 py-1 rounded border hover:bg-gray-50">Próxima</button>
    </div>
  );
}

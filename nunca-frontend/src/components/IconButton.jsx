export default function IconButton({ icon: Icon, onClick, color = "gray", title, disabled = false }) {
  const colors = {
    gray:  "bg-neutral-100 hover:bg-neutral-200 text-neutral-600",
    blue:  "bg-blue-50   hover:bg-blue-100   text-blue-600",
    red:   "bg-red-50    hover:bg-red-100    text-red-600",
    green: "bg-emerald-50 hover:bg-emerald-100 text-emerald-600",
  };
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center w-7 h-7 rounded transition-colors
        ${colors[color] ?? colors.gray} disabled:opacity-40 disabled:pointer-events-none`}
    >
      <Icon size={14} />
    </button>
  );
}

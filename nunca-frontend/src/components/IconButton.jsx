export default function IconButton({ icon: Icon, onClick, color = "gray", title }) {
  const colors = {
    gray: "bg-gray-100 hover:bg-gray-200 text-gray-700",
    blue: "bg-blue-100 hover:bg-blue-200 text-blue-700",
    red: "bg-red-100 hover:bg-red-200 text-red-700",
    green: "bg-green-100 hover:bg-green-200 text-green-700",
  };
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`inline-flex items-center justify-center rounded px-2 py-2 ${colors[color] || colors.gray}`}
    >
      <Icon size={16} />
    </button>
  );
}

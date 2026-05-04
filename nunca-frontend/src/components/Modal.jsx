import { X } from "lucide-react";

export default function Modal({ isOpen, onClose, title, children, widthClass = "max-w-2xl" }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
      <div className={`bg-white w-full ${widthClass} sm:rounded-lg shadow-lg flex flex-col max-h-[92dvh] sm:max-h-[90vh] rounded-t-2xl sm:rounded-2xl`}>
        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
          <h3 className="text-base font-semibold">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
            <X size={18} />
          </button>
        </div>
        <div className="p-4 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

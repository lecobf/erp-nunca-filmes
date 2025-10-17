// src/pages/Modal.jsx
import { useEffect } from "react";

/**
 * Modal simples e reutilizável.
 * Props:
 * - isOpen: boolean
 * - onClose: () => void
 * - title?: string
 * - children: ReactNode
 * - maxWidth?: string (ex: "max-w-2xl")
 */
export default function Modal({ isOpen, onClose, title, children, maxWidth = "max-w-2xl" }) {
  useEffect(() => {
    function onEsc(e) {
      if (e.key === "Escape") onClose?.();
    }
    if (isOpen) {
      document.addEventListener("keydown", onEsc);
    }
    return () => document.removeEventListener("keydown", onEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* overlay */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* content */}
      <div className={`relative bg-white rounded-lg shadow-lg w-full ${maxWidth} mx-4 p-4`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">{title || "Detalhes"}</h3>
          <button
            onClick={onClose}
            className="rounded px-2 py-1 text-gray-500 hover:bg-gray-100"
            aria-label="Fechar"
            title="Fechar"
          >
            ×
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}
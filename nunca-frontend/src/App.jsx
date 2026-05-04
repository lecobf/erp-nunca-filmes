import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Menu, X, LayoutDashboard, Briefcase, Users, DollarSign, TrendingDown, Camera, Calendar } from "lucide-react";

const NAV_ITEMS = [
  { to: "/",            label: "Dashboard",   icon: LayoutDashboard },
  { to: "/servicos",    label: "Serviços",    icon: Briefcase },
  { to: "/clientes",    label: "Clientes",    icon: Users },
  { to: "/custos",      label: "Custos",      icon: TrendingDown },
  { to: "/pagamentos",  label: "Pagamentos",  icon: DollarSign },
  { to: "/equipamentos",label: "Equipamentos",icon: Camera },
  { to: "/calendario",  label: "Calendário",  icon: Calendar },
];

export default function App() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const currentLabel =
    NAV_ITEMS.find((n) => n.to === location.pathname)?.label ?? "ERP";

  return (
    <div className="min-h-screen flex bg-gray-100">
      {/* Overlay mobile */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={[
          "fixed inset-y-0 left-0 z-30 flex flex-col w-60 bg-white border-r",
          "transition-transform duration-200 ease-in-out",
          open ? "translate-x-0" : "-translate-x-full",
          "lg:relative lg:translate-x-0",
        ].join(" ")}
      >
        {/* Logo / fechar */}
        <div className="flex items-center justify-between px-4 py-4 border-b">
          <span className="font-bold text-lg tracking-tight">Nunca Filmes</span>
          <button
            onClick={() => setOpen(false)}
            className="lg:hidden p-1 rounded hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                [
                  "flex items-center gap-3 px-3 py-2 rounded text-sm font-medium transition-colors",
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-700 hover:bg-gray-100",
                ].join(" ")
              }
            >
              <Icon size={18} className="shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Conteúdo principal */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-white border-b px-4 py-3 flex items-center gap-3 shadow-sm">
          <button
            onClick={() => setOpen(true)}
            className="lg:hidden p-1 rounded hover:bg-gray-100"
            aria-label="Abrir menu"
          >
            <Menu size={22} />
          </button>
          <span className="font-semibold text-gray-800">{currentLabel}</span>
        </header>

        {/* Página */}
        <main className="flex-1 overflow-x-hidden">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

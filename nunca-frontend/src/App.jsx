import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Briefcase, Users, DollarSign,
  TrendingDown, Camera, Calendar,
} from "lucide-react";

const NAV_ITEMS = [
  { to: "/",             label: "Dashboard",    icon: LayoutDashboard },
  { to: "/servicos",     label: "Serviços",     icon: Briefcase },
  { to: "/clientes",     label: "Clientes",     icon: Users },
  { to: "/custos",       label: "Custos",       icon: TrendingDown },
  { to: "/pagamentos",   label: "Pagamentos",   icon: DollarSign },
  { to: "/equipamentos", label: "Equipamentos", icon: Camera },
  { to: "/calendario",   label: "Calendário",   icon: Calendar },
];

function SidebarLink({ to, label, icon: Icon }) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
          isActive
            ? "bg-zinc-700 text-white font-medium"
            : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
        }`
      }
    >
      <Icon size={16} className="shrink-0" />
      <span>{label}</span>
    </NavLink>
  );
}

function BottomNavLink({ to, label, icon: Icon }) {
  const shortLabel = {
    Dashboard: "Home",
    Serviços: "Serviços",
    Clientes: "Clientes",
    Custos: "Custos",
    Pagamentos: "Pgtos",
    Equipamentos: "Equip.",
    Calendário: "Agenda",
  }[label] ?? label;

  return (
    <NavLink
      to={to}
      end={to === "/"}
      className={({ isActive }) =>
        `flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-[10px] leading-tight transition-colors ${
          isActive ? "text-primary-600" : "text-neutral-400 hover:text-neutral-700"
        }`
      }
    >
      <Icon size={19} />
      <span>{shortLabel}</span>
    </NavLink>
  );
}

export default function App() {
  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* ── Sidebar desktop (lg+) ─────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-56 bg-zinc-900 text-zinc-100 shrink-0 fixed inset-y-0 left-0 z-30">
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-zinc-700/60">
          <div className="w-7 h-7 rounded bg-primary-600 flex items-center justify-center shrink-0">
            <Camera size={14} className="text-white" />
          </div>
          <span className="font-semibold text-sm text-white tracking-tight">Nunca Filmes</span>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <SidebarLink key={item.to} {...item} />
          ))}
        </nav>

        <div className="px-4 py-3 border-t border-zinc-700/60">
          <p className="text-zinc-600 text-xs">ERP v1.0</p>
        </div>
      </aside>

      {/* ── Conteúdo principal ────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 lg:ml-56">
        {/* Header mobile */}
        <header className="lg:hidden sticky top-0 z-20 bg-zinc-900 px-4 py-3 flex items-center gap-2 shadow">
          <div className="w-6 h-6 rounded bg-primary-600 flex items-center justify-center shrink-0">
            <Camera size={12} className="text-white" />
          </div>
          <span className="font-semibold text-sm text-white">Nunca Filmes</span>
        </header>

        <main className="flex-1 overflow-x-hidden pb-16 lg:pb-0">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* ── Bottom nav mobile (< lg) ─────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-neutral-200 flex h-14">
        {NAV_ITEMS.map((item) => (
          <BottomNavLink key={item.to} {...item} />
        ))}
      </nav>
    </div>
  );
}

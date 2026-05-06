import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { API_BASE_URL } from "./api/config";
import {
  LayoutDashboard, Briefcase, Users, DollarSign,
  TrendingDown, Camera, Calendar, Settings, LogOut, X,
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

/* ── Modal de Perfil ──────────────────────────────────────── */
function PerfilModal({ onClose, onNomeAtualizado }) {
  const nomeAtual = localStorage.getItem("nome") || "";
  const token = localStorage.getItem("token") || "";

  const [nome, setNome] = useState(nomeAtual);
  const [senhaAtual, setSenhaAtual] = useState("");
  const [senhaNova, setSenhaNova] = useState("");
  const [senhaConfirm, setSenhaConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  async function handleSalvar(e) {
    e.preventDefault();
    setErro("");
    setSucesso("");

    if (senhaNova && senhaNova !== senhaConfirm) {
      setErro("A nova senha e a confirmação não coincidem.");
      return;
    }

    const payload = {};
    if (nome.trim() && nome.trim() !== nomeAtual) payload.nome = nome.trim();
    if (senhaNova) {
      payload.senha_atual = senhaAtual;
      payload.senha_nova = senhaNova;
    }

    if (Object.keys(payload).length === 0) {
      setErro("Nenhuma alteração detectada.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        setErro(data.detail || "Erro ao salvar alterações.");
        return;
      }

      const data = await res.json();
      if (payload.nome) {
        localStorage.setItem("nome", data.nome);
        onNomeAtualizado(data.nome);
      }
      setSucesso("Perfil atualizado com sucesso!");
      setSenhaAtual("");
      setSenhaNova("");
      setSenhaConfirm("");
    } catch {
      setErro("Erro de conexão com o servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 overflow-hidden">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200">
          <h2 className="text-sm font-semibold text-neutral-800">Configurações de perfil</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSalvar} className="px-5 py-4 space-y-4">
          {/* Nome */}
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Nome de exibição</label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Seu nome"
            />
          </div>

          {/* Separador */}
          <div className="border-t border-neutral-100 pt-3">
            <p className="text-xs font-medium text-neutral-500 mb-3">Alterar senha <span className="font-normal text-neutral-400">(opcional)</span></p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-neutral-600 mb-1">Senha atual</label>
                <input
                  type="password"
                  value={senhaAtual}
                  onChange={(e) => setSenhaAtual(e.target.value)}
                  className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-xs text-neutral-600 mb-1">Nova senha</label>
                <input
                  type="password"
                  value={senhaNova}
                  onChange={(e) => setSenhaNova(e.target.value)}
                  className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-xs text-neutral-600 mb-1">Confirmar nova senha</label>
                <input
                  type="password"
                  value={senhaConfirm}
                  onChange={(e) => setSenhaConfirm(e.target.value)}
                  className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          {/* Feedback */}
          {erro && <p className="text-xs text-red-600">{erro}</p>}
          {sucesso && <p className="text-xs text-green-600">{sucesso}</p>}

          {/* Botão */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-md transition-colors"
          >
            {loading ? "Salvando..." : "Salvar alterações"}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ── App principal ────────────────────────────────────────── */
export default function App() {
  const navigate = useNavigate();
  const [perfilAberto, setPerfilAberto] = useState(false);
  const [nomeExibido, setNomeExibido] = useState(
    () => localStorage.getItem("nome") || "Usuário"
  );

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("nome");
    localStorage.removeItem("usuario_id");
    navigate("/login");
  }

  function handleNomeAtualizado(novoNome) {
    setNomeExibido(novoNome);
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* ── Sidebar desktop (lg+) ─────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-56 bg-zinc-900 text-zinc-100 shrink-0 fixed inset-y-0 left-0 z-30">
        {/* Cabeçalho com engrenagem */}
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-zinc-700/60">
          <button
            onClick={() => setPerfilAberto(true)}
            title="Configurações de perfil"
            className="w-7 h-7 rounded bg-primary-600 flex items-center justify-center shrink-0 hover:bg-primary-700 transition-colors"
          >
            <Settings size={14} className="text-white" />
          </button>
          <button
            onClick={() => setPerfilAberto(true)}
            className="font-semibold text-sm text-white tracking-tight hover:text-zinc-300 transition-colors truncate text-left"
            title="Configurações de perfil"
          >
            {nomeExibido}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <SidebarLink key={item.to} {...item} />
          ))}
        </nav>

        {/* Rodapé com logout */}
        <div className="px-4 py-3 border-t border-zinc-700/60 flex items-center justify-between">
          <p className="text-zinc-600 text-xs">ERP v1.0</p>
          <button
            onClick={handleLogout}
            title="Sair"
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <LogOut size={14} />
          </button>
        </div>
      </aside>

      {/* ── Conteúdo principal ────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 lg:ml-56">
        {/* Header mobile */}
        <header className="lg:hidden sticky top-0 z-20 bg-zinc-900 px-4 py-3 flex items-center justify-between shadow">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPerfilAberto(true)}
              className="w-6 h-6 rounded bg-primary-600 flex items-center justify-center shrink-0 hover:bg-primary-700 transition-colors"
            >
              <Settings size={12} className="text-white" />
            </button>
            <span className="font-semibold text-sm text-white">{nomeExibido}</span>
          </div>
          <button
            onClick={handleLogout}
            title="Sair"
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <LogOut size={16} />
          </button>
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

      {/* ── Modal de perfil ──────────────────────────────── */}
      {perfilAberto && (
        <PerfilModal
          onClose={() => setPerfilAberto(false)}
          onNomeAtualizado={handleNomeAtualizado}
        />
      )}
    </div>
  );
}

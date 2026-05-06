import { useEffect, useState } from "react";
import { UserPlus, Pencil, Trash2, X } from "lucide-react";
import { API_BASE_URL } from "../api/config";

const ADMIN_EMAIL = "admin@nuncafilmes.com";

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  };
}

/* ── Modal criar / editar ──────────────────────────────────── */
function ModalUsuario({ usuario, onClose, onSalvo }) {
  const editando = !!usuario;

  const [nome, setNome] = useState(usuario?.nome || "");
  const [email, setEmail] = useState(usuario?.email || "");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErro("");

    if (!editando && !senha) {
      setErro("Informe uma senha para o novo usuário.");
      return;
    }

    setLoading(true);
    try {
      let res;
      if (editando) {
        const payload = { nome };
        if (senha) payload.senha_nova = senha;
        res = await fetch(`${API_BASE_URL}/auth/users/${usuario.id}`, {
          method: "PUT",
          headers: authHeaders(),
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`${API_BASE_URL}/auth/users`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ nome, email, senha }),
        });
      }

      if (!res.ok) {
        const data = await res.json();
        setErro(data.detail || "Erro ao salvar usuário.");
        return;
      }

      const data = await res.json();
      onSalvo(data, editando);
      onClose();
    } catch {
      setErro("Erro de conexão com o servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200">
          <h2 className="text-sm font-semibold text-neutral-800">
            {editando ? "Editar usuário" : "Novo usuário"}
          </h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Nome</label>
            <input
              type="text"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Nome do usuário"
            />
          </div>

          {!editando && (
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="email@exemplo.com"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">
              Senha {editando && <span className="font-normal text-neutral-400">(deixe em branco para não alterar)</span>}
            </label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="••••••••"
            />
          </div>

          {erro && <p className="text-xs text-red-600">{erro}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-md transition-colors"
          >
            {loading ? "Salvando..." : editando ? "Salvar alterações" : "Criar usuário"}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ── Página principal ─────────────────────────────────────── */
export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState(null);
  const [confirmandoDelete, setConfirmandoDelete] = useState(null);

  async function carregar() {
    setCarregando(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/users`, { headers: authHeaders() });
      if (res.ok) setUsuarios(await res.json());
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => { carregar(); }, []);

  function handleSalvo(usuarioSalvo, editando) {
    if (editando) {
      setUsuarios((prev) => prev.map((u) => (u.id === usuarioSalvo.id ? usuarioSalvo : u)));
    } else {
      setUsuarios((prev) => [...prev, usuarioSalvo]);
    }
  }

  async function handleDelete(usuario) {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/users/${usuario.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (res.ok || res.status === 204) {
        setUsuarios((prev) => prev.filter((u) => u.id !== usuario.id));
      }
    } catch {
      alert("Erro ao excluir usuário.");
    } finally {
      setConfirmandoDelete(null);
    }
  }

  return (
    <div className="p-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-neutral-800">Gerência de Usuários</h1>
          <p className="text-sm text-neutral-500 mt-0.5">Área restrita ao administrador</p>
        </div>
        <button
          onClick={() => { setUsuarioEditando(null); setModalAberto(true); }}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
        >
          <UserPlus size={15} />
          Novo usuário
        </button>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm">
        {carregando ? (
          <div className="py-16 text-center text-sm text-neutral-400">Carregando...</div>
        ) : usuarios.length === 0 ? (
          <div className="py-16 text-center text-sm text-neutral-400">Nenhum usuário encontrado.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide">Nome</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide">Email</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide">Perfil</th>
                <th className="px-4 py-3 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {usuarios.map((u) => (
                <tr key={u.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-neutral-800">{u.nome}</td>
                  <td className="px-4 py-3 text-neutral-600">{u.email}</td>
                  <td className="px-4 py-3">
                    {u.email === ADMIN_EMAIL ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-700">
                        Admin
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-600">
                        Usuário
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => { setUsuarioEditando(u); setModalAberto(true); }}
                        className="text-neutral-400 hover:text-primary-600 transition-colors"
                        title="Editar"
                      >
                        <Pencil size={15} />
                      </button>
                      {u.email !== ADMIN_EMAIL && (
                        <button
                          onClick={() => setConfirmandoDelete(u)}
                          className="text-neutral-400 hover:text-red-600 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal criar/editar */}
      {modalAberto && (
        <ModalUsuario
          usuario={usuarioEditando}
          onClose={() => setModalAberto(false)}
          onSalvo={handleSalvo}
        />
      )}

      {/* Confirmação de exclusão */}
      {confirmandoDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xs mx-4 p-6 text-center">
            <p className="text-sm text-neutral-700 mb-1 font-medium">Excluir usuário?</p>
            <p className="text-xs text-neutral-500 mb-5">
              <span className="font-semibold">{confirmandoDelete.nome}</span> será removido permanentemente.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setConfirmandoDelete(null)}
                className="px-4 py-2 text-sm text-neutral-600 border border-neutral-300 rounded-md hover:bg-neutral-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(confirmandoDelete)}
                className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

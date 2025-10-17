import { NavLink, Outlet } from "react-router-dom";

export default function App() {
  return (
    <div className="min-h-screen flex bg-gray-100">
      <aside className="w-60 bg-white border-r">
        <div className="px-4 py-4 font-bold text-lg">ERP</div>
        <nav className="px-2 space-y-1">
          <Item to="/">Dashboard</Item>
          <Item to="/servicos">Serviços</Item>
          <Item to="/clientes">Clientes</Item>
          <Item to="/custos">Custos</Item>
		  <Item to="/pagamentos">Pagamentos</Item>
		  <Item to="/equipamentos">Equipamentos</Item>
        </nav>
      </aside>
      <main className="flex-1">
        <header className="bg-white border-b px-4 py-3">
          <h1 className="font-semibold">Bem-vindo!</h1>
        </header>
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function Item({ to, children }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `block px-3 py-2 rounded hover:bg-gray-100 ${isActive ? "bg-blue-50 text-blue-700" : "text-gray-700"}`
      }
    >
      {children}
    </NavLink>
  );
}

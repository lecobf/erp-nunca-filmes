import { createBrowserRouter, Navigate } from "react-router-dom";
import App from "./App";
import Dashboard from "./pages/Dashboard";
import Servicos from "./pages/Servicos";
import Clientes from "./pages/Clientes";
import Custos from "./pages/Custos";
import Pagamentos from "./pages/Pagamentos";
import Equipamentos from "./pages/Equipamentos";
import Calendario from "./pages/Calendario";
import Login from "./pages/Login";

function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <App />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Dashboard /> },
      { path: "servicos", element: <Servicos /> },
      { path: "clientes", element: <Clientes /> },
      { path: "custos", element: <Custos /> },
      { path: "pagamentos", element: <Pagamentos /> },
      { path: "equipamentos", element: <Equipamentos /> },
      { path: "calendario", element: <Calendario /> },
    ],
  },
]);

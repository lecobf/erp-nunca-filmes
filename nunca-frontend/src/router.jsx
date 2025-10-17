import { createBrowserRouter } from "react-router-dom";
import App from "./App";
import Dashboard from "./pages/Dashboard";
import Servicos from "./pages/Servicos";
import Clientes from "./pages/Clientes";
import Custos from "./pages/Custos";
import Pagamentos from "./pages/Pagamentos";
import Equipamentos from "./pages/Equipamentos";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: "servicos", element: <Servicos /> },
      { path: "clientes", element: <Clientes /> },
      { path: "custos", element: <Custos /> },
      { path: "pagamentos", element: <Pagamentos /> },
      { path: "equipamentos", element: <Equipamentos /> },
    ],
  },
]);

import { createBrowserRouter, Navigate, Outlet } from "react-router";
import Login from "./pages/Login";
import RecuperarPassword from "./pages/RecuperarPassword";
import ResetPassword from "./pages/ResetPassword";
import Registro from "./pages/Registro";
import VerificarEmail from "./pages/VerificarEmail";
import Dashboard from "./pages/Dashboard";
import Activos from "./pages/Activos";
import ActivoDetalle from "./pages/ActivoDetalle";
import ActivoForm from "./pages/ActivoForm";
import Tickets from "./pages/Tickets";
import TicketDetalle from "./pages/TicketDetalle";
import CrearReporte from "./pages/CrearReporte";
import Stock from "./pages/Stock";
import NuevoComponenteForm from "./pages/NuevoComponenteForm";
import Tareas from "./pages/Tareas";
import NuevaTareaForm from "./pages/NuevaTareaForm";
import Admin from "./pages/Admin";
import Informacion from "./pages/Informacion";
import { ProtectedRoute } from "./components/ProtectedRoute";
import MainLayout from "./components/MainLayout";
import { AuthProvider } from "./components/AuthContext";
import { ThemeProvider } from "./components/ThemeContext";
import { Toaster } from "sonner@2.0.3";

// Root incluye los providers DENTRO del árbol del router para que HMR
// no pierda el contexto de AuthProvider ni ThemeProvider
function Root() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Toaster position="top-right" richColors closeButton />
        <Outlet />
      </AuthProvider>
    </ThemeProvider>
  );
}

function ProtectedMainLayout() {
  return (
    <ProtectedRoute>
      <MainLayout />
    </ProtectedRoute>
  );
}

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      {
        path: "login",
        Component: Login,
      },
      {
        path: "recuperar-password",
        Component: RecuperarPassword,
      },
      {
        path: "reset-password",
        Component: ResetPassword,
      },
      {
        path: "registro",
        Component: Registro,
      },
      {
        path: "verificar-email",
        Component: VerificarEmail,
      },
      {
        path: "/",
        Component: ProtectedMainLayout,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: "dashboard", Component: Dashboard },
          { path: "activos", Component: Activos },
          { path: "activos/nuevo", Component: ActivoForm },
          { path: "activos/:id", Component: ActivoDetalle },
          { path: "activos/:id/editar", Component: ActivoForm },
          { path: "tickets", Component: Tickets },
          { path: "tickets/nuevo", Component: CrearReporte },
          { path: "tickets/:id", Component: TicketDetalle },
          { path: "stock", Component: Stock },
          { path: "stock/nuevo", Component: NuevoComponenteForm },
          { path: "tareas", Component: Tareas },
          { path: "tareas/nueva", Component: NuevaTareaForm },
          { path: "admin", Component: Admin },
          { path: "informacion", Component: Informacion },
        ],
      },
    ],
  },
]);
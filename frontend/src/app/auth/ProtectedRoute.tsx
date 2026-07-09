import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../providers/AuthProvider";
import { AuthSplash } from "./AuthSplash";

// Guarda as rotas do app. Enquanto a sessão é verificada, mostra o splash;
// sem usuário, manda para o login guardando a rota pretendida (para voltar
// depois do login).
export function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "loading") {
    return <AuthSplash />;
  }

  if (status === "unauthenticated") {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

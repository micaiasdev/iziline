import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../providers/AuthProvider";
import { AuthSplash } from "./AuthSplash";
import { HOME_PATH } from "./routes";

// O oposto do ProtectedRoute: login/cadastro só para quem NÃO está logado.
// Já autenticado é redirecionado para dentro do app.
export function PublicOnlyRoute() {
  const { status } = useAuth();

  if (status === "loading") {
    return <AuthSplash />;
  }

  if (status === "authenticated") {
    return <Navigate to={HOME_PATH} replace />;
  }

  return <Outlet />;
}

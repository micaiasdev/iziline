import { Link, useLocation } from "react-router-dom";
import { Bell, CreditCard, LogOut } from "lucide-react";
import izilineLogo from "../../assets/iziline.png";
import { useAuth } from "../providers/AuthProvider";
import "./TopBar.css";

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? "";
}

export function TopBar() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const isSubscriptionPage = pathname === "/assinatura";

  return (
    <header className="top-bar">
      <img className="top-bar__logo" src={izilineLogo} alt="Iziline" />

      <div className="top-bar__actions">
        {user && <span className="top-bar__user">{firstName(user.full_name)}</span>}

        <Link
          to={isSubscriptionPage ? "/viagens" : "/assinatura"}
          className={isSubscriptionPage ? "top-bar__plan-link is-active" : "top-bar__plan-link"}
          aria-label={isSubscriptionPage ? "Voltar para tela inicial" : "Planos e assinatura"}
        >
          <CreditCard size={18} aria-hidden="true" />
          <span>Planos</span>
        </Link>

  {/*       <button
          type="button"
          className="top-bar__bell"
          aria-label="Notificações — em breve"
          aria-disabled="true"
          disabled
          title="Em breve"
        >
          <Bell size={22} aria-hidden="true" />
        </button> */}

        <button
          type="button"
          className="top-bar__logout"
          onClick={logout}
          aria-label="Sair da conta"
          title="Sair"
        >
          <LogOut size={20} aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}

import { Bell, LogOut } from "lucide-react";
import izilineLogo from "../../assets/iziline.png";
import { useAuth } from "../providers/AuthProvider";
import "./TopBar.css";

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? "";
}

export function TopBar() {
  const { user, logout } = useAuth();

  return (
    <header className="top-bar">
      <img className="top-bar__logo" src={izilineLogo} alt="Iziline" />

      <div className="top-bar__actions">
        {user && <span className="top-bar__user">{firstName(user.full_name)}</span>}

        <button
          type="button"
          className="top-bar__bell"
          aria-label="Notificações — em breve"
          aria-disabled="true"
          disabled
          title="Em breve"
        >
          <Bell size={22} aria-hidden="true" />
        </button>

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

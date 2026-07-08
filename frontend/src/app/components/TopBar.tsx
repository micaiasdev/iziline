import { Bell } from "lucide-react";
import izilineLogo from "../../assets/iziline.png";
import "./TopBar.css";

export function TopBar() {
  return (
    <header className="top-bar">
      <img className="top-bar__logo" src={izilineLogo} alt="Iziline" />

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
    </header>
  );
}

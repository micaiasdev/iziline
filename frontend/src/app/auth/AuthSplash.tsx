import izilineLogo from "../../assets/iziline.png";
import "./AuthSplash.css";

// Tela neutra exibida enquanto a sessão é verificada no boot, evitando um
// "flash" de login antes de sabermos se o usuário já está autenticado.
export function AuthSplash() {
  return (
    <div className="auth-splash" role="status" aria-live="polite">
      <img className="auth-splash__logo" src={izilineLogo} alt="Iziline" />
      <span className="auth-splash__spinner" aria-hidden="true" />
      <span className="auth-splash__text">Carregando…</span>
    </div>
  );
}

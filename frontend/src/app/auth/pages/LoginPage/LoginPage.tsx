import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FormField } from "../../../../components/FormField/FormField";
import { useAuth } from "../../../providers/AuthProvider";
import { ApiError } from "../../../services/apiError";
import { HOME_PATH, REGISTER_PATH } from "../../routes";
import izilineLogo from "../../../../assets/iziline.png";
import "../../auth.css";

type FieldErrors = {
  email?: string;
  password?: string;
};

type LocationState = { from?: { pathname: string } };

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectTo = (location.state as LocationState | null)?.from?.pathname ?? HOME_PATH;

  function validate(): boolean {
    const next: FieldErrors = {};
    if (!email.trim()) {
      next.email = "Informe seu e-mail.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      next.email = "E-mail inválido.";
    }
    if (!password) {
      next.password = "Informe sua senha.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await login({ email: email.trim(), password });
      navigate(redirectTo, { replace: true });
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors) {
        setErrors({
          email: error.fieldErrors.email?.[0],
          password: error.fieldErrors.password?.[0],
        });
      }
      setFormError(
        error instanceof ApiError ? error.message : "Não foi possível entrar. Tente novamente."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="login-title">
        <img className="auth-card__logo" src={izilineLogo} alt="Iziline" />

        <header className="auth-header">
          <h1 id="login-title">Entrar</h1>
          <p>Acesse sua conta para publicar e reservar caronas.</p>
        </header>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {formError && (
            <span className="auth-form__alert" role="alert">
              {formError}
            </span>
          )}

          <FormField
            id="email"
            label="E-mail"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            error={errors.email}
            onChange={(event) => setEmail(event.target.value)}
          />

          <FormField
            id="password"
            label="Senha"
            type="password"
            autoComplete="current-password"
            value={password}
            error={errors.password}
            onChange={(event) => setPassword(event.target.value)}
          />

          <button className="auth-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <p className="auth-alt">
          Ainda não tem conta? <Link to={REGISTER_PATH}>Cadastre-se</Link>
        </p>
      </section>
    </main>
  );
}

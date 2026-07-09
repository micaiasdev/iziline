import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FormField } from "../../../../components/FormField/FormField";
import { useAuth } from "../../../providers/AuthProvider";
import { ApiError } from "../../../services/apiError";
import { HOME_PATH, LOGIN_PATH } from "../../routes";
import izilineLogo from "../../../../assets/iziline.png";
import "../../auth.css";

type FieldErrors = {
  full_name?: string;
  email?: string;
  cpf?: string;
  phone?: string;
  birth_date?: string;
  password?: string;
};

// Só dígitos — o backend valida CPF como exatamente 11 dígitos numéricos.
function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate(): boolean {
    const next: FieldErrors = {};

    if (!fullName.trim()) {
      next.full_name = "Informe seu nome completo.";
    }
    if (!email.trim()) {
      next.email = "Informe seu e-mail.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      next.email = "E-mail inválido.";
    }
    if (!cpf) {
      next.cpf = "Informe seu CPF.";
    } else if (onlyDigits(cpf).length !== 11) {
      next.cpf = "O CPF deve ter 11 dígitos.";
    }
    if (!password) {
      next.password = "Crie uma senha.";
    } else if (password.length < 8) {
      next.password = "A senha deve ter ao menos 8 caracteres.";
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
      await register({
        full_name: fullName.trim(),
        email: email.trim(),
        cpf: onlyDigits(cpf),
        password,
        phone: phone.trim() || undefined,
        birth_date: birthDate || null,
      });
      navigate(HOME_PATH, { replace: true });
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors) {
        const fe = error.fieldErrors;
        setErrors({
          full_name: fe.full_name?.[0],
          email: fe.email?.[0],
          cpf: fe.cpf?.[0],
          phone: fe.phone?.[0],
          birth_date: fe.birth_date?.[0],
          password: fe.password?.[0],
        });
      }
      setFormError(
        error instanceof ApiError
          ? error.message
          : "Não foi possível concluir o cadastro. Tente novamente."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="register-title">
        <img className="auth-card__logo" src={izilineLogo} alt="Iziline" />

        <header className="auth-header">
          <h1 id="register-title">Criar conta</h1>
          <p>Cadastre-se para viajar ou oferecer caronas na sua rota.</p>
        </header>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {formError && (
            <span className="auth-form__alert" role="alert">
              {formError}
            </span>
          )}

          <FormField
            id="full_name"
            label="Nome completo"
            type="text"
            autoComplete="name"
            value={fullName}
            error={errors.full_name}
            onChange={(event) => setFullName(event.target.value)}
          />

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
            id="cpf"
            label="CPF"
            type="text"
            inputMode="numeric"
            maxLength={11}
            autoComplete="off"
            value={cpf}
            error={errors.cpf}
            onChange={(event) => setCpf(onlyDigits(event.target.value))}
          />

          <div className="auth-form__row">
            <FormField
              id="phone"
              label="Telefone (opcional)"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              error={errors.phone}
              onChange={(event) => setPhone(event.target.value)}
            />

            <FormField
              id="birth_date"
              label="Nascimento (opcional)"
              type="date"
              autoComplete="bday"
              value={birthDate}
              error={errors.birth_date}
              onChange={(event) => setBirthDate(event.target.value)}
            />
          </div>

          <FormField
            id="password"
            label="Senha"
            type="password"
            autoComplete="new-password"
            value={password}
            error={errors.password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <p className="auth-hint">Use ao menos 8 caracteres.</p>

          <button className="auth-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Criando conta…" : "Criar conta"}
          </button>
        </form>

        <p className="auth-alt">
          Já tem conta? <Link to={LOGIN_PATH}>Entrar</Link>
        </p>
      </section>
    </main>
  );
}

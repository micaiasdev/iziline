import { useMemo, useState } from 'react';
import { LogOut, Pencil, Save, X } from 'lucide-react';
import { FormField } from '../../../../components/FormField/FormField';
import type { AuthUser } from '../../../../types/auth';
import { useAuth } from '../../../providers/AuthProvider';
import { ApiError } from '../../../services/apiError';
import { updateProfile } from '../../authService';
import './ProfilePage.css';

type ProfileForm = {
  full_name: string;
  phone: string;
  birth_date: string;
};

type FieldErrors = {
  full_name?: string;
  phone?: string;
  birth_date?: string;
};

const EMPTY_FORM: ProfileForm = {
  full_name: '',
  phone: '',
  birth_date: '',
};

const birthDateFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
});

function formFromUser(user: AuthUser | null): ProfileForm {
  if (!user) {
    return EMPTY_FORM;
  }

  return {
    full_name: user.full_name ?? '',
    phone: user.phone ?? '',
    birth_date: user.birth_date ?? '',
  };
}

function userInitials(user: AuthUser): string {
  const source = user.full_name.trim() || user.email;
  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase() || 'IZ';
}

function formatCpf(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 11) {
    return value || '—';
  }

  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function formatBirthDate(value: string | null): string {
  if (!value) {
    return '—';
  }

  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : birthDateFormatter.format(date);
}

function formatAge(value: number | null): string {
  if (value === null) {
    return '—';
  }

  return value === 1 ? '1 ano' : `${value} anos`;
}

function calculateAge(birthDate: string): number | null {
  if (!birthDate) {
    return null;
  }

  const parsed = new Date(`${birthDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const today = new Date();
  let age = today.getFullYear() - parsed.getFullYear();
  const monthDelta = today.getMonth() - parsed.getMonth();

  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < parsed.getDate())) {
    age -= 1;
  }

  return age >= 0 ? age : null;
}

function ReadOnlyField({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  const isEmpty = value === '—';

  return (
    <div className='profile-readonly-field'>
      <div className='profile-readonly-field__label-row'>
        <span className='profile-readonly-field__label'>{label}</span>
        {hint && <span className='profile-readonly-field__hint'>{hint}</span>}
      </div>
      <strong className={isEmpty ? 'is-empty' : undefined}>{value}</strong>
    </div>
  );
}

export function ProfilePage() {
  const { user, updateUser, logout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<ProfileForm>(() => formFromUser(user));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const previewAge = useMemo(() => calculateAge(form.birth_date), [form.birth_date]);


  if (!user) {
    return null;
  }

  const displayName = user.full_name || 'Usuário iziline';
  const displayedAge = isEditing ? previewAge : user.age;

  function handleFieldChange(field: keyof ProfileForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setFormError('');
    setSuccessMessage('');
  }

  function validate(): boolean {
    const next: FieldErrors = {};

    if (!form.full_name.trim()) {
      next.full_name = 'Informe seu nome completo.';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleEdit() {
    setForm(formFromUser(user));
    setErrors({});
    setFormError('');
    setSuccessMessage('');
    setIsEditing(true);
  }

  function handleCancel() {
    setForm(formFromUser(user));
    setErrors({});
    setFormError('');
    setSuccessMessage('');
    setIsEditing(false);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isEditing || isSaving) {
      return;
    }

    setFormError('');
    setSuccessMessage('');
    if (!validate()) {
      return;
    }

    setIsSaving(true);
    try {
      const updatedUser = await updateProfile({
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        birth_date: form.birth_date || null,
      });
      updateUser(updatedUser);
      setForm(formFromUser(updatedUser));
      setIsEditing(false);
      setSuccessMessage('Dados atualizados.');
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors) {
        const fieldErrors = error.fieldErrors;
        setErrors({
          full_name: fieldErrors.full_name?.[0],
          phone: fieldErrors.phone?.[0],
          birth_date: fieldErrors.birth_date?.[0],
        });
      }
      setFormError(
        error instanceof ApiError
          ? error.message
          : 'Não foi possível salvar. Tente novamente.'
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className='profile-page'>
      <section className='profile-shell' aria-labelledby='profile-title'>
        <header className='profile-summary'>
          <div className='profile-summary__avatar' aria-hidden='true'>
            {userInitials(user)}
          </div>
          <div className='profile-summary__identity'>
            <h1 id='profile-title'>Perfil</h1>
            <strong>{displayName}</strong>
            <span>{user.email}</span>
          </div>
        </header>

        <form className='profile-panel' onSubmit={handleSubmit} noValidate>
          <div className='profile-panel__header'>
            <h2>Dados pessoais</h2>

            <div className='profile-actions'>
              {isEditing ? (
                <>
                  <button
                    type='button'
                    className='profile-button profile-button--secondary'
                    onClick={handleCancel}
                    disabled={isSaving}
                  >
                    <X size={18} aria-hidden='true' />
                    <span>Cancelar</span>
                  </button>
                  <button
                    type='submit'
                    className='profile-button profile-button--primary'
                    disabled={isSaving}
                  >
                    <Save size={18} aria-hidden='true' />
                    <span>{isSaving ? 'Salvando…' : 'Salvar'}</span>
                  </button>
                </>
              ) : (
                <button
                  type='button'
                  className='profile-button profile-button--primary'
                  onClick={handleEdit}
                >
                  <Pencil size={18} aria-hidden='true' />
                  <span>Editar perfil</span>
                </button>
              )}
            </div>
          </div>

          {formError && (
            <span className='profile-message profile-message--error' role='alert'>
              {formError}
            </span>
          )}

          {successMessage && !formError && (
            <span className='profile-message profile-message--success' role='status'>
              {successMessage}
            </span>
          )}

          <div className='profile-fields'>
            {isEditing ? (
              <>
                <FormField
                  id='profile-full-name'
                  label='Nome completo'
                  type='text'
                  autoComplete='name'
                  value={form.full_name}
                  error={errors.full_name}
                  onChange={(event) => handleFieldChange('full_name', event.target.value)}
                />

                <FormField
                  id='profile-phone'
                  label='Telefone'
                  type='tel'
                  inputMode='tel'
                  autoComplete='tel'
                  maxLength={20}
                  value={form.phone}
                  error={errors.phone}
                  onChange={(event) => handleFieldChange('phone', event.target.value)}
                />

                <FormField
                  id='profile-birth-date'
                  label='Data de nascimento'
                  type='date'
                  autoComplete='bday'
                  max={today}
                  value={form.birth_date}
                  error={errors.birth_date}
                  onChange={(event) => handleFieldChange('birth_date', event.target.value)}
                />
              </>
            ) : (
              <>
                <ReadOnlyField label='Nome completo' value={displayName} />
                <ReadOnlyField label='Telefone' value={user.phone || '—'} />
                <ReadOnlyField label='Data de nascimento' value={formatBirthDate(user.birth_date)} />
              </>
            )}

            <ReadOnlyField label='Idade' value={formatAge(displayedAge)} />
            <ReadOnlyField label='E-mail' value={user.email} hint='Não pode ser alterado' />
            <ReadOnlyField label='CPF' value={formatCpf(user.cpf)} hint='Não pode ser alterado' />
          </div>
        </form>

        <section className='profile-account' aria-labelledby='profile-account-title'>
          <h2 id='profile-account-title'>Conta</h2>
          <button
            type='button'
            className='profile-button profile-button--danger'
            onClick={logout}
          >
            <LogOut size={18} aria-hidden='true' />
            <span>Sair da conta</span>
          </button>
        </section>
      </section>
    </main>
  );
}

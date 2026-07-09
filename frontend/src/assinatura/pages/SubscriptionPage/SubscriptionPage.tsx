import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BadgeCheck,
  Barcode,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  QrCode,
  ShieldCheck,
} from "lucide-react";
import "./SubscriptionPage.css";

type PlanId = "monthly" | "quarterly" | "yearly";
type PaymentMethodId = "card" | "pix" | "boleto";

type PlanOption = {
  id: PlanId;
  title: string;
  description: string;
  monthlyPrice: number;
  billedEveryMonths: number;
  billingLabel: string;
  note: string;
};

type PaymentMethod = {
  id: PaymentMethodId;
  label: string;
  description: string;
  Icon: LucideIcon;
};

const plans: PlanOption[] = [
  {
    id: "monthly",
    title: "Mensal",
    description: "Flexível para testar a assinatura",
    monthlyPrice: 20,
    billedEveryMonths: 1,
    billingLabel: "Cobrado todo mês",
    note: "R$ 20,00 por mês",
  },
  {
    id: "quarterly",
    title: "Trimestral",
    description: "Boa opção para usuários frequentes",
    monthlyPrice: 18,
    billedEveryMonths: 3,
    billingLabel: "Cobrado a cada 3 meses",
    note: "R$ 54,00 por trimestre",
  },
  {
    id: "yearly",
    title: "Anual",
    description: "Menor valor mensal para quem viaja sempre",
    monthlyPrice: 15,
    billedEveryMonths: 12,
    billingLabel: "Cobrado uma vez por ano",
    note: "R$ 180,00 por ano",
  },
];

const paymentMethods: PaymentMethod[] = [
  {
    id: "card",
    label: "Cartão de crédito",
    description: "Confirmação imediata com cartão salvo",
    Icon: CreditCard,
  },
  {
    id: "pix",
    label: "Pix",
    description: "QR Code gerado para pagamento único",
    Icon: QrCode,
  },
  {
    id: "boleto",
    label: "Boleto",
    description: "Código de barras com compensação posterior",
    Icon: Barcode,
  },
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);

function getTotalCharge(plan: PlanOption): number {
  return plan.monthlyPrice * plan.billedEveryMonths;
}

function paymentMethodLabel(methodId: PaymentMethodId): string {
  return paymentMethods.find((method) => method.id === methodId)?.label ?? "";
}

export function SubscriptionPage() {
  const [selectedPlanId, setSelectedPlanId] = useState<PlanId>("quarterly");
  const [selectedPaymentId, setSelectedPaymentId] = useState<PaymentMethodId>("card");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Escolha a forma de pagamento e confirme sua assinatura.");

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === selectedPlanId) ?? plans[0],
    [selectedPlanId]
  );

  const totalCharge = getTotalCharge(selectedPlan);

  function handleConfirmSubscription() {
    setIsSubscribed(true);
    setStatusMessage(
      `Assinatura ${selectedPlan.title.toLowerCase()} ativada via ${paymentMethodLabel(
        selectedPaymentId
      )}.`
    );
  }

  function handleRenewSubscription() {
    setIsSubscribed(true);
    setStatusMessage("Renovação confirmada para o plano selecionado.");
  }

  function handleCancelSubscription() {
    setIsSubscribed(false);
    setStatusMessage("Assinatura cancelada.");
  }

  return (
    <section className="subscription-page" aria-labelledby="subscription-title">
      <div className="subscription-shell">
        <header className="subscription-header">
          <div>
            <p>Planos e gestão</p>
            <h1 id="subscription-title">Assinatura mensal Iziline</h1>
          </div>
          <span className={isSubscribed ? "subscription-status is-active" : "subscription-status"}>
            {isSubscribed ? "Assinatura ativa" : "Sem assinatura ativa"}
          </span>
        </header>

        <div className="subscription-layout">
          <div className="subscription-main">
            <section className="subscription-panel" aria-labelledby="plan-options-title">
              <div className="subscription-panel__header">
                <h2 id="plan-options-title">Escolha a recorrência</h2>
                <p>Assinantes ativos ficam isentos da taxa de serviço no rateio.</p>
              </div>

              <fieldset className="subscription-plan-list">
                <legend className="subscription-sr-only">Planos de assinatura</legend>
                {plans.map((plan) => (
                  <label
                    key={plan.id}
                    className={
                      selectedPlan.id === plan.id
                        ? "subscription-plan-card is-selected"
                        : "subscription-plan-card"
                    }
                  >
                    <input
                      type="radio"
                      name="subscription-plan"
                      value={plan.id}
                      checked={selectedPlan.id === plan.id}
                      onChange={() => setSelectedPlanId(plan.id)}
                    />
                    <span className="subscription-plan-card__copy">
                      <strong>{plan.title}</strong>
                      <span>{plan.description}</span>
                    </span>
                    <span className="subscription-plan-card__price">
                      <strong>{formatCurrency(plan.monthlyPrice)}</strong>
                      <span>/mês</span>
                      <small>{plan.billingLabel}</small>
                    </span>
                  </label>
                ))}
              </fieldset>
            </section>

            <section className="subscription-panel" aria-labelledby="payment-title">
              <div className="subscription-panel__header">
                <h2 id="payment-title">Pagamento</h2>
                <p>Selecione como deseja pagar sua assinatura.</p>
              </div>

              <div className="subscription-payment">
                <fieldset className="subscription-payment-methods">
                  <legend className="subscription-sr-only">Formas de pagamento</legend>
                  {paymentMethods.map(({ id, label, description, Icon }) => (
                    <label
                      key={id}
                      className={
                        selectedPaymentId === id
                          ? "subscription-payment-method is-selected"
                          : "subscription-payment-method"
                      }
                    >
                      <input
                        type="radio"
                        name="payment-method"
                        value={id}
                        checked={selectedPaymentId === id}
                        onChange={() => setSelectedPaymentId(id)}
                      />
                      <Icon size={20} aria-hidden="true" />
                      <span>
                        <strong>{label}</strong>
                        <small>{description}</small>
                      </span>
                    </label>
                  ))}
                </fieldset>

                <div className="subscription-payment-preview" aria-live="polite">
                  {selectedPaymentId === "card" && (
                    <div className="subscription-card-preview">
                      <span className="subscription-card-preview__brand" aria-hidden="true">
                        <span />
                        <span />
                      </span>
                      <strong>5488 8805 2261 2712</strong>
                      <span>14/28</span>
                      <span>•••</span>
                      <CheckCircle2 size={20} aria-hidden="true" />
                    </div>
                  )}

                  {selectedPaymentId === "pix" && (
                    <div className="subscription-payment-box">
                      <QrCode size={30} aria-hidden="true" />
                      <div>
                        <strong>Pix copia e cola gerado</strong>
                        <span>Pagamento reconhecido automaticamente.</span>
                      </div>
                    </div>
                  )}

                  {selectedPaymentId === "boleto" && (
                    <div className="subscription-payment-box">
                      <Barcode size={34} aria-hidden="true" />
                      <div>
                        <strong>Boleto pronto para emissão</strong>
                        <span>Código disponível para confirmar o fluxo.</span>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className="subscription-primary-action"
                  onClick={handleConfirmSubscription}
                >
                  Confirmar assinatura
                </button>
              </div>
            </section>
          </div>

          <aside className="subscription-summary" aria-labelledby="summary-title">
            <div className="subscription-summary__block">
              <h2 id="summary-title">Plano selecionado</h2>
              <strong>{selectedPlan.title}</strong>
              <span>{selectedPlan.note}</span>
            </div>

            <dl className="subscription-summary__list">
              <div>
                <dt>Valor mensal</dt>
                <dd>{formatCurrency(selectedPlan.monthlyPrice)}</dd>
              </div>
              <div>
                <dt>Total cobrado</dt>
                <dd>{formatCurrency(totalCharge)}</dd>
              </div>
              <div>
                <dt>Taxa de serviço</dt>
                <dd>Isenta com assinatura ativa</dd>
              </div>
            </dl>

            <div className="subscription-management">
              <div className="subscription-management__title">
                <ShieldCheck size={20} aria-hidden="true" />
                <h2>Gestão da assinatura</h2>
              </div>

              <div className="subscription-management__state">
                <BadgeCheck size={20} aria-hidden="true" />
                <span>{isSubscribed ? "Plano ativo no perfil" : "Ativação pendente"}</span>
              </div>

              <div className="subscription-management__state">
                <CalendarDays size={20} aria-hidden="true" />
                <span>
                  {isSubscribed
                    ? `${selectedPlan.billingLabel}. Renovação disponível.`
                    : "Escolha um plano para liberar renovação e cancelamento."}
                </span>
              </div>

              <div className="subscription-management__actions">
                <button type="button" onClick={handleRenewSubscription}>
                  Renovar agora
                </button>
                <button type="button" className="is-danger" onClick={handleCancelSubscription}>
                  Cancelar plano
                </button>
              </div>
            </div>

            <p className="subscription-feedback" role="status">
              {statusMessage}
            </p>
          </aside>
        </div>
      </div>
    </section>
  );
}

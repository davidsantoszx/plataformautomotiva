import { useState } from "react";
import { CheckCircle2, Lock } from "lucide-react";
import Modal from "./Modal";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { subscribePro } from "../services/api";
import { PRICING, formatPrice } from "../utils/plans.js";

const PERIODS = {
  MONTHLY: { label: "Pro mensal", price: PRICING.monthly, every: "por mês" },
  YEARLY: { label: "Pro anual", price: PRICING.yearly, every: "por ano" },
};

function formatCardNumber(value) {
  return value
    .replace(/\D/g, "")
    .slice(0, 19)
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

function formatExpiry(value) {
  const digits = value.replace(/\D/g, "").slice(0, 4);

  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
}

function formatDate(value) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

// Conferência rápida antes de enviar; quem vale mesmo é o servidor.
function checkCard({ number, name, expiry, cvc }) {
  const digits = number.replace(/\D/g, "");

  if (digits.length < 13) return "Confira o número do cartão.";
  if (name.trim().length < 2) return "Informe o nome impresso no cartão.";

  const match = /^(\d{2})\/(\d{2})$/.exec(expiry);
  if (!match) return "Informe a validade no formato MM/AA.";

  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  const now = new Date();

  if (
    month < 1 ||
    month > 12 ||
    year < now.getFullYear() ||
    (year === now.getFullYear() && month < now.getMonth() + 1)
  ) {
    return "Cartão vencido ou validade inválida.";
  }

  if (!/^\d{3,4}$/.test(cvc)) return "Confira o código de segurança.";

  return "";
}

export default function CheckoutModal({ period, onClose, onSuccess }) {
  const { token } = useAuth();
  const { showToast } = useToast();

  const plan = PERIODS[period];

  const [card, setCard] = useState({
    number: "",
    name: "",
    expiry: "",
    cvc: "",
  });
  const [paying, setPaying] = useState(false);
  const [done, setDone] = useState(null); // assinatura criada

  function update(field, value) {
    setCard((current) => ({ ...current, [field]: value }));
  }

  async function handlePay(event) {
    event.preventDefault();

    // os erros só aparecem ao tentar pagar
    const problem = checkCard(card);

    if (problem) {
      showToast(problem);
      return;
    }

    try {
      setPaying(true);

      // pequena pausa só para o "processando" ser visível no pagamento simulado
      const [subscription] = await Promise.all([
        subscribePro(token, period, card),
        new Promise((resolve) => setTimeout(resolve, 1200)),
      ]);

      setDone(subscription);

      // atualizar a tela é secundário: o pagamento já foi feito
      onSuccess().catch(() => {});
    } catch (err) {
      showToast(err.message || "Não foi possível concluir o pagamento.");
    } finally {
      setPaying(false);
    }
  }

  if (done) {
    return (
      <Modal title="Assinatura ativada" onClose={onClose} className="modal-checkout">
        <div className="checkout-done">
          <CheckCircle2 size={44} />
          <h4>Bem-vindo ao Pro!</h4>
          <p>
            Seu plano está ativo
            {done.currentPeriodEnd
              ? ` até ${formatDate(done.currentPeriodEnd)}`
              : ""}
            . Todos os recursos Pro já estão liberados.
          </p>

          <button className="primary-button" type="button" onClick={onClose}>
            Continuar
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      title="Assinar o Pro"
      onClose={paying ? () => {} : onClose}
      className="modal-checkout"
    >
      <form className="checkout" onSubmit={handlePay} noValidate>
        <div className="checkout-demo">
          Ambiente de demonstração: nenhum valor é cobrado. Use o cartão{" "}
          <strong>4242 4242 4242 4242</strong>, qualquer validade futura e
          qualquer código. Final <strong>0002</strong> simula recusa.
        </div>

        <div className="checkout-summary">
          <div>
            <strong>{plan.label}</strong>
            <span>Renovação automática. Cancele quando quiser.</span>
          </div>

          <div className="checkout-price">
            <strong>{formatPrice(plan.price)}</strong>
            <span>{plan.every}</span>
          </div>
        </div>

        <div className="checkout-card" aria-hidden="true">
          <span className="checkout-card-number">
            {card.number || "•••• •••• •••• ••••"}
          </span>

          <div>
            <span>{card.name.trim() || "NOME NO CARTÃO"}</span>
            <span>{card.expiry || "MM/AA"}</span>
          </div>
        </div>

        <label className="checkout-field">
          <span>Número do cartão</span>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="cc-number"
            placeholder="0000 0000 0000 0000"
            value={card.number}
            onChange={(e) => update("number", formatCardNumber(e.target.value))}
            disabled={paying}
          />
        </label>

        <label className="checkout-field">
          <span>Nome impresso no cartão</span>
          <input
            type="text"
            autoComplete="cc-name"
            placeholder="Como está no cartão"
            value={card.name}
            onChange={(e) => update("name", e.target.value)}
            disabled={paying}
          />
        </label>

        <div className="checkout-row">
          <label className="checkout-field">
            <span>Validade</span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="cc-exp"
              placeholder="MM/AA"
              value={card.expiry}
              onChange={(e) => update("expiry", formatExpiry(e.target.value))}
              disabled={paying}
            />
          </label>

          <label className="checkout-field">
            <span>Código (CVV)</span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="cc-csc"
              placeholder="123"
              maxLength={4}
              value={card.cvc}
              onChange={(e) =>
                update("cvc", e.target.value.replace(/\D/g, "").slice(0, 4))
              }
              disabled={paying}
            />
          </label>
        </div>

        <button className="primary-button checkout-pay" type="submit" disabled={paying}>
          {paying ? (
            "Processando pagamento..."
          ) : (
            <>
              <Lock size={14} /> Pagar {formatPrice(plan.price)}
            </>
          )}
        </button>
      </form>
    </Modal>
  );
}

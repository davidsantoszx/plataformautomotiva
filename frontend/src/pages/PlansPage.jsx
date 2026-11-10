import { useEffect, useState } from "react";
import { Check, Sparkles, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { getProjects } from "../services/api";
import {
  COMING_SOON_PRO,
  FREE_PROJECT_LIMIT,
  PLAN_FEATURES,
  PRICING,
  formatPrice,
  yearlySavings,
} from "../utils/plans";
import "../styles/PlansPage.css";

function formatDate(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function FeatureValue({ value }) {
  if (value === true) return <Check size={16} className="plan-icon-yes" />;
  if (value === false) return <X size={16} className="plan-icon-no" />;
  return <Check size={16} className="plan-icon-yes" />;
}

function FeatureList({ plan }) {
  return (
    <ul className="plan-features">
      {PLAN_FEATURES.map((feature) => {
        const value = feature[plan];
        const included = value !== false;

        return (
          <li
            key={feature.id}
            className={included ? "" : "plan-feature-off"}
          >
            <FeatureValue value={value} />

            <div className="plan-feature-text">
              <strong>{feature.label}</strong>
              {typeof value === "string" && <span>{value}</span>}
            </div>

            {plan === "pro" && feature.soon && (
              <em className="plan-soon">em breve</em>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default function PlansPage() {
  const { token, user } = useAuth();
  const { showToast } = useToast();

  const [billing, setBilling] = useState("yearly");
  const [projectCount, setProjectCount] = useState(null);

  const isPro = Boolean(user?.isPro);
  const expiredPro = user?.plan === "PRO" && !isPro;
  const expiresAt = formatDate(user?.planExpiresAt);
  const savings = yearlySavings();

  // o contador "X de 4 projetos" só faz sentido no Free
  useEffect(() => {
    if (isPro) return undefined;

    let cancelled = false;

    getProjects(token)
      .then((data) => {
        if (!cancelled) setProjectCount((data.projects || []).length);
      })
      .catch(() => {
        // sem o contador a página continua funcionando
      });

    return () => {
      cancelled = true;
    };
  }, [token, isPro]);

  function handleSubscribe() {
    // o pagamento entra na etapa de assinatura
    showToast("O pagamento será liberado em breve.");
  }

  return (
    <section className="dashboard-section plans-page">
      <div className="section-heading">
        <span className="section-eyebrow">PLANOS</span>
        <h2>Escolha o seu plano</h2>
        <p>
          Comece grátis com projetos reais. Vá para o Pro quando quiser liberdade
          total.
        </p>
      </div>

      <div className={`plan-status ${isPro ? "pro" : ""}`}>
        <Sparkles size={18} />

        {isPro && (
          <p>
            <strong>Plano Pro ativo.</strong>{" "}
            {expiresAt
              ? `Válido até ${expiresAt}.`
              : "Sem data de vencimento."}
          </p>
        )}

        {expiredPro && (
          <p>
            <strong>Seu Pro venceu{expiresAt ? ` em ${expiresAt}` : ""}.</strong>{" "}
            Seus projetos livres ficam bloqueados até você renovar.
          </p>
        )}

        {!isPro && !expiredPro && (
          <p>
            <strong>Seu plano atual: Free.</strong>{" "}
            {projectCount !== null
              ? `${projectCount} de ${FREE_PROJECT_LIMIT} projetos usados.`
              : ""}
          </p>
        )}
      </div>

      <div className="plans-toggle" role="group" aria-label="Periodicidade">
        <button
          type="button"
          className={billing === "monthly" ? "active" : ""}
          onClick={() => setBilling("monthly")}
        >
          Mensal
        </button>

        <button
          type="button"
          className={billing === "yearly" ? "active" : ""}
          onClick={() => setBilling("yearly")}
        >
          Anual
          <span className="plans-toggle-chip">-{savings.percent}%</span>
        </button>
      </div>

      <div className="plans-grid">
        <article className="plan-card">
          <header>
            <h3>Free</h3>
            <div className="plan-price">
              <strong>{formatPrice(0)}</strong>
              <span>para sempre</span>
            </div>
            <p className="plan-tagline">
              Monte projetos reais com peças compatíveis.
            </p>
          </header>

          <FeatureList plan="free" />

          <button className="secondary-button plan-cta" type="button" disabled>
            {!isPro && !expiredPro ? "Seu plano atual" : "Plano gratuito"}
          </button>
        </article>

        <article className="plan-card plan-card-pro">
          <span className="plan-ribbon">Mais completo</span>

          <header>
            <h3>Pro</h3>

            <div className="plan-price">
              <strong>
                {formatPrice(
                  billing === "yearly" ? PRICING.yearly : PRICING.monthly,
                )}
              </strong>
              <span>{billing === "yearly" ? "por ano" : "por mês"}</span>
            </div>

            <p className="plan-tagline">
              {billing === "yearly"
                ? `Equivale a ${formatPrice(savings.perMonth)} por mês. Você economiza ${formatPrice(savings.saved)}.`
                : "Cancele quando quiser."}
            </p>
          </header>

          <FeatureList plan="pro" />

          <button
            className="primary-button plan-cta"
            type="button"
            onClick={handleSubscribe}
            disabled={isPro}
          >
            {isPro ? "Seu plano atual" : expiredPro ? "Renovar o Pro" : "Assinar o Pro"}
          </button>
        </article>
      </div>

      <div className="plans-soon">
        <h3>Também vem por aí no Pro</h3>

        <ul>
          {COMING_SOON_PRO.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

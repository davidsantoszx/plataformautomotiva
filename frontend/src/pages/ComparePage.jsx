import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowLeftRight } from "lucide-react";
import CarPreview3D from "../components/CarPreview3D";
import { useAuth } from "../context/AuthContext";
import { compareProjects } from "../services/api";
import { build3DScene } from "../utils/build3DScene";
import {
  paintColorName,
  paintFinishLabel,
  paintFromProject,
} from "../utils/paint";
import { vehicleLabel } from "../utils/vehicleLabel";
import "../styles/ComparePage.css";

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

// Junta o que o servidor mandou de um projeto em dados prontos para exibir
function summarize(side) {
  const { project, parts } = side;

  const details = {};
  const items = new Map();
  let total = 0;
  let units = 0;

  (parts || []).forEach((item) => {
    if (!item.part) return;

    const quantity = Number(item.quantity ?? 1);
    const price = Number(item.priceAtTime ?? item.part.estimatedPrice ?? 0);

    details[item.partId] = item.part;
    items.set(item.partId, { name: item.part.name, quantity, price });
    total += price * quantity;
    units += quantity;
  });

  const paint = paintFromProject(project);

  return {
    project,
    details,
    items,
    total,
    units,
    paint,
    vehicleText:
      vehicleLabel(project.vehicle) || `Veículo #${project.vehicleId}`,
  };
}

function CompareCar({ data, tag }) {
  const scene = useMemo(
    () => build3DScene(data.project.vehicle || null, data.details),
    [data.project.vehicle, data.details],
  );

  const paint = useMemo(
    () => paintFromProject(data.project),
    [data.project],
  );

  return (
    <div className={`compare-car side-${tag.toLowerCase()}`}>
      <div className="compare-car-view">
        <span className="compare-tag">{tag}</span>
        <CarPreview3D
          modelUrl={scene.modelUrl}
          parts={scene.parts}
          paint={paint}
        />
      </div>

      <Link to={`/projetos/${data.project.id}`} className="compare-car-name">
        <strong>{data.project.name}</strong>
        <span>{data.vehicleText}</span>
      </Link>
    </div>
  );
}

function PaintCell({ data }) {
  if (!data.paint) return <>Original</>;

  return (
    <span className="compare-paint">
      <i style={{ background: data.paint.color }} />
      {paintColorName(data.paint.color)} · {paintFinishLabel(data.paint.finish)}
    </span>
  );
}

function PartList({ items }) {
  return (
    <ul className="compare-parts">
      {items.map(([id, item]) => (
        <li key={id}>
          <span>
            {item.name}
            {item.quantity > 1 && <small> ×{item.quantity}</small>}
          </span>
          <em>{formatCurrency(item.price * item.quantity)}</em>
        </li>
      ))}
    </ul>
  );
}

export default function ComparePage() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const aId = params.get("a");
  const bId = params.get("b");
  const isPro = Boolean(user?.isPro);

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [swapped, setSwapped] = useState(false);

  useEffect(() => {
    // sem Pro ou sem dois projetos escolhidos: nada para buscar
    if (!isPro || !aId || !bId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");
        const data = await compareProjects(token, aId, bId);
        if (!cancelled) setResult(data);
      } catch (err) {
        if (!cancelled) setError(err.message || "Erro ao comparar projetos.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [token, aId, bId, isPro]);

  const sides = useMemo(() => {
    if (!result) return null;

    const a = summarize(result.a);
    const b = summarize(result.b);

    return swapped ? [b, a] : [a, b];
  }, [result, swapped]);

  const diff = useMemo(() => {
    if (!sides) return null;

    const [left, right] = sides;
    const onlyLeft = [];
    const onlyRight = [];
    const common = [];

    left.items.forEach((item, id) => {
      const other = right.items.get(id);
      if (other) common.push([id, item, other]);
      else onlyLeft.push([id, item]);
    });

    right.items.forEach((item, id) => {
      if (!left.items.has(id)) onlyRight.push([id, item]);
    });

    return { onlyLeft, onlyRight, common };
  }, [sides]);

  const backTo = aId ? `/projetos/${aId}` : "/projetos";

  const back = (
    <Link to={backTo} className="back-link">
      <ArrowLeft size={15} /> Voltar ao projeto
    </Link>
  );

  if (!isPro) {
    return (
      <section className="dashboard-section compare-page">
        {back}

        <div className="compare-message">
          <h1>Comparar projetos</h1>
          <p>
            Veja dois projetos lado a lado — visual, pintura, peças e valor. Um
            recurso do plano Pro.
          </p>
          <button
            className="primary-button"
            type="button"
            onClick={() => navigate("/planos")}
          >
            Conhecer o Pro
          </button>
        </div>
      </section>
    );
  }

  if (!aId || !bId) {
    return (
      <section className="dashboard-section compare-page">
        {back}
        <div className="compare-message">
          <h1>Comparar projetos</h1>
          <p>Abra um projeto e escolha com qual outro comparar.</p>
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="dashboard-section compare-page">
        {back}
        <p className="compare-status">Carregando comparação...</p>
      </section>
    );
  }

  if (error || !sides) {
    return (
      <section className="dashboard-section compare-page">
        {back}
        <p className="compare-status">{error || "Nada para comparar."}</p>
      </section>
    );
  }

  const [left, right] = sides;
  const delta = right.total - left.total;
  const cheaper = left.total <= right.total ? 0 : 1;

  // "key" decide se os dois lados são iguais; "render" é o que aparece
  const rows = [
    {
      label: "Veículo",
      key: (d) => d.vehicleText,
      render: (d) => d.vehicleText,
    },
    {
      label: "Modo",
      key: (d) => d.project.mode,
      render: (d) => (d.project.mode === "REAL" ? "Real" : "Livre"),
    },
    {
      label: "Pintura",
      key: (d) =>
        d.paint ? `${d.paint.color}${d.paint.finish}` : "original",
      render: (d) => <PaintCell data={d} />,
    },
    {
      label: "Peças",
      key: (d) => d.units,
      render: (d) => `${d.units} ${d.units === 1 ? "unidade" : "unidades"}`,
    },
  ];

  const noDifference =
    diff.onlyLeft.length === 0 && diff.onlyRight.length === 0;

  const panels = [
    { data: left, tag: "A", items: diff.onlyLeft },
    { data: right, tag: "B", items: diff.onlyRight },
  ];

  return (
    <section className="dashboard-section compare-page">
      {back}

      <header className="compare-header">
        <div>
          <span className="compare-eyebrow">Análise lado a lado</span>
          <h1>Comparar projetos</h1>
        </div>

        <button
          type="button"
          className="compare-swap"
          onClick={() => setSwapped((value) => !value)}
        >
          <ArrowLeftRight size={15} />
          <span>Trocar lados</span>
        </button>
      </header>

      <div className="compare-cars">
        <CompareCar data={left} tag="A" />
        <CompareCar data={right} tag="B" />
      </div>

      <div className="compare-table">
        {rows.map((row) => {
          const differs = row.key(left) !== row.key(right);

          return (
            <div
              className={`compare-row ${differs ? "differs" : "same"}`}
              key={row.label}
            >
              <span className="compare-label">{row.label}</span>
              <span>{row.render(left)}</span>
              <span>{row.render(right)}</span>
            </div>
          );
        })}

        <div className="compare-row compare-total">
          <span className="compare-label">Total</span>

          {[left, right].map((data, index) => (
            <span
              key={data.project.id}
              className={delta !== 0 && cheaper === index ? "best" : ""}
            >
              {formatCurrency(data.total)}
              {delta !== 0 && cheaper === index && <em>menor valor</em>}
            </span>
          ))}
        </div>

        <div className="compare-delta">
          <span className="compare-label">Diferença</span>
          <strong>
            {delta === 0
              ? "Os dois projetos custam o mesmo"
              : `${formatCurrency(Math.abs(delta))} a menos em "${
                  sides[cheaper].project.name
                }"`}
          </strong>
        </div>
      </div>

      <h2 className="compare-subtitle">Diferença nas peças</h2>

      {noDifference ? (
        <p className="compare-status">
          Os dois projetos usam as mesmas peças.
        </p>
      ) : (
        <div className="compare-diff">
          {panels.map(({ data, tag, items }) => (
            <div
              className={`compare-panel side-${tag.toLowerCase()}`}
              key={tag}
            >
              <div className="compare-panel-head">
                <span className="compare-chip">{tag}</span>
                <strong>Só em {data.project.name}</strong>
                <span className="compare-count">{items.length}</span>
              </div>

              {items.length > 0 ? (
                <PartList items={items} />
              ) : (
                <p className="compare-none">Nenhuma peça exclusiva</p>
              )}
            </div>
          ))}
        </div>
      )}

      {diff.common.length > 0 && (
        <details className="compare-common">
          <summary>Peças em comum ({diff.common.length})</summary>

          <ul className="compare-parts">
            {diff.common.map(([id, item, other]) => (
              <li key={id}>
                <span>{item.name}</span>
                <em>
                  {item.quantity === other.quantity
                    ? `×${item.quantity}`
                    : `×${item.quantity} / ×${other.quantity}`}
                </em>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

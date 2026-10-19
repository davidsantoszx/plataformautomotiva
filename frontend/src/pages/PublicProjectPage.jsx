import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Copy } from "lucide-react";

import CarPreview3D from "../components/CarPreview3D";
import { useAuth } from "../context/AuthContext";
import { getPublicProject } from "../services/api";
import { build3DScene } from "../utils/build3DScene";
import { vehicleLabel } from "../utils/vehicleLabel";

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(value) {
  if (!value) return "";

  const normalized = String(value)
    .replace(" ", "T")
    .replace(/(\.\d{3})\d+/, "$1")
    .replace(/([+-]\d{2})$/, "$1:00");

  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default function PublicProjectPage({ shareToken }) {
  const { token } = useAuth();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const result = await getPublicProject(shareToken);
        if (cancelled) return;

        setData(result);
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Projeto público não encontrado.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [shareToken]);

  // o backend já devolve o veículo (id, model3dUrl, marca, modelo...)
  const vehicle = data?.project?.vehicle || null;

  const partDetails = useMemo(() => {
    const map = {};
    (data?.parts || []).forEach((item) => {
      if (item.part) map[item.partId] = item.part;
    });
    return map;
  }, [data]);

  const scene = useMemo(
    () => build3DScene(vehicle, partDetails),
    [vehicle, partDetails],
  );

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* sem permissão para copiar: ignora */
    }
  }

  const header = (
    <header className="public-header">
      <span className="app-navbar-brand">PLATAFORMA AUTOMOTIVA</span>

      <Link
        to={token ? "/feed" : "/login"}
        className="secondary-button public-header-link"
      >
        {token ? "Ver feed" : "Entrar"}
      </Link>
    </header>
  );

  if (loading) {
    return (
      <div className="dashboard-page">
        {header}
        <section className="dashboard-section">
          <div className="empty-state">
            <p>Carregando projeto...</p>
          </div>
        </section>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="dashboard-page">
        {header}
        <section className="dashboard-section">
          <div className="empty-state">
            <h3>Projeto não encontrado</h3>
            <p>{error || "Este projeto não está disponível publicamente."}</p>
          </div>
        </section>
      </div>
    );
  }

  const { project, parts } = data;

  const total = parts.reduce(
    (sum, item) =>
      sum + Number(item.priceAtTime || 0) * Number(item.quantity || 0),
    0,
  );

  const vehicleName =
    vehicleLabel(vehicle) || `Veículo #${project.vehicleId}`;

  const authorName =
    project.author?.name?.trim() || project.author?.username || "usuário";

  const published = formatDate(project.publishedAt);

  return (
    <div className="dashboard-page">
      {header}

      <section className="dashboard-section project-page">
        <header className="project-page-header">
          <div className="project-page-title">
            <h1>{project.name}</h1>

            <div className="project-page-badges">
              <span
                className={`project-mode-badge ${project.mode.toLowerCase()}`}
              >
                {project.mode === "REAL" ? "Real" : "Livre"}
              </span>

              <span className="project-vehicle">{vehicleName}</span>

              <span className="project-date">
                por {authorName}
                {published && ` · ${published}`}
              </span>
            </div>
          </div>

          <button
            className="secondary-button"
            type="button"
            onClick={handleCopy}
          >
            <Copy size={14} /> {copied ? "Link copiado" : "Copiar link"}
          </button>
        </header>

        <div className="project-overview">
          <div className="project-preview-card public-viewer">
            <CarPreview3D
              modelUrl={scene.modelUrl}
              parts={scene.parts}
              loading={!vehicle}
              zoomable
            />

            <div className="project-preview-caption">
              <span>VEÍCULO</span>
              <strong>
                {vehicleLabel(vehicle, { withVersion: true }) || vehicleName}
              </strong>
            </div>
          </div>

          <aside className="project-side">
            <div className="side-card">
              <span className="side-card-label">TOTAL ESTIMADO</span>
              <strong className="side-total">{formatCurrency(total)}</strong>
              <span className="side-card-sub">
                {parts.length} peça{parts.length !== 1 ? "s" : ""}
              </span>
            </div>

            {project.description && (
              <div className="side-card">
                <span className="side-card-label">SOBRE O PROJETO</span>
                <p className="public-description">{project.description}</p>
              </div>
            )}
          </aside>
        </div>

        <div className="parts-project-list">
          <div className="parts-project-heading">
            <h3>Peças do projeto</h3>
            <span>
              {parts.length} item{parts.length !== 1 ? "s" : ""}
            </span>
          </div>

          {parts.length === 0 ? (
            <div className="empty-state parts-empty">
              <p>Nenhuma peça adicionada.</p>
            </div>
          ) : (
            parts.map((item) => {
              const quantity = Number(item.quantity || 1);
              const unitPrice = Number(item.priceAtTime || 0);

              return (
                <article
                  className="project-part-row public-part-row"
                  key={item.id}
                >
                  <div className="project-part-info">
                    <h4>{item.part?.name || `Peça #${item.partId}`}</h4>
                    {item.part?.brand && <span>{item.part.brand}</span>}
                  </div>

                  <div className="project-part-price">
                    <span>
                      {quantity} × {formatCurrency(unitPrice)}
                    </span>
                    <strong>{formatCurrency(unitPrice * quantity)}</strong>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}

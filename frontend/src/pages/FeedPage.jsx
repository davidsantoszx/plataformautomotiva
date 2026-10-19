import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CarFront } from "lucide-react";
import { getFeed, assetUrl } from "../services/api";

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(value) {
  if (!value) return "";

  // "2026-10-18 10:34:46.192495-03" -> "2026-10-18T10:34:46.192-03:00"
  const normalized = String(value)
    .replace(" ", "T")
    .replace(/(\.\d{3})\d+/, "$1")
    .replace(/([+-]\d{2})$/, "$1:00");

  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function vehicleLabel(vehicle) {
  if (!vehicle) return "";

  return [
    vehicle.model?.brand?.name,
    vehicle.model?.name,
    vehicle.year,
  ]
    .filter(Boolean)
    .join(" ");
}

export default function FeedPage() {
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  async function load(nextPage) {
    try {
      nextPage === 1 ? setLoading(true) : setLoadingMore(true);
      setError("");

      const data = await getFeed({ page: nextPage });

      setProjects((current) =>
        nextPage === 1 ? data.projects || [] : [...current, ...(data.projects || [])],
      );
      setPage(data.page || nextPage);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      setError(err.message || "Não foi possível carregar o feed.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    load(1);
  }, []);

  return (
    <section className="dashboard-section">
      <div className="section-heading">
        <span className="section-eyebrow">COMUNIDADE</span>
        <h2>Feed</h2>
        <p>Projetos publicados pela comunidade.</p>
      </div>

      {loading && (
        <div className="project-grid">
          {[0, 1, 2].map((item) => (
            <div className="project-card project-card-skeleton" key={item}>
              <div className="skeleton-block skeleton-preview" />
              <div className="skeleton-block skeleton-line" />
              <div className="skeleton-block skeleton-line short" />
            </div>
          ))}
        </div>
      )}

      {!loading && !error && projects.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">
            <CarFront size={20} />
          </div>
          <h3>Nada por aqui ainda</h3>
          <p>Seja o primeiro a publicar um projeto.</p>
        </div>
      )}

      {!loading && projects.length > 0 && (
        <div className="project-grid">
          {projects.map((project, index) => (
            <article
              className="project-card"
              key={project.id}
              role="link"
              tabIndex={0}
              style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
              onClick={() => navigate(`/p/${project.shareToken}`)}
              onKeyDown={(event) => {
                if (event.key === "Enter") navigate(`/p/${project.shareToken}`);
              }}
            >
              <div className="project-card-preview">
                {project.coverUrl ? (
                  <img src={assetUrl(project.coverUrl)} alt={project.name} />
                ) : (
                  <CarFront size={34} />
                )}
              </div>

              <div className="project-card-body">
                <h3>{project.name}</h3>

                <div className="project-card-meta">
                  <span
                    className={`project-mode-badge ${project.mode.toLowerCase()}`}
                  >
                    {project.mode === "REAL" ? "Real" : "Livre"}
                  </span>

                  <span className="project-vehicle">
                    {vehicleLabel(project.vehicle)}
                  </span>
                </div>

                {project.description && (
                  <p className="feed-description">{project.description}</p>
                )}

                <div className="feed-stats">
                  <span>
                    {project.partsCount} peça{project.partsCount !== 1 ? "s" : ""}
                  </span>
                  <strong>{formatCurrency(project.total)}</strong>
                </div>

                <div className="project-card-footer">
                  <span className="project-date">
                    por {project.author?.name || project.author?.username || "usuário"}
                    {project.publishedAt && ` · ${formatDate(project.publishedAt)}`}
                  </span>
                  <span className="project-open">Ver →</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {!loading && page < totalPages && (
        <div className="feed-more">
          <button
            className="secondary-button"
            type="button"
            onClick={() => load(page + 1)}
            disabled={loadingMore}
          >
            {loadingMore ? "Carregando..." : "Carregar mais"}
          </button>
        </div>
      )}

      {error && <p className="message message-error">{error}</p>}
    </section>
  );
}
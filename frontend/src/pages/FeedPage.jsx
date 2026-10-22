import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CarFront, Heart } from "lucide-react";
import { useGlobalLoading } from "../context/LoadingContext";
import { useAuth } from "../context/AuthContext";
import { getFeed, assetUrl } from "../services/api";
import {
  getLikedProjectIds,
  likeProject,
  unlikeProject,
} from "../services/likes";

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

  return [vehicle.model?.brand?.name, vehicle.model?.name, vehicle.year]
    .filter(Boolean)
    .join(" ");
}

export default function FeedPage() {
  const navigate = useNavigate();
  const { token } = useAuth();

  const [projects, setProjects] = useState([]);
  const [likedIds, setLikedIds] = useState(() => new Set());
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  useGlobalLoading(loading);

  // projetos com uma requisição de curtida em andamento (evita clique duplo)
  const pendingRef = useRef(new Set());

  async function load(nextPage) {
    try {
      nextPage === 1 ? setLoading(true) : setLoadingMore(true);
      setError("");

      const [data, liked] = await Promise.all([
        getFeed({ page: nextPage }),
        // a lista de curtidas vem inteira, então basta buscar na primeira página;
        // se falhar, o feed continua funcionando só sem os corações pintados
        nextPage === 1
          ? getLikedProjectIds(token).catch(() => null)
          : Promise.resolve(null),
      ]);

      if (liked) setLikedIds(new Set(liked));

      setProjects((current) =>
        nextPage === 1
          ? data.projects || []
          : [...current, ...(data.projects || [])],
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyLike(projectId, liked, likesCount) {
    setLikedIds((current) => {
      const next = new Set(current);
      if (liked) next.add(projectId);
      else next.delete(projectId);
      return next;
    });

    setProjects((current) =>
      current.map((project) =>
        project.id === projectId ? { ...project, likesCount } : project,
      ),
    );
  }

  async function handleToggleLike(project) {
    if (pendingRef.current.has(project.id)) return;
    pendingRef.current.add(project.id);

    const wasLiked = likedIds.has(project.id);
    const previousCount = Number(project.likesCount || 0);

    // atualiza na hora; se a API falhar, volta ao estado anterior
    applyLike(
      project.id,
      !wasLiked,
      Math.max(0, previousCount + (wasLiked ? -1 : 1)),
    );

    try {
      const result = wasLiked
        ? await unlikeProject(token, project.id)
        : await likeProject(token, project.id);

      applyLike(project.id, result.liked, result.likesCount);
    } catch (err) {
      applyLike(project.id, wasLiked, previousCount);
      setError(err.message || "Não foi possível curtir o projeto.");
    } finally {
      pendingRef.current.delete(project.id);
    }
  }

  const openProject = (project) => navigate(`/p/${project.shareToken}`);

  return (
    <section className="dashboard-section feed-page">
      <div className="feed-column">
        <div className="section-heading">
          <span className="section-eyebrow">COMUNIDADE</span>
          <h2>Feed</h2>
          <p>Projetos publicados pela comunidade.</p>
        </div>

        {loading && (
          <div className="feed-list">
            {[0, 1].map((item) => (
              <div className="feed-post" key={item}>
                <div className="feed-post-header">
                  <div className="skeleton-block feed-skeleton-avatar" />
                  <div className="skeleton-block feed-skeleton-line" />
                </div>
                <div className="skeleton-block feed-skeleton-media" />
                <div className="feed-post-body">
                  <div className="skeleton-block feed-skeleton-line" />
                  <div className="skeleton-block feed-skeleton-line short" />
                </div>
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
          <div className="feed-list">
            {projects.map((project) => {
              const authorName =
                project.author?.name?.trim() ||
                project.author?.username ||
                "usuário";

              const liked = likedIds.has(project.id);
              const likesCount = Number(project.likesCount || 0);
              const published = formatDate(project.publishedAt);

              return (
                <article className="feed-post" key={project.id}>
                  <header className="feed-post-header">
                    <div className="feed-post-avatar" aria-hidden="true">
                      {authorName.charAt(0).toUpperCase()}
                    </div>

                    <div className="feed-post-author">
                      <strong>{authorName}</strong>
                      {published && <span>{published}</span>}
                    </div>
                  </header>

                  <button
                    type="button"
                    className="feed-post-media"
                    onClick={() => openProject(project)}
                    aria-label={`Abrir ${project.name}`}
                  >
                    {project.coverUrl ? (
                      <img
                        src={assetUrl(project.coverUrl)}
                        alt={project.name}
                        loading="lazy"
                      />
                    ) : (
                      <CarFront size={44} />
                    )}
                  </button>

                  <div className="feed-post-actions">
                    <button
                      type="button"
                      className={`feed-like-button ${liked ? "liked" : ""}`}
                      onClick={() => handleToggleLike(project)}
                      aria-pressed={liked}
                      aria-label={liked ? "Descurtir" : "Curtir"}
                    >
                      <Heart
                        size={22}
                        fill={liked ? "currentColor" : "none"}
                      />
                      <span>{likesCount}</span>
                    </button>
                  </div>

                  <div className="feed-post-body">
                    <h3>{project.name}</h3>

                    <div className="feed-post-meta">
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
                      <p className="feed-post-description">
                        {project.description}
                      </p>
                    )}

                    <div className="feed-post-footer">
                      <span className="feed-post-stats">
                        {project.partsCount} peça
                        {project.partsCount !== 1 ? "s" : ""} ·{" "}
                        <strong>{formatCurrency(project.total)}</strong>
                      </span>

                      <button
                        type="button"
                        className="feed-post-open"
                        onClick={() => openProject(project)}
                      >
                        Ver projeto →
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {!loading && page < totalPages && (
          <div className="feed-load-more">
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
      </div>
    </section>
  );
}

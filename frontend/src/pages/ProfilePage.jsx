import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CarFront, Heart, Star } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useGlobalLoading } from "../context/LoadingContext";
import { assetUrl, getUserProfile } from "../services/api";
import { vehicleLabel } from "../utils/vehicleLabel";
import "../styles/ProfilePage.css";

// "2026-10-18 10:34:46.192495-03" -> Date
function parseDate(value) {
  if (!value) return null;

  const normalized = String(value)
    .replace(" ", "T")
    .replace(/(\.\d{3})\d+/, "$1")
    .replace(/([+-]\d{2})$/, "$1:00");

  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value, options) {
  const date = parseDate(value);
  return date ? date.toLocaleDateString("pt-BR", options) : "";
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("pt-BR");
}

export default function ProfilePage() {
  const { username } = useParams();
  const { user: me } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");

  useGlobalLoading(loading);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");
        setNotFound(false);
        setProfile(null);

        const data = await getUserProfile(username);
        if (!cancelled) setProfile(data);
      } catch (err) {
        if (cancelled) return;

        if (err.status === 404) setNotFound(true);
        else setError(err.message || "Não foi possível carregar o perfil.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [username]);

  if (loading) return null;

  if (notFound || error || !profile) {
    return (
      <section className="dashboard-section profile-page">
        <div className="empty-state">
          <div className="empty-icon">
            <CarFront size={20} />
          </div>

          <h3>{notFound ? "Usuário não encontrado" : "Erro ao carregar"}</h3>
          <p>
            {notFound
              ? `Não existe ninguém com o nome @${username}.`
              : error || "Tente novamente em instantes."}
          </p>

          <button
            type="button"
            className="primary-button empty-state-action"
            onClick={() => navigate("/feed")}
          >
            Ir para o feed
          </button>
        </div>
      </section>
    );
  }

  const { user, stats, projects } = profile;
  const displayName = user.name?.trim() || user.username;
  const initial = displayName.charAt(0).toUpperCase();
  const memberSince = formatDate(user.createdAt, {
    month: "long",
    year: "numeric",
  });
  const isOwn =
    Boolean(me?.username) &&
    me.username.toLowerCase() === String(user.username).toLowerCase();

  return (
    <section className="dashboard-section profile-page">
      <header className="profile-header">
        <div className="profile-avatar" aria-hidden="true">
          {initial}
        </div>

        <div className="profile-identity">
          <div className="profile-name-row">
            <h1>{displayName}</h1>
            {user.isPro && <span className="pro-badge">PRO</span>}
            {isOwn && <span className="profile-own-badge">Seu perfil</span>}
          </div>

          <span className="profile-username">@{user.username}</span>

          {memberSince && (
            <span className="profile-since">Membro desde {memberSince}</span>
          )}
        </div>
      </header>

      <div className="profile-stats">
        <div className="profile-stat">
          <strong>{formatNumber(stats.projectsCount)}</strong>
          <span>
            projeto{stats.projectsCount !== 1 ? "s" : ""} público
            {stats.projectsCount !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="profile-stat">
          <strong>{formatNumber(stats.likesCount)}</strong>
          <span>curtida{stats.likesCount !== 1 ? "s" : ""} recebida
            {stats.likesCount !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <div className="section-heading">
        <span className="section-eyebrow">PROJETOS</span>
        <h2>Projetos públicos</h2>
      </div>

      {projects.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <CarFront size={20} />
          </div>

          <h3>Nenhum projeto público</h3>
          <p>
            {isOwn
              ? "Publique um projeto no feed para ele aparecer aqui."
              : "Este usuário ainda não publicou nenhum projeto."}
          </p>
        </div>
      ) : (
        <div className="project-grid">
          {projects.map((project, index) => (
            <article
              className={`project-card${project.isFeatured ? " featured" : ""}`}
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
                {project.isFeatured && (
                  <span className="project-featured-tag">
                    <Star size={12} fill="currentColor" />
                    Destaque
                  </span>
                )}

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

                <div className="project-card-footer">
                  <span className="project-date">
                    {formatDate(project.publishedAt, {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>

                  <span className="profile-card-likes">
                    <Heart size={14} fill="currentColor" />
                    {formatNumber(project.likesCount)}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

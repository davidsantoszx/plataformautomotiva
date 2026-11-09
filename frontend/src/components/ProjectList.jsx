import { useMemo, useState } from "react";
import {
  CarFront,
  Search,
  MoreHorizontal,
  Copy,
  Trash2,
  Lock,
} from "lucide-react";
import { useToast } from "../context/ToastContext";
import { assetUrl, duplicateProject, deleteProject } from "../services/api";
import { vehicleLabel } from "../utils/vehicleLabel";
import { useAuth } from "../context/AuthContext";
import { ConfirmModal } from "../components/Modal";
const FILTERS = [
  { id: "ALL", label: "Todos" },
  { id: "REAL", label: "Reais" },
  { id: "FREE", label: "Livres" },
  { id: "PUBLIC", label: "Públicos" },
];

function formatDate(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function ProjectList({
  projects,
  loading,
  error,
  onOpen,
  onCreate,
  onRefresh,
}) {
  const { token, user } = useAuth();

  // Free: limite de projetos. Pro: sem limite (projectLimit vem vazio).
  const isPro = Boolean(user?.isPro);
  const projectLimit = user?.projectLimit ?? null;

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [openMenuId, setOpenMenuId] = useState(null);
  const [modal, setModal] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");

  const { showToast } = useToast();

  const filteredProjects = useMemo(() => {
    const search = query.trim().toLowerCase();

    return projects.filter((project) => {
      if (search && !project.name.toLowerCase().includes(search)) {
        return false;
      }

      if (filter === "REAL" || filter === "FREE") {
        return project.mode === filter;
      }

      if (filter === "PUBLIC") return project.isPublic;

      return true;
    });
  }, [projects, query, filter]);

  const hasProjects = projects.length > 0;

 async function handleDuplicate(project) {
  setOpenMenuId(null);
  setActionError("");

  try {
    setActionLoading(true);

    const data = await duplicateProject(token, project.id);
    showToast("Projeto duplicado com sucesso");

    if (onRefresh) {
      await onRefresh();
    }

  } catch (err) {
    setActionError(err.message || "Erro ao duplicar projeto.");
  } finally {
    setActionLoading(false);
  }
}

function handleDelete(project) {
  if (project) {
    setModal({ type: "delete", project });
    setOpenMenuId(null);
  }
}

async function confirmDelete() {
  if (!modal?.project || actionLoading) return;

  setActionError("");

  try {
    setActionLoading(true);

    await deleteProject(token, modal.project.id);
    setModal(null);
    showToast("Projeto excluído com sucesso");

    if (onRefresh) {
      await onRefresh();
    }
  } catch (err) {
    setActionError(err.message || "Erro ao excluir projeto.");
  } finally {
    setActionLoading(false);
  }
}
  return (
    <section className="dashboard-section projects-section">
      <div className="section-heading section-heading-row">
        <div>
          <span className="section-eyebrow">SEUS PROJETOS</span>
          <h2>Meus Projetos</h2>

          {!loading && hasProjects && (
            <p>
              {projectLimit
                ? `${projects.length} de ${projectLimit} projetos`
                : `${projects.length} projeto${projects.length !== 1 ? "s" : ""}`}

              {projectLimit && projects.length >= projectLimit && (
                <span className="projects-limit-note">
                  {" "}
                  · limite do plano Free atingido
                </span>
              )}
            </p>
          )}
        </div>

        {/* sem projetos, o único botão de criar fica no estado vazio abaixo */}
        {onCreate && hasProjects && (
          <button className="primary-button" type="button" onClick={onCreate}>
            + Novo projeto
          </button>
        )}
      </div>

      {!loading && hasProjects && (
        <div className="projects-toolbar">
          <div className="projects-search">
            <Search size={16} />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar projeto pelo nome"
            />
          </div>

          <div className="projects-filters">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`filter-chip ${filter === item.id ? "active" : ""}`}
                onClick={() => setFilter(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

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

      {!loading && !hasProjects && (
        <div className="empty-state">
          <div className="empty-icon">
            <CarFront size={20} />
          </div>

          <h3>Nenhum projeto ainda</h3>
          <p>Escolha um veículo e monte seu primeiro projeto.</p>

          {onCreate && (
            <button
              className="primary-button empty-state-action"
              type="button"
              onClick={onCreate}
            >
              Criar primeiro projeto
            </button>
          )}
        </div>
      )}

      {!loading && hasProjects && filteredProjects.length === 0 && (
        <div className="empty-state">
          <h3>Nenhum resultado</h3>
          <p>Nenhum projeto corresponde à busca ou ao filtro escolhido.</p>
        </div>
      )}

      {!loading && filteredProjects.length > 0 && (
        <div className="project-grid">
          {filteredProjects.map((project, index) => {
            const date = formatDate(project.updatedAt || project.createdAt);

            // projeto livre sem Pro ativo: continua visível, mas não edita
            const isLocked = project.mode === "FREE" && !isPro;

            return (
              <article
                className="project-card"
                key={project.id}
                role="link"
                tabIndex={0}
                style={{
                  animationDelay: `${Math.min(index, 8) * 45}ms`,
                }}
                onClick={() => onOpen(project.id)}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    event.target === event.currentTarget
                  ) {
                    onOpen(project.id);
                  }
                }}
              >
                <div className="project-card-preview">
                  {project.coverUrl ? (
                    <img src={assetUrl(project.coverUrl)} alt={project.name} />
                  ) : (
                    <CarFront size={34} />
                  )}

                  <span
                    className={`project-status ${
                      project.isPublic ? "public" : "private"
                    }`}
                  >
                    {project.isPublic ? "Público" : "Privado"}
                  </span>

                  <div className="project-card-actions">
                    <button
                      type="button"
                      className="project-card-menu-button"
                      aria-label={`Ações do projeto ${project.name}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        setOpenMenuId(
                          openMenuId === project.id ? null : project.id,
                        );
                      }}
                    >
                      <MoreHorizontal size={20} />
                    </button>

                    {openMenuId === project.id && (
                      <div
                        className="project-card-menu"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <button
                          type="button"
                          disabled={isLocked}
                          title={
                            isLocked
                              ? "Projeto livre bloqueado: renove o Pro para duplicar"
                              : undefined
                          }
                          onClick={() => handleDuplicate(project)}
                        >
                          <Copy size={15} />
                          Duplicar
                        </button>

                        <button
                          type="button"
                          className="danger"
                          onClick={() => handleDelete(project)}
                        >
                          <Trash2 size={15} />
                          Excluir
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="project-card-body">
                  <h3>{project.name}</h3>

                  <div className="project-card-meta">
                    <span
                      className={`project-mode-badge ${project.mode.toLowerCase()}`}
                    >
                      {project.mode === "REAL" ? "Real" : "Livre"}
                    </span>

                    {isLocked && (
                      <span className="project-locked-badge">
                        <Lock size={11} />
                        Bloqueado
                      </span>
                    )}

                    <span className="project-vehicle">
                      {vehicleLabel(project.vehicle) ||
                        `Veículo #${project.vehicleId}`}
                    </span>
                  </div>

                  <div className="project-card-footer">
                    <span className="project-date">{date}</span>
                    <span className="project-open">Abrir →</span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {(error || actionError) && (
        <p className="message message-error">{actionError || error}</p>
      )}

      {modal?.type === "delete" && (
        <ConfirmModal
          title="Excluir projeto"
          message={`"${modal.project.name}" e todas as suas peças serão excluídos. Essa ação não pode ser desfeita.`}
          confirmLabel="Excluir"
          danger
          loading={actionLoading}
          onConfirm={confirmDelete}
          onCancel={() => {
            if (!actionLoading) setModal(null);
          }}
        />
      )}
    </section>
  );
}

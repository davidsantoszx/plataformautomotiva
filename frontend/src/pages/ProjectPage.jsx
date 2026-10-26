import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Copy, Globe, Lock, MoreHorizontal } from "lucide-react";
import CarPreview3D from "../components/CarPreview3D";
import { useToast } from "../context/ToastContext";
import Modal, { ConfirmModal } from "../components/Modal";
import { useAuth } from "../context/AuthContext";
import { build3DScene } from "../utils/build3DScene";
import { vehicleLabel } from "../utils/vehicleLabel";
import {
  getProject,
  getProjectParts,
  updateProject,
  deleteProject,
  duplicateProject,
  updateProjectPublication,
  updateProjectPartQuantity,
  removePartFromProject,
} from "../services/api";

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

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

function RenameModal({ project, loading, onSave, onClose }) {
  const [name, setName] = useState(project.name);
  const [mode, setMode] = useState(project.mode);

  return (
    <Modal
      title="Renomear projeto"
      onClose={onClose}
      footer={
        <>
          <button
            className="secondary-button"
            type="button"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </button>

          <button
            className="primary-button"
            type="submit"
            form="rename-form"
            disabled={loading}
          >
            {loading ? "Salvando..." : "Salvar"}
          </button>
        </>
      }
    >
      <form
        id="rename-form"
        onSubmit={(event) => {
          event.preventDefault();
          onSave(name, mode);
        }}
      >
        <div className="form-field">
          <label htmlFor="rename-name">Nome do projeto</label>
          <input
            id="rename-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoFocus
          />
        </div>

        <div className="mode-selector">
          <span>Modo do projeto</span>

          <div className="mode-options">
            <label className={mode === "REAL" ? "selected" : ""}>
              <input
                type="radio"
                name="rename-mode"
                value="REAL"
                checked={mode === "REAL"}
                onChange={() => setMode("REAL")}
              />
              <strong>Projeto Real</strong>
              <small>Respeita compatibilidades.</small>
            </label>

            <label className={mode === "FREE" ? "selected" : ""}>
              <input
                type="radio"
                name="rename-mode"
                value="FREE"
                checked={mode === "FREE"}
                onChange={() => setMode("FREE")}
              />
              <strong>Projeto Livre</strong>
              <small>Permite combinações livres.</small>
            </label>
          </div>
        </div>
      </form>
    </Modal>
  );
}

function PublishModal({ project, loading, onSubmit, onClose }) {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description || "");
  const editing = project.isPublic;

  return (
    <Modal
      title={editing ? "Editar publicação" : "Publicar projeto"}
      onClose={onClose}
      footer={
        <>
          <button
            className="secondary-button"
            type="button"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </button>

          <button
            className="primary-button"
            type="submit"
            form="publish-form"
            disabled={loading || !name.trim()}
          >
            {loading ? "Salvando..." : editing ? "Salvar" : "Publicar"}
          </button>
        </>
      }
    >
      <form
        id="publish-form"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(name.trim(), description.trim());
        }}
      >
        <div className="form-field">
          <label htmlFor="publish-name">Nome do projeto</label>
          <input
            id="publish-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoFocus
          />
        </div>

        <div className="form-field">
          <label htmlFor="publish-description">Descrição (opcional)</label>
          <textarea
            id="publish-description"
            className="textarea-field"
            rows={4}
            maxLength={500}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Conte o que você mudou e por quê."
          />
          <span className="field-counter">{description.length}/500</span>
        </div>

        {!editing && (
          <p className="publish-note">
            Qualquer pessoa poderá ver o nome, o veículo e as peças deste
            projeto no feed. Você pode despublicar quando quiser.
          </p>
        )}
      </form>
    </Modal>
  );
}

export default function ProjectPage() {
  const { id } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [projectParts, setProjectParts] = useState([]);
  const [projectPartDetails, setProjectPartDetails] = useState({});

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [modal, setModal] = useState(null); // "rename" | "delete" | "publish" | "unpublish"
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const { showToast } = useToast();

  // carrega projeto (já com o veículo) e peças
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");
        setVehicle(null);

        const projectData = await getProject(token, id);
        const partsData = await getProjectParts(token, id);

        if (cancelled) return;

        const details = {};
        (partsData.parts || []).forEach((item) => {
          if (item.part) details[item.partId] = item.part;
        });

        setProject(projectData.project);
        // o veículo fica em estado próprio: PATCH de renomear/publicar
        // devolve o projeto sem esse campo e não pode apagar o 3D
        setVehicle(projectData.project.vehicle || null);
        setProjectParts(partsData.parts || []);
        setProjectPartDetails(details);
      } catch (err) {
        if (!cancelled) setError(err.message || "Erro ao abrir projeto.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [id, token]);

  // fecha o menu "⋯" ao clicar fora
  useEffect(() => {
    function handleClick(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // some com o aviso depois de 3s
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 3000);
    return () => clearTimeout(timer);
  }, [notice]);

  const scene = useMemo(
    () => build3DScene(vehicle, projectPartDetails),
    [vehicle, projectPartDetails],
  );

  const projectTotal = projectParts.reduce((total, item) => {
    const part = projectPartDetails[item.partId];
    const price = Number(item.priceAtTime ?? part?.estimatedPrice ?? 0);
    return total + price * Number(item.quantity ?? 1);
  }, 0);

  const shareUrl =
    project?.isPublic && project.shareToken
      ? `${window.location.origin}/p/${project.shareToken}`
      : "";

  const goToConfigurator = () => navigate(`/projetos/${id}/configurar`);

  async function handleSaveRename(name, mode) {
    if (!name.trim()) {
      setError("Informe um nome para o projeto.");
      return;
    }

    try {
      setActionLoading(true);
      setError("");

      const data = await updateProject(token, project.id, name.trim(), mode);
      setProject(data.project);
      setModal(null);
      setNotice("Projeto atualizado.");
    } catch (err) {
      setError(err.message || "Erro ao atualizar projeto.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete() {
    try {
      setActionLoading(true);
      setError("");

      await deleteProject(token, project.id);
      showToast("Projeto excluído com sucesso");
      navigate("/projetos", { replace: true });
    } catch (err) {
      setError(err.message || "Erro ao excluir projeto.");
      setModal(null);
      setActionLoading(false);
    }
  }

  async function handleDuplicate() {
    setMenuOpen(false);

    try {
      setActionLoading(true);
      setError("");

      const data = await duplicateProject(token, project.id);
      showToast("Projeto duplicado com sucesso");
      navigate(`/projetos/${data.project.id}`);
    } catch (err) {
      setError(err.message || "Erro ao duplicar projeto.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handlePublish(name, description) {
    try {
      setActionLoading(true);
      setError("");

      const wasPublic = project.isPublic;
      const data = await updateProjectPublication(token, project.id, true, {
        name,
        description,
      });

      setProject(data.project);
      setModal(null);
      setNotice(
        wasPublic ? "Publicação atualizada." : "Projeto publicado no feed.",
      );
    } catch (err) {
      setError(err.message || "Erro ao publicar projeto.");
      setModal(null);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleUnpublish() {
    try {
      setActionLoading(true);
      setError("");

      const data = await updateProjectPublication(token, project.id, false);

      setProject(data.project);
      setModal(null);
      setNotice("Projeto despublicado.");
    } catch (err) {
      setError(err.message || "Erro ao despublicar projeto.");
      setModal(null);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCopyLink() {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setNotice("Link copiado.");
    } catch {
      setError("Não foi possível copiar o link.");
    }
  }

  async function handleUpdateQuantity(partId, quantity) {
    if (!Number.isInteger(quantity) || quantity < 1) return;

    try {
      const data = await updateProjectPartQuantity(
        token,
        project.id,
        partId,
        quantity,
      );

      setProjectParts((current) =>
        current.map((item) =>
          item.partId === partId ? { ...item, ...data.projectPart } : item,
        ),
      );
      setError("");
    } catch (err) {
      setError(err.message || "Erro ao atualizar quantidade.");
    }
  }

  async function handleRemovePart(partId) {
    try {
      setError("");
      await removePartFromProject(token, project.id, partId);

      setProjectParts((current) =>
        current.filter((item) => item.partId !== partId),
      );
      setProjectPartDetails((current) => {
        const updated = { ...current };
        delete updated[partId];
        return updated;
      });
    } catch (err) {
      setError(err.message || "Erro ao remover peça do projeto.");
    }
  }

  if (loading) {
    return (
      <section className="dashboard-section project-page">
        <div className="empty-state">
          <p>Carregando projeto...</p>
        </div>
      </section>
    );
  }

  if (!project) {
    return (
      <section className="dashboard-section project-page">
        <Link to="/projetos" className="back-link">
          <ArrowLeft size={15} /> Meus projetos
        </Link>

        <div className="empty-state">
          <h3>Projeto não encontrado</h3>
          <p>{error}</p>
        </div>
      </section>
    );
  }

  const vehicleText =
    vehicleLabel(vehicle, { withVersion: true }) ||
    `Veículo #${project.vehicleId}`;

  const updated = formatDate(project.updatedAt || project.createdAt);

  return (
    <section className="dashboard-section project-page">
      <Link to="/projetos" className="back-link">
        <ArrowLeft size={15} /> Meus projetos
      </Link>

      <header className="project-page-header">
        <div className="project-page-title">
          <h1>{project.name}</h1>

          <div className="project-page-badges">
            <span
              className={`project-mode-badge ${project.mode.toLowerCase()}`}
            >
              {project.mode === "REAL" ? "Real" : "Livre"}
            </span>

            <span
              className={`project-status ${
                project.isPublic ? "public" : "private"
              }`}
            >
              {project.isPublic ? "Público" : "Privado"}
            </span>

            {updated && (
              <span className="project-date">Atualizado em {updated}</span>
            )}
          </div>
        </div>

        <div className="project-page-actions">
          <button
            className="primary-button"
            type="button"
            onClick={goToConfigurator}
          >
            Editar no 3D
          </button>

          <div className="more-menu" ref={menuRef}>
            <button
              type="button"
              className="icon-button"
              aria-label="Mais ações"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <MoreHorizontal size={18} />
            </button>

            {menuOpen && (
              <div className="user-menu-dropdown" role="menu">
                <button
                  type="button"
                  className="user-menu-item"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    setModal("rename");
                  }}
                >
                  Renomear
                </button>

                <button
                  type="button"
                  className="user-menu-item"
                  role="menuitem"
                  onClick={handleDuplicate}
                  disabled={actionLoading}
                >
                  Duplicar
                </button>

                <button
                  type="button"
                  className="user-menu-item danger"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    setModal("delete");
                  }}
                >
                  Excluir
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {error && <p className="message message-error">{error}</p>}

      <div className="project-overview">
        <div className="project-preview-card">
          <CarPreview3D
            modelUrl={scene.modelUrl}
            parts={scene.parts}
            loading={!vehicle}
          />

          <div className="project-preview-caption">
            <span>VEÍCULO</span>
            <strong>{vehicleText}</strong>
          </div>
        </div>

        <aside className="project-side">
          <div className="side-card">
            <span className="side-card-label">TOTAL ESTIMADO</span>
            <strong className="side-total">{formatCurrency(projectTotal)}</strong>
            <span className="side-card-sub">
              {projectParts.length} peça{projectParts.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="side-card">
            <span className="side-card-label">VISIBILIDADE</span>

            <div className="side-visibility">
              {project.isPublic ? <Globe size={16} /> : <Lock size={16} />}
              <strong>{project.isPublic ? "Público" : "Privado"}</strong>
            </div>

            <p className="side-card-sub">
              {project.isPublic
                ? "Qualquer pessoa com o link pode ver este projeto."
                : "Só você consegue ver este projeto."}
            </p>

            {shareUrl && (
              <div className="share-box">
                <input
                  readOnly
                  value={shareUrl}
                  onFocus={(e) => e.target.select()}
                />
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Copiar link"
                  onClick={handleCopyLink}
                >
                  <Copy size={15} />
                </button>
              </div>
            )}

            {project.isPublic ? (
              <div className="side-actions">
                <button
                  className="secondary-button full-width"
                  type="button"
                  onClick={() => setModal("publish")}
                  disabled={actionLoading}
                >
                  Editar publicação
                </button>
                <button
                  className="danger-button full-width"
                  type="button"
                  onClick={() => setModal("unpublish")}
                  disabled={actionLoading}
                >
                  Despublicar
                </button>
              </div>
            ) : (
              <button
                className="primary-button full-width"
                type="button"
                onClick={() => setModal("publish")}
                disabled={actionLoading}
              >
                Publicar no feed
              </button>
            )}
          </div>
        </aside>
      </div>

      <div className="parts-project-list">
        <div className="parts-project-heading">
          <h3>Peças do projeto</h3>

          <span>
            {projectParts.length} item{projectParts.length !== 1 ? "s" : ""}
          </span>
        </div>

        {projectParts.length === 0 ? (
          <div className="empty-state parts-empty">
            <p>Nenhuma peça adicionada ainda.</p>
            <button
              className="primary-button empty-state-action"
              type="button"
              onClick={goToConfigurator}
            >
              Adicionar peças no 3D
            </button>
          </div>
        ) : (
          projectParts.map((projectPart) => {
            const part =
              projectPart.part || projectPartDetails[projectPart.partId];

            const quantity = Number(projectPart.quantity || 1);
            const unitPrice = Number(projectPart.priceAtTime || 0);

            return (
              <article className="project-part-row" key={projectPart.id}>
                <div className="project-part-info">
                  <h4>{part?.name || `Peça #${projectPart.partId}`}</h4>
                  {part?.brand && <span>{part.brand}</span>}
                </div>

                <div className="project-part-price">
                  <span>{formatCurrency(unitPrice)} un.</span>
                  <strong>{formatCurrency(unitPrice * quantity)}</strong>
                </div>

                <div className="quantity-control">
                  <button
                    type="button"
                    onClick={() =>
                      handleUpdateQuantity(projectPart.partId, quantity - 1)
                    }
                    disabled={quantity <= 1}
                  >
                    −
                  </button>

                  <span>{quantity}</span>

                  <button
                    type="button"
                    onClick={() =>
                      handleUpdateQuantity(projectPart.partId, quantity + 1)
                    }
                  >
                    +
                  </button>
                </div>

                <button
                  className="remove-button"
                  type="button"
                  onClick={() => handleRemovePart(projectPart.partId)}
                >
                  Remover
                </button>
              </article>
            );
          })
        )}
      </div>

      {modal === "rename" && (
        <RenameModal
          project={project}
          loading={actionLoading}
          onSave={handleSaveRename}
          onClose={() => setModal(null)}
        />
      )}

      {modal === "delete" && (
        <ConfirmModal
          title="Excluir projeto"
          message={`"${project.name}" e todas as suas peças serão excluídos. Essa ação não pode ser desfeita.`}
          confirmLabel="Excluir"
          danger
          loading={actionLoading}
          onConfirm={handleDelete}
          onCancel={() => setModal(null)}
        />
      )}

      {modal === "publish" && (
        <PublishModal
          project={project}
          loading={actionLoading}
          onSubmit={handlePublish}
          onClose={() => setModal(null)}
        />
      )}

      {modal === "unpublish" && (
        <ConfirmModal
          title="Despublicar projeto"
          message="O link público deixará de funcionar e o projeto sai do feed. A descrição fica guardada."
          confirmLabel="Despublicar"
          loading={actionLoading}
          onConfirm={handleUnpublish}
          onCancel={() => setModal(null)}
        />
      )}

      {notice && <div className="page-toast">{notice}</div>}
    </section>
  );
}

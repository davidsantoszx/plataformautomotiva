import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Copy,
  Globe,
  Lock,
  Minus,
  Package,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import CarPreview3D from "../components/CarPreview3D";
import PartThumb from "../components/PartThumb";

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

function RenameModal({ project, loading, canUseFreeMode, onSave, onClose }) {
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

        {canUseFreeMode && (
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
        )}
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
  const { token, user } = useAuth();
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



  // some com o aviso depois de 3s
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 3000);
    return () => clearTimeout(timer);
  }, [notice]);

  // O erro também aparece como aviso que some sozinho. Se o projeto nem
  // carregou, a mensagem fica na tela (é o que explica o problema).
  useEffect(() => {
    if (!error || !project) return;
    const timer = setTimeout(() => setError(""), 6000);
    return () => clearTimeout(timer);
  }, [error, project]);

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

  // Projeto livre só edita com o Pro ativo. Sem ele, fica visível mas bloqueado.
  const isPro = Boolean(user?.isPro);
  const isLocked = project?.mode === "FREE" && !isPro;

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



  // Saída para quem perdeu o Pro: virar projeto real (o servidor confere se
  // todas as peças são compatíveis com o veículo).
  async function handleConvertToReal() {
    try {
      setActionLoading(true);
      setError("");

      const data = await updateProject(token, project.id, project.name, "REAL");
      setProject(data.project);
      setNotice("Projeto convertido para Real.");
    } catch (err) {
      setError(err.message || "Erro ao converter o projeto.");
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
    if (isLocked || !Number.isInteger(quantity) || quantity < 1) return;

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
    if (isLocked) return;

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
            {isLocked ? "Ver no 3D" : "Editar no 3D"}
          </button>

          <button
            type="button"
            className="icon-button"
            aria-label="Renomear projeto"
            title={
              isLocked
                ? "Projeto livre bloqueado: renove o Pro para editar"
                : "Renomear projeto"
            }
            onClick={() => setModal("rename")}
            disabled={isLocked}
          >
            <Pencil size={18} />
          </button>
        </div>

      </header>

      {isLocked && (
        <div className="project-locked-banner">
          <Lock size={20} />

          <div>
            <strong>Projeto livre bloqueado</strong>
            <p>
              Seu plano Pro não está ativo. Você continua vendo e publicando
              este projeto, mas só volta a editá-lo ao renovar o Pro. Também é
              possível convertê-lo para Projeto Real, desde que todas as peças
              sejam compatíveis com o veículo.
            </p>
          </div>

          <button
            className="secondary-button"
            type="button"
            onClick={handleConvertToReal}
            disabled={actionLoading}
          >
            Converter para Real
          </button>
        </div>
      )}

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

      <div className="project-parts">
        <header className="project-parts-header">
          <div className="project-parts-heading">
            <h3>Peças do projeto</h3>
            <span className="project-parts-count">{projectParts.length}</span>
          </div>

          {!isLocked && (
            <button
              className="secondary-button project-parts-add"
              type="button"
              aria-label="Adicionar peças"
              onClick={goToConfigurator}
            >
              <Plus size={15} />
              <span>Adicionar peças</span>
            </button>
          )}
        </header>

        {projectParts.length === 0 ? (
          <div className="project-parts-empty">
            <div className="project-parts-empty-icon">
              <Package size={24} />
            </div>
            <strong>Nenhuma peça adicionada ainda</strong>
            <p>Abra o configurador 3D para escolher as peças do seu projeto.</p>
            {!isLocked && (
              <button
                className="primary-button"
                type="button"
                onClick={goToConfigurator}
              >
                Adicionar peças no 3D
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="project-parts-list">
              {projectParts.map((projectPart) => {
                const part =
                  projectPart.part || projectPartDetails[projectPart.partId];

                const name = part?.name || `Peça #${projectPart.partId}`;
                const quantity = Number(projectPart.quantity || 1);
                const unitPrice = Number(projectPart.priceAtTime || 0);

                return (
                  <article className="part-card" key={projectPart.id}>
                    <PartThumb part={part} />

                    <div className="part-card-info">
                      <h4>{name}</h4>

                      <div className="part-card-meta">
                        {part?.brand && (
                          <span className="part-card-brand">{part.brand}</span>
                        )}
                        <span>{formatCurrency(unitPrice)} un.</span>
                      </div>
                    </div>

                    <div className="part-qty" role="group" aria-label="Quantidade">
                      <button
                        type="button"
                        aria-label="Diminuir quantidade"
                        onClick={() =>
                          handleUpdateQuantity(projectPart.partId, quantity - 1)
                        }
                        disabled={isLocked || quantity <= 1}
                      >
                        <Minus size={14} />
                      </button>

                      <span>{quantity}</span>

                      <button
                        type="button"
                        aria-label="Aumentar quantidade"
                        disabled={isLocked}
                        onClick={() =>
                          handleUpdateQuantity(projectPart.partId, quantity + 1)
                        }
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    <strong className="part-card-subtotal">
                      {formatCurrency(unitPrice * quantity)}
                    </strong>

                    <button
                      className="part-remove"
                      type="button"
                      aria-label={`Remover ${name}`}
                      title="Remover do projeto"
                      disabled={isLocked}
                      onClick={() => handleRemovePart(projectPart.partId)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </article>
                );
              })}
            </div>

            <footer className="project-parts-footer">
              <span>
                Total estimado · {projectParts.length} peça
                {projectParts.length !== 1 ? "s" : ""}
              </span>
              <strong>{formatCurrency(projectTotal)}</strong>
            </footer>
          </>
        )}
      </div>

      {modal === "rename" && (
        <RenameModal
          project={project}
          loading={actionLoading}
          canUseFreeMode={isPro}
          onSave={handleSaveRename}
          onClose={() => setModal(null)}
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

      {(error || notice) && (
        <div
          key={error ? `error-${error}` : `notice-${notice}`}
          className={`page-toast${error ? " page-toast-error" : ""}`}
          role={error ? "alert" : "status"}
        >
          {error || notice}
        </div>
      )}
    </section>
  );
}

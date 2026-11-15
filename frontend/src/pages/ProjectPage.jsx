import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CarFront,
  Copy,
  Eye,
  FileText,
  GitCompare,
  Globe,
  Heart,
  Image as ImageIcon,
  Link2,
  Lock,
  Minus,
  Package,
  Pencil,
  Plus,
  Star,
  Trash2,
} from "lucide-react";
import CarPreview3D from "../components/CarPreview3D";
import PartThumb from "../components/PartThumb";
import CoverCapture from "../components/CoverCapture";

import Modal, { ConfirmModal } from "../components/Modal";
import { useAuth } from "../context/AuthContext";
import { build3DScene } from "../utils/build3DScene";
import { downloadBudgetPdf } from "../utils/budgetPdf";
import { paintFromProject } from "../utils/paint";
import { vehicleLabel } from "../utils/vehicleLabel";
import "../styles/ComparePage.css";
import {
  assetUrl,
  getProject,
  getProjects,
  getProjectParts,
  getProjectStats,
  updateProject,
  deleteProject,
  duplicateProject,
  updateProjectFeatured,
  updateProjectLink,
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

// Direção em que a FRENTE do carro aponta para a câmera (graus). Todos os
// ângulos abaixo são calculados a partir dela. Se "Frente" sair mostrando a
// traseira nos seus modelos, mude para 90.
// 270 + 22,5: o carro é girado 22,5° na cena (CarScene), então a "frente" de
// verdade fica nesse ângulo e as outras vistas saem alinhadas com o carro.
const FRONT_AZIMUTH = 292.5;

const EXPORT_ANGLES = [
  { id: "side", label: "Lateral", hint: "frente para a direita", azimuth: FRONT_AZIMUTH - 90, elevation: 4 },
  { id: "front34", label: "3/4 frente", hint: "frente à direita", azimuth: FRONT_AZIMUTH - 45, elevation: 12 },
  { id: "front", label: "Frente", hint: "de frente", azimuth: FRONT_AZIMUTH, elevation: 6 },
  { id: "rear34", label: "3/4 traseira", hint: "por trás, frente à direita", azimuth: FRONT_AZIMUTH - 135, elevation: 12 },
  { id: "rear", label: "Traseira", hint: "de trás", azimuth: FRONT_AZIMUTH + 180, elevation: 6 },
];

const EXPORT_FORMATS = [
  { id: "png", label: "PNG", hint: "máxima qualidade", mimeType: "image/png" },
  { id: "jpg", label: "JPG", hint: "arquivo menor", mimeType: "image/jpeg" },
];

function ExportImageModal({ onExport, onClose }) {
  const [angleId, setAngleId] = useState("side");
  const [formatId, setFormatId] = useState("png");

  return (
    <Modal
      title="Exportar imagem HD"
      onClose={onClose}
      footer={
        <>
          <button className="secondary-button" type="button" onClick={onClose}>
            Cancelar
          </button>

          <button
            className="primary-button"
            type="button"
            onClick={() =>
              onExport(
                EXPORT_ANGLES.find((angle) => angle.id === angleId),
                EXPORT_FORMATS.find((format) => format.id === formatId),
              )
            }
          >
            Baixar imagem
          </button>
        </>
      }
    >
      <div className="mode-selector">
        <span>Ângulo do carro</span>

        <div className="mode-options">
          {EXPORT_ANGLES.map((angle) => (
            <label
              key={angle.id}
              className={angleId === angle.id ? "selected" : ""}
            >
              <input
                type="radio"
                name="export-angle"
                value={angle.id}
                checked={angleId === angle.id}
                onChange={() => setAngleId(angle.id)}
              />
              <strong>{angle.label}</strong>
              <small>{angle.hint}</small>
            </label>
          ))}
        </div>
      </div>

      <div className="mode-selector">
        <span>Formato</span>

        <div className="mode-options">
          {EXPORT_FORMATS.map((format) => (
            <label
              key={format.id}
              className={formatId === format.id ? "selected" : ""}
            >
              <input
                type="radio"
                name="export-format"
                value={format.id}
                checked={formatId === format.id}
                onChange={() => setFormatId(format.id)}
              />
              <strong>{format.label}</strong>
              <small>{format.hint}</small>
            </label>
          ))}
        </div>
      </div>
    </Modal>
  );
}

function CompareModal({ project, token, onSubmit, onClose }) {
  const [options, setOptions] = useState(null);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    getProjects(token)
      .then((data) => {
        if (cancelled) return;
        const others = (data.projects || []).filter(
          (item) => item.id !== project.id,
        );
        setOptions(others);
        if (others.length === 1) setSelected(others[0].id);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Erro ao buscar projetos.");
      });

    return () => {
      cancelled = true;
    };
  }, [token, project.id]);

  return (
    <Modal
      title="Comparar com qual projeto?"
      className="modal-wide"
      onClose={onClose}
      footer={
        <>
          <button className="secondary-button" type="button" onClick={onClose}>
            Cancelar
          </button>

          <button
            className="primary-button"
            type="button"
            disabled={!selected}
            onClick={() => onSubmit(selected)}
          >
            Comparar
          </button>
        </>
      }
    >
      {error && <p className="form-error">{error}</p>}

      {!error && !options && <p>Carregando seus projetos...</p>}

      {options && options.length === 0 && (
        <p>Você ainda não tem outro projeto para comparar com este.</p>
      )}

      {options && options.length > 0 && (
        <div className="compare-picker">
          {options.map((item) => (
            <label
              key={item.id}
              className={selected === item.id ? "selected" : ""}
            >
              <input
                type="radio"
                name="compare-project"
                value={item.id}
                checked={selected === item.id}
                onChange={() => setSelected(item.id)}
              />

              <span className="compare-picker-cover">
                {item.coverUrl ? (
                  <img src={assetUrl(item.coverUrl)} alt="" />
                ) : (
                  <CarFront size={28} />
                )}
              </span>

              <strong>{item.name}</strong>
              <small>
                {vehicleLabel(item.vehicle) || `Veículo #${item.vehicleId}`}
              </small>
            </label>
          ))}
        </div>
      )}
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

  const [modal, setModal] = useState(null); // "rename" | "delete" | "publish" | "unpublish" | "export-image" | "parts" | "compare"
  const [hdCapture, setHdCapture] = useState(null); // opções da imagem HD em geração
  const [stats, setStats] = useState(null); // { views, likes } (Pro)

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



  // estatísticas: só para o Pro e só enquanto o projeto é compartilhado
  const statsEnabled =
    Boolean(user?.isPro) &&
    Boolean(project?.isPublic || project?.linkEnabled);

  useEffect(() => {
    if (!statsEnabled) {
      setStats(null);
      return;
    }

    let cancelled = false;

    getProjectStats(token, id)
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch(() => {
        if (!cancelled) setStats(null);
      });

    return () => {
      cancelled = true;
    };
  }, [statsEnabled, token, id]);

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

  // objetos estáveis: o carro 3D só atualiza a pintura quando ela muda de fato
  const savedColor = project?.paintColor;
  const savedFinish = project?.paintFinish;

  const savedPaint = useMemo(
    () => paintFromProject({ paintColor: savedColor, paintFinish: savedFinish }),
    [savedColor, savedFinish],
  );

  const projectTotal = projectParts.reduce((total, item) => {
    const part = projectPartDetails[item.partId];
    const price = Number(item.priceAtTime ?? part?.estimatedPrice ?? 0);
    return total + price * Number(item.quantity ?? 1);
  }, 0);

  // o "só com link" vale enquanto o Pro estiver ativo
  const linkActive = Boolean(project?.linkEnabled) && Boolean(user?.isPro);

  const shareUrl =
    (project?.isPublic || linkActive) && project.shareToken
      ? `${window.location.origin}/p/${project.shareToken}`
      : "";

  const goToConfigurator = () => navigate(`/projetos/${id}/configurar`);

  // Projeto livre só edita com o Pro ativo. Sem ele, fica visível mas bloqueado.
  const isPro = Boolean(user?.isPro);
  const isLocked = project?.mode === "FREE" && !isPro;

  // o destaque só vale enquanto o Pro está ativo
  const isFeatured = Boolean(project?.featuredAt) && isPro;

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

  async function handleToggleLink() {
    if (!isPro) {
      navigate("/planos");
      return;
    }

    try {
      setActionLoading(true);
      setError("");

      const enabling = !project.linkEnabled;
      const data = await updateProjectLink(token, project.id, enabling);

      setProject(data.project);
      setNotice(enabling ? "Link ativado." : "Link desativado.");
    } catch (err) {
      setError(err.message || "Erro ao alterar o link do projeto.");
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

  // ---- recursos Pro ----------------------------------------------------
  // Quem não é Pro clica e vai para a página de planos.

  function handleExportImage() {
    if (!isPro) {
      navigate("/planos");
      return;
    }

    if (!scene.modelUrl) {
      setError("Este veículo não tem modelo 3D para exportar.");
      return;
    }

    if (!hdCapture) setModal("export-image");
  }

  function handleCompare() {
    if (!isPro) {
      navigate("/planos");
      return;
    }

    setModal("compare");
  }

  function handleStartExport(angle, format) {
    setModal(null);
    setHdCapture({ angle, format });
  }

  function handleHdCaptured(image) {
    const format = hdCapture?.format;
    const angle = hdCapture?.angle;

    setHdCapture(null);

    if (!image) {
      setError("Não foi possível gerar a imagem. Tente novamente.");
      return;
    }

    const fileName = String(project.name || "projeto")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const link = document.createElement("a");
    link.href = image;
    link.download = `${fileName || "projeto"}-${angle?.id || "hd"}-hd.${
      format?.id || "png"
    }`;
    document.body.appendChild(link);
    link.click();
    link.remove();

    setNotice("Imagem HD baixada.");
  }

  async function handleDownloadBudget() {
    if (!isPro) {
      navigate("/planos");
      return;
    }

    try {
      await downloadBudgetPdf({
        projectName: project.name,
        vehicleText,
        items: projectParts.map((item) => {
          const part = item.part || projectPartDetails[item.partId];

          return {
            name: part?.name || `Peça #${item.partId}`,
            brand: part?.brand || "",
            quantity: Number(item.quantity || 1),
            unitPrice: Number(item.priceAtTime || 0),
          };
        }),
      });

      setNotice("Orçamento em PDF baixado.");
    } catch (err) {
      console.error(err);
      setError("Não foi possível gerar o PDF.");
    }
  }

  async function handleToggleFeatured() {
    if (!isPro) {
      navigate("/planos");
      return;
    }

    try {
      setActionLoading(true);
      setError("");

      const data = await updateProjectFeatured(token, project.id, !isFeatured);

      setProject(data.project);
      setNotice(
        isFeatured
          ? "Destaque removido do perfil."
          : "Projeto em destaque no seu perfil.",
      );
    } catch (err) {
      setError(err.message || "Erro ao destacar o projeto.");
    } finally {
      setActionLoading(false);
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

            {isFeatured && (
              <span className="project-status public">
                <Star size={12} fill="currentColor" /> Destaque
              </span>
            )}

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
            paint={savedPaint}
          />

          <div className="project-preview-caption">
            <span>VEÍCULO</span>
            <strong>{vehicleText}</strong>
          </div>
        </div>

        <aside className="project-side">
          <div className="side-card">
            <div className="side-card-top">
              <span className="side-card-label">TOTAL ESTIMADO</span>

              <button
                className="secondary-button side-card-link"
                type="button"
                onClick={() => setModal("parts")}
              >
                <Package size={14} />
                Ver peças
              </button>
            </div>

            <strong className="side-total">{formatCurrency(projectTotal)}</strong>
            <span className="side-card-sub">
              {projectParts.length} peça{projectParts.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="side-card">
            <span className="side-card-label">VISIBILIDADE</span>

            <div className="side-visibility">
              {project.isPublic ? (
                <Globe size={16} />
              ) : project.linkEnabled ? (
                <Link2 size={16} />
              ) : (
                <Lock size={16} />
              )}
              <strong>
                {project.isPublic
                  ? "Público"
                  : project.linkEnabled
                    ? "Só com link"
                    : "Privado"}
              </strong>
            </div>

            <p className="side-card-sub">
              {project.isPublic
                ? "Aparece no feed. Qualquer pessoa pode ver este projeto."
                : project.linkEnabled
                  ? isPro
                    ? "Fora do feed: só quem tem o link consegue abrir."
                    : "Link pausado: renove o Pro para ele voltar a abrir."
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
              <div className="side-actions">
                <button
                  className="primary-button full-width"
                  type="button"
                  onClick={() => setModal("publish")}
                  disabled={actionLoading}
                >
                  Publicar no feed
                </button>

                <button
                  className="secondary-button full-width pro-action"
                  type="button"
                  onClick={handleToggleLink}
                  disabled={actionLoading}
                >
                  <Link2 size={15} />
                  {project.linkEnabled
                    ? "Desativar link"
                    : "Compartilhar só com link"}
                  {!isPro && <span className="pro-badge">PRO</span>}
                </button>
              </div>
            )}
          </div>

          {(project.isPublic || project.linkEnabled) && (
            <div className="side-card">
              <span className="side-card-label">
                ESTATÍSTICAS
                {!isPro && <span className="pro-badge">PRO</span>}
              </span>

              <div className="stat-tiles">
                <div>
                  <Eye size={15} />
                  <strong>{stats ? stats.views : "—"}</strong>
                  <small>Visualizações</small>
                </div>

                <div>
                  <Heart size={15} />
                  <strong>{stats ? stats.likes : "—"}</strong>
                  <small>Curtidas</small>
                </div>
              </div>

              {!isPro && (
                <button
                  className="secondary-button full-width"
                  type="button"
                  onClick={() => navigate("/planos")}
                >
                  Ver estatísticas com o Pro
                </button>
              )}
            </div>
          )}

          <div className="side-card">
            <span className="side-card-label">RECURSOS PRO</span>

            <div className="side-actions">
              <button
                className="secondary-button full-width pro-action"
                type="button"
                onClick={handleExportImage}
                disabled={hdCapture}
              >
                <ImageIcon size={15} />
                {hdCapture ? "Gerando imagem..." : "Exportar imagem HD"}
                {!isPro && <span className="pro-badge">PRO</span>}
              </button>

              <button
                className="secondary-button full-width pro-action"
                type="button"
                onClick={handleDownloadBudget}
              >
                <FileText size={15} />
                Baixar orçamento (PDF)
                {!isPro && <span className="pro-badge">PRO</span>}
              </button>

              <button
                className="secondary-button full-width pro-action"
                type="button"
                onClick={handleToggleFeatured}
                disabled={actionLoading || (isPro && !project.isPublic)}
                title={
                  isPro && !project.isPublic
                    ? "Publique o projeto no feed para destacá-lo"
                    : undefined
                }
              >
                <Star size={15} fill={isFeatured ? "currentColor" : "none"} />
                {isFeatured ? "Remover destaque" : "Destacar no perfil"}
                {!isPro && <span className="pro-badge">PRO</span>}
              </button>

              <button
                className="secondary-button full-width pro-action"
                type="button"
                onClick={handleCompare}
              >
                <GitCompare size={15} />
                Comparar com outro projeto
                {!isPro && <span className="pro-badge">PRO</span>}
              </button>
            </div>

            <p className="side-card-sub">
              O destaque fixa este projeto no topo do seu perfil. Só projetos
              públicos podem ser destacados.
            </p>
          </div>
        </aside>
      </div>

      {modal === "parts" && (
        <Modal
          title={`Peças do projeto (${projectParts.length})`}
          className="modal-wide"
          onClose={() => setModal(null)}
          footer={
            <>
              {!isLocked && (
                <button
                  className="secondary-button"
                  type="button"
                  onClick={goToConfigurator}
                >
                  <Plus size={15} /> Adicionar peças
                </button>
              )}

              <button
                className="primary-button"
                type="button"
                onClick={() => setModal(null)}
              >
                Fechar
              </button>
            </>
          }
        >
          {projectParts.length === 0 ? (
            <div className="project-parts-empty">
              <div className="project-parts-empty-icon">
                <Package size={24} />
              </div>
              <strong>Nenhuma peça adicionada ainda</strong>
              <p>Abra o configurador 3D para escolher as peças do projeto.</p>
            </div>
          ) : (
            <div className="parts-modal-body">
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
            </div>
          )}
        </Modal>
      )}

      {modal === "compare" && (
        <CompareModal
          project={project}
          token={token}
          onClose={() => setModal(null)}
          onSubmit={(otherId) =>
            navigate(`/comparar?a=${project.id}&b=${otherId}`)
          }
        />
      )}

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

      {modal === "export-image" && (
        <ExportImageModal
          onExport={handleStartExport}
          onClose={() => setModal(null)}
        />
      )}

      {hdCapture && (
        <CoverCapture
          modelUrl={scene.modelUrl}
          parts={scene.parts}
          width={1920}
          height={1080}
          paint={savedPaint}
          azimuth={hdCapture.angle.azimuth}
          elevation={hdCapture.angle.elevation}
          mimeType={hdCapture.format.mimeType}
          quality={0.92}
          onCapture={handleHdCaptured}
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

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useGLTF } from "@react-three/drei";
import CarViewer3D from "../components/CarViewer3D";
import CoverCapture from "../components/CoverCapture";
import { useGlobalLoading } from "../context/LoadingContext";
import { useAuth } from "../context/AuthContext";
import { build3DScene } from "../utils/build3DScene";
import { DEFAULT_FINISH, paintFromProject } from "../utils/paint";
import { vehicleLabel as formatVehicleLabel } from "../utils/vehicleLabel";
import {
  getProject,
  getProjectParts,
  getPartCategories,
  getPartsByCategory,
  getCompatibilitiesByVehicle,
  addPartToProject,
  removePartFromProject,
  updateProjectPaint,
  uploadProjectCover,
} from "../services/api";

const CATEGORY_ALIASES = {
  wheels: ["rodas e pneus", "rodas", "pneus"],
  suspension: ["suspensão", "suspensao"],
  brakes: ["freios", "freio"],
  engine: ["motor"],
  exhaust: ["escapamento"],
  exterior: ["exterior"],
};

export default function ConfiguratorPage() {
  const { id } = useParams();
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [projectParts, setProjectParts] = useState([]);
  const [projectPartDetails, setProjectPartDetails] = useState({});
  const [categories, setCategories] = useState([]);
  const [compatibilities, setCompatibilities] = useState({});

  const [parts, setParts] = useState([]);
  const [active3DCategory, setActive3DCategory] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [loadingParts, setLoadingParts] = useState(false);
  const categoryRequestRef = useRef(null);

  const [saving, setSaving] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const savingRef = useRef(false);

  // ids das peças como estavam no banco quando a tela abriu
  const initialPartIdsRef = useRef([]);
  // detalhes dessas mesmas peças (o rascunho pode remover peças de
  // projectPartDetails, mas a capa precisa do estado que está salvo)
  const initialDetailsRef = useRef({});

  // pintura: o rascunho aparece no carro na hora e só vale depois de salvar
  const [paintDraft, setPaintDraft] = useState({
    color: "",
    finish: DEFAULT_FINISH,
  });
  // pintura como estava no banco quando a tela abriu (ou foi salva por último)
  const initialPaintRef = useRef({ color: "", finish: DEFAULT_FINISH });

  // cena usada na foto da capa quando a pessoa sai sem salvar
  const [captureScene, setCaptureScene] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // transição de carregamento: ao abrir (dados) e ao salvar (inclui a capa)
  useGlobalLoading(loading || saving || capturing);

  // Projeto livre sem Pro ativo abre só para visualizar (o servidor também recusa).
  const readOnly = project?.mode === "FREE" && !user?.isPro;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const projectData = await getProject(token, id);
        const loadedProject = projectData.project;

        const [partsData, categoriesData, compatibilitiesData] =
          await Promise.all([
            getProjectParts(token, loadedProject.id),
            getPartCategories(),
            getCompatibilitiesByVehicle(loadedProject.vehicleId),
          ]);

        if (cancelled) return;

        const compatibilityMap = {};
        (compatibilitiesData.compatibilities || []).forEach((item) => {
          compatibilityMap[item.partId] = item;
        });

        const details = {};
        (partsData.parts || []).forEach((item) => {
          if (item.part) details[item.partId] = item.part;
        });

        initialPartIdsRef.current = (partsData.parts || []).map(
          (item) => item.partId,
        );

        initialDetailsRef.current = details;

        const loadedPaint = {
          color: loadedProject.paintColor || "",
          finish: loadedProject.paintFinish || DEFAULT_FINISH,
        };

        initialPaintRef.current = loadedPaint;
        setPaintDraft(loadedPaint);

        setProject(loadedProject);
        // o backend já devolve o veículo (id, model3dUrl, marca, modelo...)
        setVehicle(loadedProject.vehicle || null);
        setProjectParts(partsData.parts || []);
        setProjectPartDetails(details);
        setCategories(categoriesData.categories || []);
        setCompatibilities(compatibilityMap);
      } catch (err) {
        if (!cancelled)
          setError(err.message || "Erro ao abrir o configurador.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [id, token]);

  // há alterações em relação ao que está salvo?
  const initialIds = initialPartIdsRef.current;
  const partsDirty =
    initialIds.length !== projectParts.length ||
    projectParts.some((item) => !initialIds.includes(item.partId));

  const paintDirty =
    paintDraft.color.toLowerCase() !==
      initialPaintRef.current.color.toLowerCase() ||
    (Boolean(paintDraft.color) &&
      paintDraft.finish !== initialPaintRef.current.finish);

  const isDirty = partsDirty || paintDirty;

  // avisa se tentarem fechar a aba com alterações pendentes
  useEffect(() => {
    if (!isDirty) return;

    const warn = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  const scene = useMemo(
    () => build3DScene(vehicle, projectPartDetails),
    [vehicle, projectPartDetails],
  );

  // pintura mostrada no carro: o rascunho (objeto estável, só muda com a cor/acabamento)
  const draftColor = paintDraft.color;
  const draftFinish = paintDraft.finish;

  const paint = useMemo(
    () => (draftColor ? { color: draftColor, finish: draftFinish } : null),
    [draftColor, draftFinish],
  );

  function handlePaintReset() {
    setPaintDraft({ color: "", finish: DEFAULT_FINISH });
  }

  // Modelos 3D que podem aparecer na tela ao adicionar uma peça da categoria
  // aberta (inclui a troca de modelo base do Astra com rodas).
  const preloadUrls = useMemo(() => {
    const baseUrl = build3DScene(vehicle, {}).modelUrl;
    const urls = new Set();

    parts.forEach((part) => {
      const candidate = build3DScene(vehicle, { [part.id]: part });

      if (candidate.modelUrl && candidate.modelUrl !== baseUrl) {
        urls.add(candidate.modelUrl);
      }

      candidate.parts.forEach((item) => {
        if (item.modelUrl) urls.add(item.modelUrl);
      });
    });

    return [...urls];
  }, [parts, vehicle]);

  // Baixa os modelos em segundo plano, UM por vez e espaçados. Antes tudo era
  // processado de uma vez no clique da categoria, e o carro engasgava.
  useEffect(() => {
    if (preloadUrls.length === 0) return undefined;

    let cancelled = false;
    let index = 0;
    let timer;

    function next() {
      if (cancelled || index >= preloadUrls.length) return;

      useGLTF.preload(preloadUrls[index]);
      index += 1;
      timer = setTimeout(next, 700);
    }

    timer = setTimeout(next, 500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [preloadUrls]);

  async function handleCategoryChange(categoryKey, categoryLabel) {
    setActive3DCategory(categoryKey);
    setError("");

    const aliases = CATEGORY_ALIASES[categoryKey] || [
      categoryLabel.trim().toLowerCase(),
    ];

    const category = categories.find((item) => {
      const name = item.name?.trim().toLowerCase();
      return name && aliases.includes(name);
    });

    if (!category) {
      setSelectedCategoryId("");
      setParts([]);
      setError(
        `Não foi encontrada uma categoria cadastrada para ${categoryLabel}.`,
      );
      return;
    }

    setSelectedCategoryId(String(category.id));
    setParts([]);

    // se a pessoa trocar de categoria antes da resposta chegar, ignora a antiga
    categoryRequestRef.current = category.id;
    const isCurrent = () => categoryRequestRef.current === category.id;

    try {
      setLoadingParts(true);
      const data = await getPartsByCategory(category.id, token);
      if (isCurrent()) setParts(data.parts || []);
    } catch (err) {
      if (isCurrent()) {
        setError(err.message || "Não foi possível carregar as peças.");
      }
    } finally {
      if (isCurrent()) setLoadingParts(false);
    }
  }

  // Só altera o rascunho local. O banco é atualizado em handleSave.
  function handleAddPart(part) {
    if (readOnly) {
      setError("Projeto livre bloqueado: renove o Pro para editar.");
      return;
    }

    const compatibility = compatibilities[part.id];
    const isReal = project.mode === "REAL";

    if (isReal && !compatibility) {
      setError(
        "A compatibilidade desta peça ainda não foi cadastrada para o veículo.",
      );
      return;
    }

    if (compatibility?.level === "INCOMPATIBLE") {
      setError("Esta peça é incompatível com o veículo selecionado.");
      return;
    }

    if (projectParts.some((item) => item.partId === part.id)) {
      setError("Esta peça já está no projeto.");
      return;
    }

    setError("");
    setProjectParts((current) => [
      ...current,
      {
        partId: part.id,
        quantity: 1,
        priceAtTime: part.estimatedPrice ?? null,
      },
    ]);
    setProjectPartDetails((current) => ({ ...current, [part.id]: part }));
  }

  function handleRemovePart(partId) {
    if (readOnly) return;

    setError("");
    setProjectParts((current) =>
      current.filter((item) => item.partId !== partId),
    );
    setProjectPartDetails((current) => {
      const updated = { ...current };
      delete updated[partId];
      return updated;
    });
  }

  if (loading) {
    return (
      <div className="configurator-fullscreen configurator-status">
        <p>Carregando configurador...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="configurator-fullscreen configurator-status">
        <p>{error || "Projeto não encontrado."}</p>
        <button
          type="button"
          className="secondary-button"
          onClick={() => navigate("/projetos")}
        >
          Voltar
        </button>
      </div>
    );
  }

  const { modelUrl: vehicleModelUrl, parts: visible3DParts } = scene;

  const projectTotal = projectParts.reduce((total, item) => {
    const part = projectPartDetails[item.partId];
    const price = Number(item.priceAtTime ?? part?.estimatedPrice ?? 0);
    return total + price * Number(item.quantity ?? 1);
  }, 0);

  const vehicleText = formatVehicleLabel(vehicle, { withVersion: true });

  const backToProject = () => navigate(`/projetos/${project.id}`);

  // Sai sem salvar. Se o projeto ainda não tem capa (ex.: acabou de ser criado),
  // fotografa o carro como está SALVO no banco, sem as peças do rascunho.
  function leaveWithoutSaving() {
    if (savingRef.current) return;
    setConfirmOpen(false);

    if (project.coverUrl || !vehicle) {
      backToProject();
      return;
    }

    const savedDetails = {};
    initialPartIdsRef.current.forEach((partId) => {
      if (initialDetailsRef.current[partId]) {
        savedDetails[partId] = initialDetailsRef.current[partId];
      }
    });

    const savedPaint = initialPaintRef.current.color
      ? { ...initialPaintRef.current }
      : null;

    const savedScene = { ...build3DScene(vehicle, savedDetails), paint: savedPaint };

    if (!savedScene.modelUrl) {
      backToProject();
      return;
    }

    savingRef.current = true;
    setCaptureScene(savedScene);
    setCapturing(true);
  }

  // Cancelar: pede confirmação só se houver alterações
  function handleCancel() {
    if (saving || capturing) return;

    // só visualização: não há o que salvar nem capa para refazer
    if (readOnly) {
      backToProject();
      return;
    }

    if (isDirty) setConfirmOpen(true);
    else leaveWithoutSaving();
  }

  async function handleSave() {
    if (readOnly || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError("");

    try {
      const currentIds = projectParts.map((item) => item.partId);

      const toRemove = initialPartIdsRef.current.filter(
        (partId) => !currentIds.includes(partId),
      );
      const toAdd = projectParts.filter(
        (item) => !initialPartIdsRef.current.includes(item.partId),
      );

      await Promise.all(
        toRemove.map((partId) =>
          removePartFromProject(token, project.id, partId),
        ),
      );
      await Promise.all(
        toAdd.map((item) =>
          addPartToProject(token, project.id, item.partId, item.quantity ?? 1),
        ),
      );

      initialPartIdsRef.current = currentIds;

      // pintura: só vai ao servidor se mudou (assim quem é Free e só mexeu em
      // peças não esbarra na regra de cores do Pro)
      if (paintDirty) {
        await updateProjectPaint(
          token,
          project.id,
          paintDraft.color || null,
          paintDraft.color ? paintDraft.finish : null,
        );

        initialPaintRef.current = { ...paintDraft };
      }
    } catch (err) {
      setError(err.message || "Erro ao salvar o projeto.");
      savingRef.current = false;
      setSaving(false);
      return;
    }

    // sem modelo 3D não há o que fotografar
    if (!vehicleModelUrl) {
      backToProject();
      return;
    }

    setCapturing(true);
  }

  async function handleCoverCaptured(image) {
    try {
      if (image) await uploadProjectCover(token, project.id, image);
    } catch (err) {
      console.error(err); // falhar na capa não deve impedir de sair
    }

    backToProject();
  }

  return (
    <div className="configurator-fullscreen">
      <CarViewer3D
        modelUrl={vehicleModelUrl}
        parts={visible3DParts}
        selectedCategory={active3DCategory}
        onCategoryChange={handleCategoryChange}
        total={projectTotal}
        projectName={project.name}
        vehicleLabel={vehicleText}
        isDirty={isDirty}
        saving={saving}
        onCancel={handleCancel}
        onSave={handleSave}
        projectMode={project.mode}
        readOnly={readOnly}
        paint={paint}
        paintDraft={paintDraft}
        onPaintChange={setPaintDraft}
        onPaintReset={handlePaintReset}
        isPro={Boolean(user?.isPro)}
        categories={categories}
        catalogParts={parts}
        compatibilities={compatibilities}
        currentProject={project}
        selectedCategoryId={selectedCategoryId}
        loadingCategories={false}
        loadingParts={loadingParts}
        projectParts={projectParts}
        projectPartDetails={projectPartDetails}
        onAddPart={handleAddPart}
        onRemovePart={handleRemovePart}
        onCatalogCategoryChange={handleCategoryChange}
      />

      {capturing && (
        <CoverCapture
          modelUrl={captureScene?.modelUrl ?? vehicleModelUrl}
          parts={captureScene?.parts ?? visible3DParts}
          paint={captureScene ? captureScene.paint : paint}
          onCapture={handleCoverCaptured}
        />
      )}

      {saving && <div className="configurator-saving">Salvando projeto...</div>}

      {confirmOpen && (
        <div
          className="configurator-modal-backdrop"
          onClick={() => setConfirmOpen(false)}
        >
          <div
            className="configurator-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="cancel-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id="cancel-title">Cancelar edição?</h3>
            <p>As alterações feitas não serão salvas.</p>

            <div className="configurator-modal-actions">
              <button
                type="button"
                className="configurator-back-button"
                onClick={() => setConfirmOpen(false)}
                autoFocus
              >
                Continuar editando
              </button>
              <button
                type="button"
                className="configurator-danger-button"
                onClick={leaveWithoutSaving}
              >
                Descartar alterações
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <button
          type="button"
          className="configurator-toast"
          onClick={() => setError("")}
        >
          {error} ✕
        </button>
      )}
    </div>
  );
}

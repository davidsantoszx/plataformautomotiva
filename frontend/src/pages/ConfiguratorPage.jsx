import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import CarViewer3D from "../components/CarViewer3D";
import { useAuth } from "../context/AuthContext";
import { build3DScene } from "../utils/build3DScene";
import CoverCapture from "../components/CoverCapture";
import {
  getProject,
  getProjectParts,
  getPartCategories,
  getPartsByCategory,
  getCompatibilitiesByVehicle,
  addPartToProject,
  removePartFromProject,
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
  const { token } = useAuth();
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

  const [capturing, setCapturing] = useState(false);
  const finishingRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

    try {
      setLoadingParts(true);
      const data = await getPartsByCategory(category.id);
      setParts(data.parts || []);
    } catch (err) {
      setError(err.message || "Não foi possível carregar as peças.");
    } finally {
      setLoadingParts(false);
    }
  }

  async function handleAddPart(part) {
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

    try {
      setError("");
      const data = await addPartToProject(token, project.id, part.id, 1);

      setProjectParts((current) => [...current, data.projectPart]);
      setProjectPartDetails((current) => ({ ...current, [part.id]: part }));
    } catch (err) {
      setError(err.message || "Erro ao adicionar peça ao projeto.");
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

  const { modelUrl: vehicleModelUrl, parts: visible3DParts } = build3DScene(
    vehicle,
    projectPartDetails,
  );

  const projectTotal = projectParts.reduce((total, item) => {
    const part = projectPartDetails[item.partId];
    const price = Number(item.priceAtTime ?? part?.estimatedPrice ?? 0);
    return total + price * Number(item.quantity ?? 1);
  }, 0);

  const backToProject = () => navigate(`/projetos/${project.id}`);

  function finish() {
    if (finishingRef.current) return;
    finishingRef.current = true;

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
        onBack={finish}
        onContinue={finish}
        projectMode={project.mode}
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
        <>
          <CoverCapture
            modelUrl={vehicleModelUrl}
            parts={visible3DParts}
            onCapture={handleCoverCaptured}
          />
          <div className="configurator-saving">Salvando projeto...</div>
        </>
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

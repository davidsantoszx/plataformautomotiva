import { useRef, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import VehicleSelector from "../components/VehicleSelector";
import ProjectBuilder from "../components/ProjectBuilder";
import useVehicleSelection from "../hooks/useVehicleSelection";
import { useAuth } from "../context/AuthContext";
import { createProject } from "../services/api";

export default function NewProjectPage() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const vehicle = useVehicleSelection();

  // Projeto livre é exclusivo do plano Pro. No Free o modo é sempre real.
  const canUseFreeMode = Boolean(user?.isPro);

  const [projectName, setProjectName] = useState("");
  const [projectMode, setProjectMode] = useState("REAL");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const builderRef = useRef(null);

  // ao escolher a versão, rola até o formulário do projeto
  useEffect(() => {
    if (!vehicle.selectedVehicle) return;

    const timer = setTimeout(() => {
      builderRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);

    return () => clearTimeout(timer);
  }, [vehicle.selectedVehicle]);

  async function handleGoToModifications() {
    setError("");

    if (!projectName.trim()) {
      setError("Informe um nome para o projeto.");
      return;
    }

    try {
      setLoading(true);

      const data = await createProject(
        token,
        Number(vehicle.selectedVehicle),
        projectName.trim(),
        canUseFreeMode ? projectMode : "REAL",
      );

      navigate(`/projetos/${data.project.id}/configurar`);
    } catch (err) {
      // inclui as mensagens do servidor, como o limite de projetos do Free
      setError(err.message || "Erro ao criar projeto.");
      setLoading(false);
    }
  }

  return (
    <>
      <VehicleSelector
        brands={vehicle.brands}
        models={vehicle.models}
        years={vehicle.years}
        vehicles={vehicle.visibleVehicles}
        selectedBrand={vehicle.selectedBrand}
        selectedModel={vehicle.selectedModel}
        selectedYear={vehicle.selectedYear}
        selectedVehicle={vehicle.selectedVehicle}
        loadingBrands={vehicle.loadingBrands}
        loadingModels={vehicle.loadingModels}
        loadingVehicles={vehicle.loadingVehicles}
        onBrandChange={vehicle.handleBrandChange}
        onModelChange={vehicle.handleModelChange}
        onYearChange={vehicle.handleYearChange}
        onVehicleChange={vehicle.handleVehicleChange}
      />

      {vehicle.error && (
        <p className="message message-error page-message">{vehicle.error}</p>
      )}

      {vehicle.selectedVehicle && (
        <div ref={builderRef}>
          <ProjectBuilder
            selectedVehicleData={vehicle.selectedVehicleData}
            projectName={projectName}
            projectMode={projectMode}
            canUseFreeMode={canUseFreeMode}
            loading={loading}
            projectError={error}
            onProjectNameChange={setProjectName}
            onProjectModeChange={setProjectMode}
            onGoToModifications={handleGoToModifications}
          />
        </div>
      )}
    </>
  );
}

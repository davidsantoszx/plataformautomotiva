import { Link } from "react-router-dom";

export default function ProjectBuilder({
  selectedVehicleData,
  projectName,
  projectMode,
  canUseFreeMode = false,
  loading,
  projectError,
  showPlansLink = false,
  onProjectNameChange,
  onProjectModeChange,
  onGoToModifications,
}) {
  return (
    <section className="dashboard-section builder-section">
      <div className="section-heading">
        <span className="section-eyebrow">PROJETO</span>
        <h2>Montar projeto</h2>
      </div>

      {selectedVehicleData && (
        <div className="selected-vehicle">
          <span>VEÍCULO SELECIONADO</span>

          <strong>
            {selectedVehicleData.year} {selectedVehicleData.version || ""}
          </strong>
        </div>
      )}

      <div className="project-create-form">
        <div className="form-field">
          <label htmlFor="project-name">Nome do projeto</label>

          <input
            id="project-name"
            value={projectName}
            onChange={(event) => onProjectNameChange(event.target.value)}
            placeholder="Ex.: Corolla XEi 2023"
          />
        </div>

        {canUseFreeMode ? (
          <div className="mode-selector">
            <span>Modo do projeto</span>

            <div className="mode-options">
              <label className={projectMode === "REAL" ? "selected" : ""}>
                <input
                  type="radio"
                  name="project-mode"
                  value="REAL"
                  checked={projectMode === "REAL"}
                  onChange={(event) => onProjectModeChange(event.target.value)}
                />
                <strong>Projeto Real</strong>
                <small>Respeita compatibilidades.</small>
              </label>

              <label className={projectMode === "FREE" ? "selected" : ""}>
                <input
                  type="radio"
                  name="project-mode"
                  value="FREE"
                  checked={projectMode === "FREE"}
                  onChange={(event) => onProjectModeChange(event.target.value)}
                />
                <strong>Projeto Livre</strong>
                <small>Permite combinações livres.</small>
              </label>
            </div>
          </div>
        ) : (
          <div className="mode-fixed">
            <span>Modo do projeto</span>

            <p>
              <strong>Projeto Real</strong>: só aceita peças compatíveis com o
              veículo.
            </p>

            <small>
              O Projeto Livre, com combinações sem restrição, é exclusivo do
              plano Pro.
            </small>
          </div>
        )}

        <button
          className="primary-button"
          type="button"
          onClick={onGoToModifications}
          disabled={loading}
        >
          {loading ? "Criando projeto..." : "Ir para modificações"}
        </button>
      </div>

      {projectError && (
        <p className="message message-error">
          {projectError}

          {showPlansLink && (
            <Link to="/planos" className="message-link">
              Ver planos
            </Link>
          )}
        </p>
      )}
    </section>
  );
}

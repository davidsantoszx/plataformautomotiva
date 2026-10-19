export default function ProjectBuilder({
  selectedVehicleData,
  projectName,
  projectMode,
  loading,
  projectError,
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

        <button
          className="primary-button"
          type="button"
          onClick={onGoToModifications}
          disabled={loading}
        >
          {loading ? "Criando projeto..." : "Ir para modificações"}
        </button>
      </div>

      {projectError && <p className="message message-error">{projectError}</p>}
    </section>
  );
}
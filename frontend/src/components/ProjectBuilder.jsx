export default function ProjectBuilder({
  selectedVehicleData,
  currentProject,
  projectName,
  projectMode,
  loadingProject,
  projectError,
  onProjectNameChange,
  onProjectModeChange,
  onCreate,
  onNewProject,
}) {
  return (
    <section className="dashboard-section builder-section">
      <div className="section-heading">
        <span className="section-eyebrow">
          PROJETO
        </span>

        <h2>Montar projeto</h2>
      </div>

      {selectedVehicleData && (
        <div className="selected-vehicle">
          <span>VEÍCULO SELECIONADO</span>

          <strong>
            {selectedVehicleData.year}{' '}
            {selectedVehicleData.version || ''}
          </strong>
        </div>
      )}

      {!currentProject ? (
        <form
          className="project-create-form"
          onSubmit={onCreate}
        >
          <div className="form-field">
            <label htmlFor="project-name">
              Nome do projeto
            </label>

            <input
              id="project-name"
              value={projectName}
              onChange={(event) =>
                onProjectNameChange(
                  event.target.value,
                )
              }
              placeholder="Ex.: Corolla XEi 2023"
            />
          </div>

          <div className="mode-selector">
            <span>Modo do projeto</span>

            <div className="mode-options">
              <label
                className={
                  projectMode === 'REAL'
                    ? 'selected'
                    : ''
                }
              >
                <input
                  type="radio"
                  name="project-mode"
                  value="REAL"
                  checked={
                    projectMode === 'REAL'
                  }
                  onChange={(event) =>
                    onProjectModeChange(
                      event.target.value,
                    )
                  }
                />

                <strong>Projeto Real</strong>

                <small>
                  Respeita compatibilidades.
                </small>
              </label>

              <label
                className={
                  projectMode === 'FREE'
                    ? 'selected'
                    : ''
                }
              >
                <input
                  type="radio"
                  name="project-mode"
                  value="FREE"
                  checked={
                    projectMode === 'FREE'
                  }
                  onChange={(event) =>
                    onProjectModeChange(
                      event.target.value,
                    )
                  }
                />

                <strong>Projeto Livre</strong>

                <small>
                  Permite combinações livres.
                </small>
              </label>
            </div>
          </div>

          <button
            className="primary-button"
            type="submit"
            disabled={loadingProject}
          >
            {loadingProject
              ? 'Criando projeto...'
              : 'Criar projeto'}
          </button>
        </form>
      ) : (
        <div className="active-project-box">
          <span>PROJETO ATUAL</span>

          <h3>{currentProject.name}</h3>

          <p>
            {currentProject.mode === 'REAL'
              ? 'Projeto Real'
              : 'Projeto Livre'}
          </p>

          <button
            className="secondary-button"
            type="button"
            onClick={onNewProject}
          >
            Criar outro projeto
          </button>
        </div>
      )}

      {projectError && (
        <p className="message message-error">
          {projectError}
        </p>
      )}
    </section>
  )
}
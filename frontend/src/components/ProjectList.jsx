export default function ProjectList({
  projects,
  loading,
  error,
  onOpen,
}) {
  return (
    <section className="dashboard-section projects-section">
      <div className="section-heading">
        <div>
          <span className="section-eyebrow">
            SEUS PROJETOS
          </span>

          <h2>Meus Projetos</h2>
        </div>
      </div>

      {loading && (
        <div className="empty-state">
          <p>Carregando seus projetos...</p>
        </div>
      )}

      {!loading && projects.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">+</div>
          <h3>Nenhum projeto ainda</h3>
          <p>
            Selecione um veículo abaixo para começar
            seu primeiro projeto.
          </p>
        </div>
      )}

      {!loading && projects.length > 0 && (
        <div className="project-grid">
          {projects.map((project) => (
            <article
              className="project-card"
              key={project.id}
            >
              <div className="project-card-top">
                <span className="project-number">
                  #{String(project.id).padStart(3, '0')}
                </span>

                <span
                  className={`project-status ${
                    project.isPublic
                      ? 'public'
                      : 'private'
                  }`}
                >
                  {project.isPublic
                    ? 'Público'
                    : 'Privado'}
                </span>
              </div>

              <h3>{project.name}</h3>

              <p className="project-mode">
                {project.mode === 'REAL'
                  ? 'Projeto Real'
                  : 'Projeto Livre'}
              </p>

              <p className="project-vehicle">
                Veículo ID: {project.vehicleId}
              </p>

              <button
                className="primary-button"
                type="button"
                onClick={() => onOpen(project.id)}
              >
                Abrir projeto
              </button>
            </article>
          ))}
        </div>
      )}

      {error && (
        <p className="message message-error">
          {error}
        </p>
      )}
    </section>
  )
}
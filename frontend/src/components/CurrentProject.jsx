function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

export default function CurrentProject({
  currentProject,
  projectParts,
  projectPartDetails,
  projectTotal,
  editingProject,
  editProjectName,
  editProjectMode,
  projectActionLoading,
  projectError,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onEditNameChange,
  onEditModeChange,
  onDuplicate,
  onDelete,
  onTogglePublication,
  onCopyShareLink,
  onUpdateQuantity,
  onRemovePart,
  onCloseProject,
}) {
  return (
    <section className="dashboard-section current-project-section">
      <div className="current-project-header">
        <div>
          <span className="section-eyebrow">
            PROJETO ATUAL
          </span>

          <h2>{currentProject.name}</h2>

          <p>
            {currentProject.mode === 'REAL'
              ? 'Projeto Real'
              : 'Projeto Livre'}
          </p>
        </div>

        <span
          className={`project-status ${
            currentProject.isPublic
              ? 'public'
              : 'private'
          }`}
        >
          {currentProject.isPublic
            ? 'Público'
            : 'Privado'}
        </span>
      </div>

      {!editingProject ? (
       <div className="project-actions">
  <div className="project-actions-main">
    <button
      className="primary-button"
      type="button"
      onClick={onStartEdit}
      disabled={projectActionLoading}
    >
      Editar
    </button>

    <button
      className="secondary-button"
      type="button"
      onClick={onDuplicate}
      disabled={projectActionLoading}
    >
      Duplicar
    </button>

    <button
      className="secondary-button"
      type="button"
      onClick={onTogglePublication}
      disabled={projectActionLoading}
    >
      {currentProject.isPublic
        ? 'Despublicar'
        : 'Publicar'}
    </button>

    {currentProject.isPublic &&
      currentProject.shareToken && (
        <button
          className="secondary-button"
          type="button"
          onClick={onCopyShareLink}
          disabled={projectActionLoading}
        >
          Copiar link
        </button>
      )}

    <button
      className="danger-button"
      type="button"
      onClick={onDelete}
      disabled={projectActionLoading}
    >
      Excluir
    </button>
  </div>

  <button
    className="secondary-button project-close-button"
    type="button"
    onClick={onCloseProject}
    disabled={projectActionLoading}
  >
    Fechar projeto
  </button>
</div>
      ) : (
        <form
          className="project-edit-form"
          onSubmit={onSaveEdit}
        >
          <div className="form-field">
            <label htmlFor="edit-project-name">
              Nome do projeto
            </label>

            <input
              id="edit-project-name"
              value={editProjectName}
              onChange={(event) =>
                onEditNameChange(
                  event.target.value,
                )
              }
            />
          </div>

          <div className="mode-options">
            <label>
              <input
                type="radio"
                name="edit-project-mode"
                value="REAL"
                checked={
                  editProjectMode === 'REAL'
                }
                onChange={(event) =>
                  onEditModeChange(
                    event.target.value,
                  )
                }
              />
              Projeto Real
            </label>

            <label>
              <input
                type="radio"
                name="edit-project-mode"
                value="FREE"
                checked={
                  editProjectMode === 'FREE'
                }
                onChange={(event) =>
                  onEditModeChange(
                    event.target.value,
                  )
                }
              />
              Projeto Livre
            </label>
          </div>

          <div className="project-actions">
            <button
              className="primary-button"
              type="submit"
              disabled={projectActionLoading}
            >
              {projectActionLoading
                ? 'Salvando...'
                : 'Salvar alterações'}
            </button>

            <button
              className="secondary-button"
              type="button"
              onClick={onCancelEdit}
              disabled={projectActionLoading}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="parts-project-list">
        <div className="parts-project-heading">
          <h3>Peças do projeto</h3>

          <span>
            {projectParts.length} item
            {projectParts.length !== 1
              ? 's'
              : ''}
          </span>
        </div>

        {projectParts.length === 0 ? (
          <div className="empty-state">
            <p>Nenhuma peça adicionada ainda.</p>
          </div>
        ) : (
          projectParts.map((projectPart) => {
            const part =
              projectPart.part ||
              projectPartDetails[
                projectPart.partId
              ]

            const quantity = Number(
              projectPart.quantity || 1,
            )

            const unitPrice = Number(
              projectPart.priceAtTime || 0,
            )

            const subtotal =
              unitPrice * quantity

            return (
              <article
                className="project-part-row"
                key={projectPart.id}
              >
                <div className="project-part-info">
                  <h4>
                    {part?.name ||
                      `Peça #${projectPart.partId}`}
                  </h4>

                  {part?.brand && (
                    <span>{part.brand}</span>
                  )}
                </div>

                <div className="project-part-price">
                  <span>
                    {formatCurrency(unitPrice)}
                    {' '}un.
                  </span>

                  <strong>
                    {formatCurrency(subtotal)}
                  </strong>
                </div>

                <div className="quantity-control">
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateQuantity(
                        projectPart.partId,
                        quantity - 1,
                      )
                    }
                    disabled={quantity <= 1}
                  >
                    −
                  </button>

                  <span>{quantity}</span>

                  <button
                    type="button"
                    onClick={() =>
                      onUpdateQuantity(
                        projectPart.partId,
                        quantity + 1,
                      )
                    }
                  >
                    +
                  </button>
                </div>

                <button
                  className="remove-button"
                  type="button"
                  onClick={() =>
                    onRemovePart(
                      projectPart.partId,
                    )
                  }
                >
                  Remover
                </button>
              </article>
            )
          })
        )}
      </div>

      <div className="project-total">
        <span>Total estimado</span>
        <strong>
          {formatCurrency(projectTotal)}
        </strong>
      </div>

      {projectError && (
        <p className="message message-error">
          {projectError}
        </p>
      )}
    </section>
  )
}
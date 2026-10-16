export default function PartsCatalog({
  categories,
  parts,
  compatibilities,
  currentProject,
  selectedCategory,
  loadingCategories,
  loadingParts,
  projectParts,
  onCategoryChange,
  onAddPart,
}) {
  return (
    <>
      <section className="dashboard-section parts-section">
        <div className="section-heading">
          <span className="section-eyebrow">CATÁLOGO</span>

          <h2>Adicionar peças</h2>

          <p>Escolha uma categoria para visualizar as peças disponíveis.</p>
        </div>

        <div className="catalog-select">
          {loadingCategories ? (
            <div className="loading-field">
              Carregando categorias de peças...
            </div>
          ) : (
            <select value={selectedCategory} onChange={onCategoryChange}>
              <option value="">Selecione uma categoria</option>

              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </section>

      {selectedCategory && (
        <section className="dashboard-section">
          <div className="section-heading compact">
            <h2>Peças disponíveis</h2>
          </div>

          {loadingParts && (
            <div className="empty-state">
              <p>Carregando peças...</p>
            </div>
          )}

          {!loadingParts && parts.length === 0 && (
            <div className="empty-state">
              <p>Nenhuma peça cadastrada nesta categoria.</p>
            </div>
          )}

          {!loadingParts && (
            <div className="parts-grid">
              {parts.map((part) => {
                const compatibility = compatibilities[part.id];

                const alreadyAdded = projectParts.some(
                  (item) => item.partId === part.id,
                );

                const isReal = currentProject
                  ? currentProject.mode === "REAL"
                  : false;

                const missing = isReal && !compatibility;

                const incompatible =
                  isReal && compatibility?.level === "INCOMPATIBLE";

                const adaptation =
                  isReal &&
                  (compatibility?.level === "ADAPTATION" ||
                    compatibility?.requiresAdaptation);

                return (
                  <article className="part-card" key={part.id}>
                    <div className="part-card-image">
                      {part.imageUrl ? (
                        <img src={part.imageUrl} alt={part.name} />
                      ) : (
                        <span>PEÇA</span>
                      )}
                    </div>

                    <div className="part-card-content">
                      <span className="part-category">
                        {part.brand || "CATÁLOGO"}
                      </span>

                      <h3>{part.name}</h3>

                      {part.description && <p>{part.description}</p>}

                      <strong className="part-price">
                        {Number(part.estimatedPrice || 0).toLocaleString(
                          "pt-BR",
                          {
                            style: "currency",
                            currency: "BRL",
                          },
                        )}
                      </strong>

                      {isReal && (
                        <div
                          className={`compatibility ${
                            incompatible
                              ? "incompatible"
                              : adaptation
                                ? "adaptation"
                                : compatibility
                                  ? "compatible"
                                  : "missing"
                          }`}
                        >
                          {!compatibility
                            ? "Compatibilidade não cadastrada"
                            : compatibility.level === "COMPATIBLE"
                              ? "Compatível"
                              : compatibility.level === "ADAPTATION"
                                ? "Requer adaptação"
                                : "Incompatível"}
                        </div>
                      )}

                      <button
                        className="primary-button full-width"
                        type="button"
                        disabled={alreadyAdded || missing || incompatible}
                        onClick={() => onAddPart(part)}
                      >
                        {alreadyAdded
                          ? "Já adicionada"
                          : incompatible
                            ? "Incompatível"
                            : missing
                              ? "Compatibilidade não cadastrada"
                              : adaptation
                                ? "Adicionar com adaptação"
                                : "Adicionar ao projeto"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}
    </>
  );
}

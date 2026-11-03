import { useEffect, useRef, useState } from "react";

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
  onRemovePart,
}) {
  const gridRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  function updateArrows() {
    const el = gridRef.current;
    if (!el) return;

    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }

  function scrollParts(direction) {
    gridRef.current?.scrollBy({ left: direction * 420, behavior: "smooth" });
  }

  useEffect(() => {
    updateArrows();

    const el = gridRef.current;
    if (!el) return;

    const observer = new ResizeObserver(updateArrows);
    observer.observe(el);

    return () => observer.disconnect();
  }, [parts, loadingParts, selectedCategory]);

  return (
    <>
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
            <div className="parts-carousel">
              {canScrollLeft && (
                <button
                  type="button"
                  className="parts-arrow parts-arrow-left"
                  onClick={() => scrollParts(-1)}
                  aria-label="Peças anteriores"
                >
                  ‹
                </button>
              )}

              <div className="parts-grid" ref={gridRef} onScroll={updateArrows}>
                {parts.map((part) => {
                  const compatibility = compatibilities[part.id];

                  const alreadyAdded = projectParts.some(
                    (item) => item.partId === part.id,
                  );

                  const isReal = currentProject?.mode === "REAL";

                  const missing = isReal && !compatibility;

                  const incompatible =
                    isReal && compatibility?.level === "INCOMPATIBLE";

                  const adaptation =
                    isReal &&
                    (compatibility?.level === "ADAPTATION" ||
                      compatibility?.requiresAdaptation);

                  return (
                    <article
                      className={`part-card ${alreadyAdded ? "selected" : ""}`}
                      key={part.id}
                    >
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

                        {alreadyAdded ? (
                          <button
                            className="danger-button full-width"
                            type="button"
                            onClick={() => onRemovePart?.(part.id)}
                          >
                            Remover peça
                          </button>
                        ) : (
                          // sem compatibilidade ou incompatível: só o aviso
                          // acima, sem botão
                          !missing &&
                          !incompatible && (
                            <button
                              className="primary-button full-width"
                              type="button"
                              onClick={() => onAddPart(part)}
                            >
                              {adaptation
                                ? "Adicionar com adaptação"
                                : "Adicionar ao projeto"}
                            </button>
                          )
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>

              {canScrollRight && (
                <button
                  type="button"
                  className="parts-arrow parts-arrow-right"
                  onClick={() => scrollParts(1)}
                  aria-label="Próximas peças"
                >
                  ›
                </button>
              )}
            </div>
          )}
        </section>
      )}
    </>
  );
}

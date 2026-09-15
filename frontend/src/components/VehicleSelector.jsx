export default function VehicleSelector({
  brands,
  models,
  generations,
  vehicles,
  selectedBrand,
  selectedModel,
  selectedGeneration,
  selectedVehicle,
  loadingBrands,
  loadingModels,
  loadingGenerations,
  loadingVehicles,
  onBrandChange,
  onModelChange,
  onGenerationChange,
  onVehicleChange,
}) {
  return (
    <section className="dashboard-section vehicle-section">
      <div className="section-heading">
        <span className="section-eyebrow">
          CONFIGURAÇÃO
        </span>

        <h2>Selecione seu veículo</h2>

        <p>
          Escolha o veículo que será usado no seu
          projeto.
        </p>
      </div>

      <div className="vehicle-selector-grid">
        <div className="select-field">
          <label>Marca</label>

          {loadingBrands ? (
            <div className="loading-field">
              Carregando marcas...
            </div>
          ) : (
            <select
              value={selectedBrand}
              onChange={onBrandChange}
            >
              <option value="">
                Selecione uma marca
              </option>

              {brands.map((brand) => (
                <option
                  key={brand.id}
                  value={brand.id}
                >
                  {brand.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="select-field">
          <label>Modelo</label>

          <select
            value={selectedModel}
            onChange={onModelChange}
            disabled={!selectedBrand || loadingModels}
          >
            <option value="">
              {loadingModels
                ? 'Carregando...'
                : 'Selecione um modelo'}
            </option>

            {models.map((model) => (
              <option
                key={model.id}
                value={model.id}
              >
                {model.name}
              </option>
            ))}
          </select>
        </div>

        <div className="select-field">
          <label>Geração</label>

          <select
            value={selectedGeneration}
            onChange={onGenerationChange}
            disabled={
              !selectedModel ||
              loadingGenerations
            }
          >
            <option value="">
              {loadingGenerations
                ? 'Carregando...'
                : 'Selecione uma geração'}
            </option>

            {generations.map((generation) => (
              <option
                key={generation.id}
                value={generation.id}
              >
                {generation.name}
              </option>
            ))}
          </select>
        </div>

        <div className="select-field">
          <label>Veículo</label>

          <select
            value={selectedVehicle}
            onChange={onVehicleChange}
            disabled={
              !selectedGeneration ||
              loadingVehicles
            }
          >
            <option value="">
              {loadingVehicles
                ? 'Carregando...'
                : 'Selecione um veículo'}
            </option>

            {vehicles.map((vehicle) => (
              <option
                key={vehicle.id}
                value={vehicle.id}
              >
                {vehicle.year}{' '}
                {vehicle.version || ''}
              </option>
            ))}
          </select>
        </div>
      </div>
    </section>
  )
}
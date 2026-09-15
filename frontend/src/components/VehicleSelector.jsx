export default function VehicleSelector({
  brands,
  models,
  years,
  vehicles,
  selectedBrand,
  selectedModel,
  selectedYear,
  selectedVehicle,
  loadingBrands,
  loadingModels,
  loadingVehicles,
  onBrandChange,
  onModelChange,
  onYearChange,
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
          <label>Ano</label>

          <select
            value={selectedYear}
            onChange={onYearChange}
            disabled={
              !selectedModel ||
              loadingVehicles ||
              years.length === 0
            }
          >
            <option value="">
              {loadingVehicles
                ? 'Carregando...'
                : 'Selecione um ano'}
            </option>

            {years.map((year) => (
              <option
                key={year}
                value={year}
              >
                {year}
              </option>
            ))}
          </select>
        </div>

        <div className="select-field">
          <label>Versão</label>

          <select
            value={selectedVehicle}
            onChange={onVehicleChange}
            disabled={
              !selectedYear ||
              loadingVehicles
            }
          >
            <option value="">
              {loadingVehicles
                ? 'Carregando...'
                : 'Selecione uma versão'}
            </option>

            {vehicles.map((vehicle) => (
              <option
                key={vehicle.id}
                value={vehicle.id}
              >
                {vehicle.version || 'Versão não informada'}
              </option>
            ))}
          </select>
        </div>
      </div>
    </section>
  )
}
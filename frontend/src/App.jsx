import { useEffect, useState } from 'react'
import {
  getBrands,
  getModelsByBrand,
  getGenerationsByModel,
  getVehiclesByGeneration,
} from './services/api'
import './App.css'

function App() {
  const [brands, setBrands] = useState([])
  const [models, setModels] = useState([])
  const [selectedBrand, setSelectedBrand] = useState('')
  const [loadingBrands, setLoadingBrands] = useState(true)
  const [loadingModels, setLoadingModels] = useState(false)
  const [error, setError] = useState('')
  const [generations, setGenerations] = useState([])
  const [selectedModel, setSelectedModel] = useState('')
  const [loadingGenerations, setLoadingGenerations] = useState(false)
  const [vehicles, setVehicles] = useState([])
  const [selectedGeneration, setSelectedGeneration] = useState('')
  const [loadingVehicles, setLoadingVehicles] = useState(false)

  useEffect(() => {
    async function loadBrands() {
      try {
        const data = await getBrands()
        setBrands(data.brands)
      } catch (error) {
        console.error(error)
        setError('Não foi possível carregar as marcas.')
      } finally {
        setLoadingBrands(false)
      }
    }

    loadBrands()
  }, [])

  async function handleBrandChange(event) {
    const brandId = event.target.value

    setSelectedBrand(brandId)
    setModels([])
    setError('')

    if (!brandId) {
      return
    }

    try {
      setLoadingModels(true)

      const data = await getModelsByBrand(brandId)
      setModels(data.models)
    } catch (error) {
      console.error(error)
      setError('Não foi possível carregar os modelos.')
    } finally {
      setLoadingModels(false)
    }
  }

  async function handleModelChange(event) {
  const modelId = event.target.value

  setSelectedModel(modelId)
  setGenerations([])
  setError('')

  if (!modelId) {
    return
  }

  async function handleGenerationChange(event) {
  const generationId = event.target.value

  setSelectedGeneration(generationId)
  setVehicles([])
  setError('')

  if (!generationId) {
    return
  }

  try {
    setLoadingVehicles(true)

    const data = await getVehiclesByGeneration(generationId)
    setVehicles(data.vehicles)
  } catch (error) {
    console.error(error)
    setError('Não foi possível carregar os veículos.')
  } finally {
    setLoadingVehicles(false)
  }
  }

  try {
    setLoadingGenerations(true)

    const data = await getGenerationsByModel(modelId)
    setGenerations(data.generations)
  } catch (error) {
    console.error(error)
    setError('Não foi possível carregar as gerações.')
  } finally {
    setLoadingGenerations(false)
  }
  }



  return (
    <main>
      <h1>Plataforma Automotiva</h1>

      <p>Catálogo de veículos</p>

      <section>
        <h2>Selecione uma marca</h2>

        {loadingBrands && <p>Carregando marcas...</p>}

        {!loadingBrands && (
          <select
            value={selectedBrand}
            onChange={handleBrandChange}
          >
            <option value="">Selecione uma marca</option>

            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </select>
        )}
      </section>

      {selectedBrand && (
        <section>
          <h2>Modelos</h2>

          {loadingModels && <p>Carregando modelos...</p>}

          {!loadingModels && models.length === 0 && (
            <p>Nenhum modelo cadastrado para esta marca.</p>
          )}

          {!loadingModels && models.length > 0 && (
            <select
              value={selectedModel}
              onChange={handleModelChange}
            >
              <option value="">Selecione um modelo</option>

              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
          )}
        </section>
      )}

      {selectedModel && (
      <section>
        <h2>Gerações</h2>

        {loadingGenerations && <p>Carregando gerações...</p>}

        {!loadingGenerations && generations.length === 0 && (
          <p>Nenhuma geração cadastrada para este modelo.</p>
        )}

        {!loadingGenerations && generations.length > 0 && (
          <select   value={selectedGeneration}
              onChange={handleGenerationChange}>
            <option value="">Selecione uma geração</option>

            {generations.map((generation) => (
              <option key={generation.id} value={generation.id}>
                {generation.name}
              </option>
            ))}
          </select>
        )}
      </section>
      )}

      {selectedGeneration && (
      <section>
        <h2>Veículos</h2>

        {loadingVehicles && <p>Carregando veículos...</p>}

        {!loadingVehicles && vehicles.length === 0 && (
          <p>Nenhum veículo cadastrado para esta geração.</p>
        )}

        {!loadingVehicles && vehicles.length > 0 && (
          <select>
            <option value="">Selecione um veículo</option>

            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.year} {vehicle.version || ''}
              </option>
            ))}
          </select>
        )}
      </section>
    )}

      {error && <p>{error}</p>}
    </main>
  )
}

export default App
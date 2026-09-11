import { useEffect, useState } from 'react'

import {
  getBrands,
  getModelsByBrand,
  getGenerationsByModel,
  getVehiclesByGeneration,
  getPartCategories,
  getPartsByCategory,
  registerUser,
  loginUser,
  createProject,
  getProjectParts,
  addPartToProject,
  removePartFromProject,
  getProjects,
  getProject,
  getCompatibilitiesByVehicle,
  updateProjectPartQuantity,
} from './services/api'

import './App.css'

const TOKEN_KEY = 'plataforma_automotiva_token'
const USER_KEY = 'plataforma_automotiva_user'

function getStoredUser() {
  try {
    const storedUser = localStorage.getItem(USER_KEY)

    if (!storedUser) {
      return null
    }

    return JSON.parse(storedUser)
  } catch {
    return null
  }
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString(
    'pt-BR',
    {
      style: 'currency',
      currency: 'BRL',
    },
  )
}

function App() {
  const [brands, setBrands] = useState([])
  const [models, setModels] = useState([])
  const [generations, setGenerations] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [categories, setCategories] = useState([])
  const [parts, setParts] = useState([])
  const [compatibilities, setCompatibilities] =
  useState({})


  const [selectedBrand, setSelectedBrand] = useState('')
  const [selectedModel, setSelectedModel] = useState('')
  const [selectedGeneration, setSelectedGeneration] = useState('')
  const [selectedVehicle, setSelectedVehicle] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')

  const [loadingBrands, setLoadingBrands] = useState(true)
  const [loadingModels, setLoadingModels] = useState(false)
  const [loadingGenerations, setLoadingGenerations] =
    useState(false)
  const [loadingVehicles, setLoadingVehicles] =
    useState(false)
  const [loadingCategories, setLoadingCategories] =
    useState(false)
  const [loadingParts, setLoadingParts] = useState(false)

  const [error, setError] = useState('')

  const [projects, setProjects] = useState([])
  const [loadingProjects, setLoadingProjects] =
  useState(false)
  const [projectsError, setProjectsError] =
  useState('')

  // =========================
  // AUTENTICAÇÃO
  // =========================

  const [token, setToken] = useState(
    () => localStorage.getItem(TOKEN_KEY) || '',
  )

  const [user, setUser] = useState(getStoredUser)

  const [authMode, setAuthMode] = useState('login')

  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authName, setAuthName] = useState('')
  const [authUsername, setAuthUsername] = useState('')

  const [loadingAuth, setLoadingAuth] = useState(false)
  const [authError, setAuthError] = useState('')
  const [authMessage, setAuthMessage] = useState('')

  // =========================
  // PROJETO
  // =========================

  const [projectName, setProjectName] = useState('')
  const [projectMode, setProjectMode] = useState('FREE')

  const [currentProject, setCurrentProject] =
    useState(null)

  const [projectParts, setProjectParts] = useState([])
  const [projectPartDetails, setProjectPartDetails] =
    useState({})

  const [loadingProject, setLoadingProject] =
    useState(false)

  const [projectError, setProjectError] = useState('')

  // =========================
  // CARREGAR MARCAS
  // =========================

  useEffect(() => {
    async function loadBrands() {
      try {
        const data = await getBrands()
        setBrands(data.brands)
      } catch (error) {
        console.error(error)
        setError(
          'Não foi possível carregar as marcas.',
        )
      } finally {
        setLoadingBrands(false)
      }
    }

    loadBrands()
  }, [])

  useEffect(() => {
  if (!token) {
    setProjects([])
    return
  }

  async function loadProjects() {
    try {
      setLoadingProjects(true)
      setProjectsError('')

      const data = await getProjects(token)

      setProjects(data.projects)
    } catch (error) {
      console.error(error)

      setProjectsError(
        error.message ||
          'Não foi possível carregar seus projetos.',
      )
    } finally {
      setLoadingProjects(false)
    }
  }

  loadProjects()
}, [token])

  // =========================
  // MARCA
  // =========================

  async function handleBrandChange(event) {
    const brandId = event.target.value

    setSelectedBrand(brandId)

    setSelectedModel('')
    setSelectedGeneration('')
    setSelectedVehicle('')
    setSelectedCategory('')

    setModels([])
    setGenerations([])
    setVehicles([])
    setCategories([])
    setParts([])

    setCurrentProject(null)
    setProjectParts([])
    setProjectPartDetails({})

    setCompatibilities({})

    setError('')
    setProjectError('')

    if (!brandId) {
      return
    }

    try {
      setLoadingModels(true)

      const data = await getModelsByBrand(brandId)

      setModels(data.models)
    } catch (error) {
      console.error(error)
      setError(
        'Não foi possível carregar os modelos.',
      )
    } finally {
      setLoadingModels(false)
    }
  }

  // =========================
  // MODELO
  // =========================

  async function handleModelChange(event) {
    const modelId = event.target.value

    setSelectedModel(modelId)

    setSelectedGeneration('')
    setSelectedVehicle('')
    setSelectedCategory('')

    setGenerations([])
    setVehicles([])
    setCategories([])
    setParts([])

    setCurrentProject(null)
    setProjectParts([])
    setProjectPartDetails({})

    setCompatibilities({})

    setError('')
    setProjectError('')

    if (!modelId) {
      return
    }

    try {
      setLoadingGenerations(true)

      const data =
        await getGenerationsByModel(modelId)

      setGenerations(data.generations)
    } catch (error) {
      console.error(error)
      setError(
        'Não foi possível carregar as gerações.',
      )
    } finally {
      setLoadingGenerations(false)
    }
  }

  // =========================
  // GERAÇÃO
  // =========================

  async function handleGenerationChange(event) {
    const generationId = event.target.value

    setSelectedGeneration(generationId)

    setSelectedVehicle('')
    setSelectedCategory('')

    setVehicles([])
    setCategories([])
    setParts([])

    setCurrentProject(null)
    setProjectParts([])
    setProjectPartDetails({})

    setCompatibilities({})

    setError('')
    setProjectError('')

    if (!generationId) {
      return
    }

    try {
      setLoadingVehicles(true)

      const data =
        await getVehiclesByGeneration(generationId)

      setVehicles(data.vehicles)
    } catch (error) {
      console.error(error)
      setError(
        'Não foi possível carregar os veículos.',
      )
    } finally {
      setLoadingVehicles(false)
    }
  }

  // =========================
  // VEÍCULO
  // =========================

  async function handleVehicleChange(event) {
    const vehicleId = event.target.value

    setSelectedVehicle(vehicleId)

    setSelectedCategory('')
    setParts([])

    setCurrentProject(null)
    setProjectParts([])
    setProjectPartDetails({})
    setCompatibilities({})

    setProjectName('')
    setProjectMode('FREE')

    setError('')
    setProjectError('')

    if (!vehicleId) {
      setCategories([])
      return
    }

   try {
      setLoadingCategories(true)

      const [
        categoriesData,
        compatibilitiesData,
      ] = await Promise.all([
        getPartCategories(),
        getCompatibilitiesByVehicle(
          Number(vehicleId),
        ),
      ])

      setCategories(
        categoriesData.categories,
      )

      const compatibilityMap = {}

      compatibilitiesData.compatibilities.forEach(
        (compatibility) => {
          compatibilityMap[
            compatibility.partId
          ] = compatibility
        },
      )

      setCompatibilities(
        compatibilityMap,
      )
    } catch (error) {
      console.error(error)

      setError(
        error.message ||
          'Não foi possível carregar as informações do veículo.',
      )
    } finally {
      setLoadingCategories(false)
    }
  }

  // =========================
  // CATEGORIA
  // =========================

  async function handleCategoryChange(event) {
    const categoryId = event.target.value

    setSelectedCategory(categoryId)
    setParts([])

    setError('')
    setProjectError('')

    if (!categoryId) {
      return
    }

    try {
      setLoadingParts(true)

      const data =
        await getPartsByCategory(categoryId)

      setParts(data.parts)
    } catch (error) {
      console.error(error)
      setError(
        'Não foi possível carregar as peças.',
      )
    } finally {
      setLoadingParts(false)
    }
  }

  // =========================
  // LOGIN
  // =========================

  async function handleLogin(event) {
    event.preventDefault()

    setAuthError('')
    setAuthMessage('')

    if (!authEmail || !authPassword) {
      setAuthError(
        'Email e senha são obrigatórios.',
      )
      return
    }

    try {
      setLoadingAuth(true)

      const data = await loginUser(
        authEmail,
        authPassword,
      )

      localStorage.setItem(
        TOKEN_KEY,
        data.token,
      )

      localStorage.setItem(
        USER_KEY,
        JSON.stringify(data.user),
      )

      setToken(data.token)
      setUser(data.user)

      setAuthPassword('')
      setAuthMessage('Login realizado com sucesso.')
    } catch (error) {
      console.error(error)

      setAuthError(
        error.message || 'Erro ao realizar login.',
      )
    } finally {
      setLoadingAuth(false)
    }
  }

  // =========================
  // CADASTRO
  // =========================

  async function handleRegister(event) {
    event.preventDefault()

    setAuthError('')
    setAuthMessage('')

    if (!authEmail || !authPassword) {
      setAuthError(
        'Email e senha são obrigatórios.',
      )
      return
    }

    try {
      setLoadingAuth(true)

      await registerUser({
        email: authEmail,
        username: authUsername || undefined,
        name: authName || undefined,
        password: authPassword,
      })

      setAuthMode('login')
      setAuthPassword('')

      setAuthMessage(
        'Cadastro realizado. Agora faça login.',
      )
    } catch (error) {
      console.error(error)

      setAuthError(
        error.message || 'Erro ao realizar cadastro.',
      )
    } finally {
      setLoadingAuth(false)
    }
  }

  // =========================
  // LOGOUT
  // =========================

  function handleLogout() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)

    setToken('')
    setUser(null)

    setProjects([])

    setCurrentProject(null)
    setProjectParts([])
    setProjectPartDetails({})

    setProjectError('')
  }

  // =========================
  // CRIAR PROJETO
  // =========================

  async function handleCreateProject(event) {
    event.preventDefault()

    setProjectError('')

    if (!token) {
      setProjectError(
        'Faça login para criar um projeto.',
      )
      return
    }

    if (!selectedVehicle) {
      setProjectError(
        'Selecione um veículo antes de criar o projeto.',
      )
      return
    }

    if (!projectName.trim()) {
      setProjectError(
        'Informe um nome para o projeto.',
      )
      return
    }

    try {
      setLoadingProject(true)

      const data = await createProject(
        token,
        Number(selectedVehicle),
        projectName.trim(),
        projectMode,
      )

      setCurrentProject(data.project)
      setProjectParts([])
      setProjectPartDetails({})

      setProjects((current) => [
        data.project,
        ...current,
      ])

      setProjectMessage(
        'Projeto criado com sucesso.',
      )
    } catch (error) {
      console.error(error)

      setProjectError(
        error.message || 'Erro ao criar projeto.',
      )
    } finally {
      setLoadingProject(false)
    }
  }

  function setProjectMessage(message) {
    setProjectError('')
    setError('')
    setAuthMessage(message)
  }

  // =========================
  // ADICIONAR PEÇA
  // =========================

async function handleAddPart(part) {
  if (!token || !currentProject) {
    setProjectError(
      'Faça login e crie um projeto primeiro.',
    )
    return
  }

  const compatibility =
    compatibilities[part.id]

  const isRealProject =
    currentProject.mode === 'REAL'

  const isMissingCompatibility =
    isRealProject &&
    !compatibility

  const isIncompatible =
    compatibility?.level ===
    'INCOMPATIBLE'

  if (isMissingCompatibility) {
    setProjectError(
      'A compatibilidade desta peça ainda não foi cadastrada para o veículo.',
    )
    return
  }

  if (isIncompatible) {
    setProjectError(
      'Esta peça é incompatível com o veículo selecionado.',
    )
    return
  }

  const alreadyAdded = projectParts.some(
    (projectPart) =>
      projectPart.partId === part.id,
  )

  if (alreadyAdded) {
    setProjectError(
      'Esta peça já está no projeto.',
    )
    return
  }

  try {
    setProjectError('')

    const data =
      await addPartToProject(
        token,
        currentProject.id,
        part.id,
        1,
      )

    setProjectParts((current) => [
      ...current,
      data.projectPart,
    ])

    setProjectPartDetails((current) => ({
      ...current,
      [part.id]: part,
    }))
  } catch (error) {
    console.error(error)

    setProjectError(
      error.message ||
        'Erro ao adicionar peça ao projeto.',
    )
  }
}


  async function handleUpdatePartQuantity(
  partId,
  quantity,
) {
  if (!token || !currentProject) {
    return
  }

  if (
    !Number.isInteger(quantity) ||
    quantity < 1
  ) {
    return
  }

  try {
    const data =
      await updateProjectPartQuantity(
        token,
        currentProject.id,
        partId,
        quantity,
      )

    setProjectParts((currentParts) =>
      currentParts.map(
        (projectPart) => {
          if (
            projectPart.partId !== partId
          ) {
            return projectPart
          }

          return {
            ...projectPart,
            ...data.projectPart,
          }
        },
      ),
    )

    setProjectError('')
  } catch (error) {
    console.error(error)

    setProjectError(
      error.message ||
        'Erro ao atualizar quantidade',
    )
  }
}

  // =========================
  // REMOVER PEÇA
  // =========================

  async function handleRemovePart(partId) {
    if (!token || !currentProject) {
      return
    }

    try {
      setProjectError('')

      await removePartFromProject(
        token,
        currentProject.id,
        partId,
      )

      setProjectParts((current) =>
        current.filter(
          (projectPart) =>
            projectPart.partId !== partId,
        ),
      )

      setProjectPartDetails((current) => {
        const updated = { ...current }
        delete updated[partId]
        return updated
      })
    } catch (error) {
      console.error(error)

      setProjectError(
        error.message ||
          'Erro ao remover peça do projeto.',
      )
    }
  }

  // =========================
  // TOTAL DO PROJETO
  // =========================

  const projectTotal =
  projectParts.reduce(
    (total, projectPart) => {
      return (
        total +
        Number(
          projectPart.priceAtTime || 0,
        ) *
          Number(
            projectPart.quantity || 0,
          )
      )
    },
    0,
  )

  // =========================
  // VEÍCULO SELECIONADO
  // =========================

  const selectedVehicleData = vehicles.find(
    (vehicle) =>
      String(vehicle.id) ===
      String(selectedVehicle),
  )

async function handleOpenProject(projectId) {
  if (!token) {
    return
  }

  setLoadingProject(true)
  setProjectError('')
  setAuthMessage('')

  try {
    const projectData = await getProject(
      token,
      projectId,
    )

    const project = projectData.project

    const [
      partsData,
      categoriesData,
      compatibilitiesData,
    ] = await Promise.all([
      getProjectParts(
        token,
        project.id,
      ),
      getPartCategories(),
      getCompatibilitiesByVehicle(
        project.vehicleId,
      ),
    ])

    const compatibilityMap = {}

    compatibilitiesData.compatibilities.forEach(
      (compatibility) => {
        compatibilityMap[
          compatibility.partId
        ] = compatibility
      },
    )

    const detailsMap = {}

    partsData.parts.forEach(
      (projectPart) => {
        if (projectPart.part) {
          detailsMap[
            projectPart.partId
          ] = projectPart.part
        }
      },
    )

    setCurrentProject(project)
    setProjectName(project.name)
    setProjectMode(project.mode)

    setSelectedVehicle(
      String(project.vehicleId),
    )

    setCategories(
      categoriesData.categories || [],
    )

    setCompatibilities(
      compatibilityMap,
    )

    setProjectParts(
      partsData.parts || [],
    )

    setProjectPartDetails(
      detailsMap,
    )

    setSelectedCategory('')
    setParts([])
    setProjectError('')
  } catch (error) {
    console.error(error)

    setProjectError(
      error.message ||
        'Erro ao abrir projeto',
    )
  } finally {
    setLoadingProject(false)
  }
}

    function handleNewProject() {
  setCurrentProject(null)

  setProjectParts([])
  setProjectPartDetails({})

  setProjectName('')
  setProjectMode('FREE')

  setSelectedCategory('')
  setParts([])

  setProjectError('')
  setError('')
  }

  return (
    <main>
      <h1>Plataforma Automotiva</h1>

      <p>Monte seu projeto automotivo</p>

      {/* ========================= */}
      {/* AUTENTICAÇÃO */}
      {/* ========================= */}

      <section>
        <h2>Conta</h2>

        {token && user ? (
          <div>
            <p>
              Olá,{' '}
              <strong>
                {user.name || user.email}
              </strong>
            </p>

            <button
              type="button"
              onClick={handleLogout}
            >
              Sair
            </button>
          </div>
        ) : (
          <div>
            <div>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login')
                  setAuthError('')
                  setAuthMessage('')
                }}
              >
                Entrar
              </button>

              <button
                type="button"
                onClick={() => {
                  setAuthMode('register')
                  setAuthError('')
                  setAuthMessage('')
                }}
              >
                Cadastrar
              </button>
            </div>

            <form
              onSubmit={
                authMode === 'login'
                  ? handleLogin
                  : handleRegister
              }
            >
              {authMode === 'register' && (
                <>
                  <div>
                    <label htmlFor="auth-name">
                      Nome
                    </label>

                    <input
                      id="auth-name"
                      type="text"
                      value={authName}
                      onChange={(event) =>
                        setAuthName(
                          event.target.value,
                        )
                      }
                      placeholder="Seu nome"
                    />
                  </div>

                  <div>
                    <label htmlFor="auth-username">
                      Username
                    </label>

                    <input
                      id="auth-username"
                      type="text"
                      value={authUsername}
                      onChange={(event) =>
                        setAuthUsername(
                          event.target.value,
                        )
                      }
                      placeholder="Seu username"
                    />
                  </div>
                </>
              )}

              <div>
                <label htmlFor="auth-email">
                  Email
                </label>

                <input
                  id="auth-email"
                  type="email"
                  value={authEmail}
                  onChange={(event) =>
                    setAuthEmail(
                      event.target.value,
                    )
                  }
                  placeholder="seu@email.com"
                />
              </div>

              <div>
                <label htmlFor="auth-password">
                  Senha
                </label>

                <input
                  id="auth-password"
                  type="password"
                  value={authPassword}
                  onChange={(event) =>
                    setAuthPassword(
                      event.target.value,
                    )
                  }
                  placeholder="Sua senha"
                />
              </div>

              <button
                type="submit"
                disabled={loadingAuth}
              >
                {loadingAuth
                  ? 'Aguarde...'
                  : authMode === 'login'
                    ? 'Entrar'
                    : 'Criar conta'}
              </button>
            </form>

            {authError && (
              <p>{authError}</p>
            )}

            {authMessage && (
              <p>{authMessage}</p>
            )}
          </div>
        )}
      </section>

      {token && (
  <section>
    <h2>Meus Projetos</h2>

    {loadingProjects && (
      <p>Carregando seus projetos...</p>
    )}

    {!loadingProjects &&
      projects.length === 0 && (
        <p>
          Você ainda não possui projetos.
        </p>
      )}

    {!loadingProjects &&
      projects.length > 0 && (
        <div>
          {projects.map((project) => (
            <article key={project.id}>
              <h3>{project.name}</h3>

              <p>
                Modo:{' '}
                {project.mode === 'REAL'
                  ? 'Projeto Real'
                  : 'Projeto Livre'}
              </p>

              <p>
                Veículo ID: {project.vehicleId}
              </p>

              <button
                type="button"
                onClick={() =>
                  handleOpenProject(
                    project.id,
                  )
                }
              >
                Abrir projeto
              </button>
            </article>
          ))}
        </div>
      )}

    {projectsError && (
      <p>{projectsError}</p>
    )}
  </section>
  )}

      {/* ========================= */}
      {/* SELEÇÃO DO VEÍCULO */}
      {/* ========================= */}

      <section>
        <h2>Selecione seu veículo</h2>

        {loadingBrands && (
          <p>Carregando marcas...</p>
        )}

        {!loadingBrands && (
          <select
            value={selectedBrand}
            onChange={handleBrandChange}
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
      </section>

      {selectedBrand && (
        <section>
          <h2>Modelos</h2>

          {loadingModels && (
            <p>Carregando modelos...</p>
          )}

          {!loadingModels &&
            models.length === 0 && (
              <p>
                Nenhum modelo cadastrado para esta
                marca.
              </p>
            )}

          {!loadingModels &&
            models.length > 0 && (
              <select
                value={selectedModel}
                onChange={handleModelChange}
              >
                <option value="">
                  Selecione um modelo
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
            )}
        </section>
      )}

      {selectedModel && (
        <section>
          <h2>Gerações</h2>

          {loadingGenerations && (
            <p>Carregando gerações...</p>
          )}

          {!loadingGenerations &&
            generations.length === 0 && (
              <p>
                Nenhuma geração cadastrada para este
                modelo.
              </p>
            )}

          {!loadingGenerations &&
            generations.length > 0 && (
              <select
                value={selectedGeneration}
                onChange={handleGenerationChange}
              >
                <option value="">
                  Selecione uma geração
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
            )}
        </section>
      )}

      {selectedGeneration && (
        <section>
          <h2>Veículos</h2>

          {loadingVehicles && (
            <p>Carregando veículos...</p>
          )}

          {!loadingVehicles &&
            vehicles.length === 0 && (
              <p>
                Nenhum veículo cadastrado para esta
                geração.
              </p>
            )}

          {!loadingVehicles &&
            vehicles.length > 0 && (
              <select
                value={selectedVehicle}
                onChange={handleVehicleChange}
              >
                <option value="">
                  Selecione um veículo
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
            )}
        </section>
      )}

      {/* ========================= */}
      {/* CRIAÇÃO DO PROJETO */}
      {/* ========================= */}

      {selectedVehicle && (
        <section>
          <h2>Montar projeto</h2>

          {selectedVehicleData && (
            <p>
              Veículo selecionado:{' '}
              <strong>
                {selectedVehicleData.year}{' '}
                {selectedVehicleData.version || ''}
              </strong>
            </p>
          )}

          {!token && (
            <p>
              Faça login ou crie uma conta para
              montar e salvar seu projeto.
            </p>
          )}

          {token && !currentProject && (
            <form
              onSubmit={handleCreateProject}
            >
              <div>
                <label htmlFor="project-name">
                  Nome do projeto
                </label>

                <input
                  id="project-name"
                  type="text"
                  value={projectName}
                  onChange={(event) =>
                    setProjectName(
                      event.target.value,
                    )
                  }
                  placeholder="Ex.: Corolla XEi 2023"
                />
              </div>

              <div>
                <p>Modo do projeto</p>

                <label>
                  <input
                    type="radio"
                    name="project-mode"
                    value="REAL"
                    checked={
                      projectMode === 'REAL'
                    }
                    onChange={(event) =>
                      setProjectMode(
                        event.target.value,
                      )
                    }
                  />

                  Projeto Real
                </label>

                <label>
                  <input
                    type="radio"
                    name="project-mode"
                    value="FREE"
                    checked={
                      projectMode === 'FREE'
                    }
                    onChange={(event) =>
                      setProjectMode(
                        event.target.value,
                      )
                    }
                  />

                  Projeto Livre
                </label>
              </div>

              <button
                type="submit"
                disabled={loadingProject}
              >
                {loadingProject
                  ? 'Criando projeto...'
                  : 'Criar projeto'}
              </button>
            </form>
          )}

          {currentProject && (
            <div>
              <h3>
                {currentProject.name}
              </h3>

              <p>
                Modo:{' '}
                {currentProject.mode === 'REAL'
                  ? 'Projeto Real'
                  : 'Projeto Livre'}
              </p>

              <p>
                Projeto criado com sucesso.
              </p>

              <button
                 type="button"
                 onClick={handleNewProject}
                >
                 Criar outro projeto
             </button>
            </div>
          )}

          {projectError && (
            <p>{projectError}</p>
          )}
        </section>
      )}

      {/* ========================= */}
      {/* CATEGORIAS */}
      {/* ========================= */}

      {selectedVehicle &&
        currentProject && (
          <section>
            <h2>Adicionar peças</h2>

            {loadingCategories && (
              <p>
                Carregando categorias de peças...
              </p>
            )}

            {!loadingCategories &&
              categories.length === 0 && (
                <p>
                  Nenhuma categoria de peças
                  cadastrada.
                </p>
              )}

            {!loadingCategories &&
              categories.length > 0 && (
                <select
                  value={selectedCategory}
                  onChange={handleCategoryChange}
                >
                  <option value="">
                    Selecione uma categoria
                  </option>

                  {categories.map((category) => (
                    <option
                      key={category.id}
                      value={category.id}
                    >
                      {category.name}
                    </option>
                  ))}
                </select>
              )}
          </section>
        )}

      {/* ========================= */}
      {/* PEÇAS DISPONÍVEIS */}
      {/* ========================= */}

      {selectedCategory &&
        currentProject && (
          <section>
            <h2>Peças disponíveis</h2>

            {loadingParts && (
              <p>Carregando peças...</p>
            )}

            {!loadingParts &&
              parts.length === 0 && (
                <p>
                  Nenhuma peça cadastrada nesta
                  categoria.
                </p>
              )}

            {!loadingParts &&
              parts.length > 0 && (
                <div>
                  {parts.map((part) => {
                    const alreadyAdded =
                      projectParts.some(
                        (projectPart) =>
                          projectPart.partId ===
                          part.id,
                      )

                      const compatibility =
                      compatibilities[part.id]

                      const isRealProject =
                        currentProject.mode === 'REAL'

                      const isMissingCompatibility =
                        isRealProject &&
                        !compatibility  

                      const isIncompatible =
                        isRealProject &&
                        compatibility?.level ===
                          'INCOMPATIBLE'

                      const requiresAdaptation =
                        isRealProject &&
                        (
                          compatibility?.level ===
                            'ADAPTATION' ||
                          compatibility?.requiresAdaptation
                        )

                    return (
                      <article key={part.id}>
                        <h3>{part.name}</h3>

                        {part.brand && (
                          <p>
                            Marca: {part.brand}
                          </p>
                        )}

                        {part.description && (
                          <p>
                            {part.description}
                          </p>
                        )}

                        <p>
                          Preço estimado: R${' '}
                          {Number(
                            part.estimatedPrice,
                          ).toLocaleString(
                            'pt-BR',
                            {
                              minimumFractionDigits: 2,
                            },
                          )}
                        </p>

                        {currentProject.mode === 'REAL' && (
                        <p>
                          {!compatibility && (
                            <>
                              Compatibilidade: não cadastrada
                            </>
                          )}

                          {compatibility?.level ===
                            'COMPATIBLE' && (
                            <>
                              Compatibilidade: Compatível
                            </>
                          )}

                          {compatibility?.level ===
                            'ADAPTATION' && (
                            <>
                              Compatibilidade: Requer adaptação
                            </>
                          )}

                          {compatibility?.level ===
                            'INCOMPATIBLE' && (
                            <>
                              Compatibilidade: Incompatível
                            </>
                          )}
                        </p>
                      )}

                        <button
                          type="button"
                          disabled={
                            alreadyAdded ||
                            isIncompatible ||
                            isMissingCompatibility
                          }
                          onClick={() =>
                            handleAddPart(part)
                          }
                        >
                          {alreadyAdded
                            ? 'Já adicionada'
                            : isIncompatible
                              ? 'Incompatível'
                              : requiresAdaptation
                                ? 'Adicionar com adaptação'
                                : 'Adicionar ao projeto'}
                        </button>
                      </article>
                    )
                  })}
                </div>
              )}
          </section>
        )}

      {/* ========================= */}
      {/* PROJETO ATUAL */}
      {/* ========================= */}

      {currentProject && (
        <section>
          <h2>Meu projeto</h2>

          <p>
            <strong>
              {currentProject.name}
            </strong>
          </p>

          {projectParts.length === 0 && (
            <p>
              Nenhuma peça adicionada ainda.
            </p>
          )}

          {projectParts.length > 0 && (
            <div>
              {projectParts.map(
              (projectPart) => {
                const part =
                  projectPart.part ||
                  projectPartDetails[
                    projectPart.partId
                  ]

                const quantity =
                  projectPart.quantity

                const unitPrice =
                  Number(
                    projectPart.priceAtTime || 0,
                  )

                const subtotal =
                  unitPrice * quantity

                return (
                  <div
                    key={projectPart.id}
                    className="border rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="font-semibold">
                          {part?.name ||
                            `Peça #${projectPart.partId}`}
                        </h4>

                        {part?.brand && (
                          <p className="text-sm">
                            Marca: {part.brand}
                          </p>
                        )}

                        <p className="text-sm">
                          Preço unitário:{' '}
                          {formatCurrency(unitPrice)}
                        </p>

                        <p className="text-sm font-medium">
                          Subtotal:{' '}
                          {formatCurrency(subtotal)}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          handleRemovePart(
                            projectPart.partId,
                          )
                        }
                      >
                        Remover
                      </button>
                    </div>

                    <div className="flex items-center gap-3 mt-4">
                     <button
                      type="button"
                      onClick={() =>
                        handleUpdatePartQuantity(
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
                        handleUpdatePartQuantity(
                          projectPart.partId,
                          quantity + 1,
                        )
                      }
                    >
                      +
                    </button>
                    </div>
                  </div>
                )
              },
            )}
            </div>
          )}

          <h3>
  Total estimado: {formatCurrency(projectTotal)}
</h3>
        </section>
      )}

      {/* ========================= */}
      {/* ERROS GERAIS */}
      {/* ========================= */}

      {error && <p>{error}</p>}
    </main>
  )
}

export default App
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
  updateProject,
  deleteProject,
  duplicateProject,
  updateProjectPublication,
} from './services/api'

import './App.css'

import AuthPanel from './components/AuthPanel'
import VehicleSelector from './components/VehicleSelector'
import ProjectList from './components/ProjectList'
import ProjectBuilder from './components/ProjectBuilder'
import PartsCatalog from './components/PartsCatalog'
import CurrentProject from './components/CurrentProject'
import LandingPage from './pages/LandingPage'
import PublicProjectPage from './pages/PublicProjectPage'

const TOKEN_KEY = 'plataforma_automotiva_token'
const USER_KEY = 'plataforma_automotiva_user'

function getStoredUser() {
  try {
    const storedUser = localStorage.getItem(USER_KEY)
    return storedUser ? JSON.parse(storedUser) : null
  } catch {
    return null
  }
}

function App() {
  const shareToken = new URLSearchParams(window.location.search).get('share')

  const [view, setView] = useState(() => {
    if (shareToken) return 'public'
    if (localStorage.getItem(TOKEN_KEY)) return 'home'
    return 'landing'
  })

  const [brands, setBrands] = useState([])
  const [models, setModels] = useState([])
  const [generations, setGenerations] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [categories, setCategories] = useState([])
  const [parts, setParts] = useState([])
  const [compatibilities, setCompatibilities] = useState({})

  const [selectedBrand, setSelectedBrand] = useState('')
  const [selectedModel, setSelectedModel] = useState('')
  const [selectedGeneration, setSelectedGeneration] = useState('')
  const [selectedYear, setSelectedYear] = useState('')
  const [selectedVehicle, setSelectedVehicle] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  

  const [loadingBrands, setLoadingBrands] = useState(true)
  const [loadingModels, setLoadingModels] = useState(false)
  const [loadingGenerations, setLoadingGenerations] = useState(false)
  const [loadingVehicles, setLoadingVehicles] = useState(false)
  const [loadingCategories, setLoadingCategories] = useState(false)
  const [loadingParts, setLoadingParts] = useState(false)

  const [error, setError] = useState('')
  const [projects, setProjects] = useState([])
  const [loadingProjects, setLoadingProjects] = useState(false)
  const [projectsError, setProjectsError] = useState('')

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

  const [projectName, setProjectName] = useState('')
  const [projectMode, setProjectMode] = useState('FREE')
  const [currentProject, setCurrentProject] = useState(null)
  const [projectParts, setProjectParts] = useState([])
  const [projectPartDetails, setProjectPartDetails] = useState({})
  const [loadingProject, setLoadingProject] = useState(false)
  const [projectError, setProjectError] = useState('')

  const [editingProject, setEditingProject] = useState(false)
  const [editProjectName, setEditProjectName] = useState('')
  const [editProjectMode, setEditProjectMode] = useState('FREE')
  const [projectActionLoading, setProjectActionLoading] = useState(false)

  useEffect(() => {
    async function loadBrands() {
      try {
        const data = await getBrands()
        setBrands(data.brands || [])
      } catch (error) {
        console.error(error)
        setError('Não foi possível carregar as marcas.')
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
        setProjects(data.projects || [])
      } catch (error) {
        console.error(error)
        setProjectsError(
          error.message || 'Não foi possível carregar seus projetos.',
        )
      } finally {
        setLoadingProjects(false)
      }
    }

    loadProjects()
  }, [token])

  function clearProjectSelection() {
    setCurrentProject(null)
    setProjectParts([])
    setProjectPartDetails({})
    setProjectName('')
    setProjectMode('FREE')
    setSelectedCategory('')
    setParts([])
    setCompatibilities({})
    setEditingProject(false)
  }

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
    clearProjectSelection()
    setError('')
    setProjectError('')

    if (!brandId) return

    try {
      setLoadingModels(true)
      const data = await getModelsByBrand(brandId)
      setModels(data.models || [])
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
  setSelectedGeneration('')
  setSelectedYear('')
  setSelectedVehicle('')
  setGenerations([])
  setVehicles([])
  setCategories([])
  setParts([])
  clearProjectSelection()
  setError('')
  setProjectError('')

  if (!modelId) return

  try {
    setLoadingVehicles(true)

    const data = await getGenerationsByModel(modelId)
    const generationsData = data.generations || []

    setGenerations(generationsData)

    const vehicleResponses = await Promise.all(
      generationsData.map((generation) =>
        getVehiclesByGeneration(generation.id),
      ),
    )

    const modelVehicles = vehicleResponses.flatMap(
      (response) => response.vehicles || [],
    )

    setVehicles(modelVehicles)
  } catch (error) {
    console.error(error)
    setError('Não foi possível carregar os veículos.')
  } finally {
    setLoadingVehicles(false)
  }
}

function handleYearChange(event) {
  const year = event.target.value

  setSelectedYear(year)
  setSelectedVehicle('')
  setSelectedCategory('')
  setParts([])
  clearProjectSelection()
  setError('')
  setProjectError('')
}


  async function handleVehicleChange(event) {
    const vehicleId = event.target.value

    setSelectedVehicle(vehicleId)
    setSelectedCategory('')
    setParts([])
    clearProjectSelection()
    setError('')
    setProjectError('')

    if (!vehicleId) {
      setCategories([])
      return
    }

    try {
      setLoadingCategories(true)

      const [categoriesData, compatibilitiesData] = await Promise.all([
        getPartCategories(),
        getCompatibilitiesByVehicle(Number(vehicleId)),
      ])

      setCategories(categoriesData.categories || [])

      const compatibilityMap = {}
      ;(compatibilitiesData.compatibilities || []).forEach(
        (compatibility) => {
          compatibilityMap[compatibility.partId] = compatibility
        },
      )

      setCompatibilities(compatibilityMap)
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

  async function handleCategoryChange(event) {
    const categoryId = event.target.value

    setSelectedCategory(categoryId)
    setParts([])
    setError('')
    setProjectError('')

    if (!categoryId) return

    try {
      setLoadingParts(true)
      const data = await getPartsByCategory(categoryId)
      setParts(data.parts || [])
    } catch (error) {
      console.error(error)
      setError('Não foi possível carregar as peças.')
    } finally {
      setLoadingParts(false)
    }
  }

  async function handleLogin(event) {
    event.preventDefault()
    setAuthError('')
    setAuthMessage('')

    if (!authEmail || !authPassword) {
      setAuthError('Email e senha são obrigatórios.')
      return
    }

    try {
      setLoadingAuth(true)

      const data = await loginUser(authEmail, authPassword)

      localStorage.setItem(TOKEN_KEY, data.token)
      localStorage.setItem(USER_KEY, JSON.stringify(data.user))

      setToken(data.token)
      setUser(data.user)
      setAuthPassword('')
      setAuthMessage('Login realizado com sucesso.')
      setView('home')
    } catch (error) {
      console.error(error)
      setAuthError(error.message || 'Erro ao realizar login.')
    } finally {
      setLoadingAuth(false)
    }
  }

  async function handleRegister(event) {
    event.preventDefault()
    setAuthError('')
    setAuthMessage('')

    if (!authEmail || !authPassword) {
      setAuthError('Email e senha são obrigatórios.')
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
      setAuthMessage('Cadastro realizado. Agora faça login.')
    } catch (error) {
      console.error(error)
      setAuthError(error.message || 'Erro ao realizar cadastro.')
    } finally {
      setLoadingAuth(false)
    }
  }

  function handleLogout() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)

    setToken('')
    setUser(null)
    setProjects([])
    clearProjectSelection()
    setView('landing')
  }

  function handleGoToLogin() {
    setAuthMode('login')
    setAuthError('')
    setAuthMessage('')
    setView('login')
  }

  async function handleCreateProject(event) {
    event.preventDefault()
    setProjectError('')

    if (!token) {
      setProjectError('Faça login para criar um projeto.')
      return
    }

    if (!selectedVehicle) {
      setProjectError('Selecione um veículo antes de criar o projeto.')
      return
    }

    if (!projectName.trim()) {
      setProjectError('Informe um nome para o projeto.')
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
      setProjects((current) => [data.project, ...current])
      setAuthMessage('Projeto criado com sucesso.')
    } catch (error) {
      console.error(error)
      setProjectError(error.message || 'Erro ao criar projeto.')
    } finally {
      setLoadingProject(false)
    }
  }

  async function handleAddPart(part) {
    if (!token || !currentProject) {
      setProjectError('Faça login e crie um projeto primeiro.')
      return
    }

    const compatibility = compatibilities[part.id]
    const isRealProject = currentProject.mode === 'REAL'
    const isMissingCompatibility = isRealProject && !compatibility
    const isIncompatible = compatibility?.level === 'INCOMPATIBLE'

    if (isMissingCompatibility) {
      setProjectError(
        'A compatibilidade desta peça ainda não foi cadastrada para o veículo.',
      )
      return
    }

    if (isIncompatible) {
      setProjectError('Esta peça é incompatível com o veículo selecionado.')
      return
    }

    if (projectParts.some((item) => item.partId === part.id)) {
      setProjectError('Esta peça já está no projeto.')
      return
    }

    try {
      setProjectError('')

      const data = await addPartToProject(
        token,
        currentProject.id,
        part.id,
        1,
      )

      setProjectParts((current) => [...current, data.projectPart])
      setProjectPartDetails((current) => ({
        ...current,
        [part.id]: part,
      }))
    } catch (error) {
      console.error(error)
      setProjectError(
        error.message || 'Erro ao adicionar peça ao projeto.',
      )
    }
  }

  async function handleUpdatePartQuantity(partId, quantity) {
    if (!token || !currentProject) return
    if (!Number.isInteger(quantity) || quantity < 1) return

    try {
      const data = await updateProjectPartQuantity(
        token,
        currentProject.id,
        partId,
        quantity,
      )

      setProjectParts((current) =>
        current.map((item) =>
          item.partId === partId
            ? { ...item, ...data.projectPart }
            : item,
        ),
      )

      setProjectError('')
    } catch (error) {
      console.error(error)
      setProjectError(
        error.message || 'Erro ao atualizar quantidade.',
      )
    }
  }

  async function handleRemovePart(partId) {
    if (!token || !currentProject) return

    try {
      setProjectError('')

      await removePartFromProject(
        token,
        currentProject.id,
        partId,
      )

      setProjectParts((current) =>
        current.filter((item) => item.partId !== partId),
      )

      setProjectPartDetails((current) => {
        const updated = { ...current }
        delete updated[partId]
        return updated
      })
    } catch (error) {
      console.error(error)
      setProjectError(
        error.message || 'Erro ao remover peça do projeto.',
      )
    }
  }

  async function loadVehicleHierarchy(vehicleId) {
    for (const brand of brands) {
      const modelsData = await getModelsByBrand(brand.id)

      for (const model of modelsData.models || []) {
        const generationsData = await getGenerationsByModel(model.id)

        for (const generation of generationsData.generations || []) {
          const vehiclesData = await getVehiclesByGeneration(generation.id)
          const vehicle = (vehiclesData.vehicles || []).find(
            (item) => Number(item.id) === Number(vehicleId),
          )

          if (vehicle) {
            setSelectedBrand(String(brand.id))
            setModels(modelsData.models || [])
            setSelectedModel(String(model.id))
            setGenerations(generationsData.generations || [])
            setSelectedGeneration(String(generation.id))
            setVehicles(vehiclesData.vehicles || [])
            setSelectedYear(String(vehicle.year))
            setSelectedVehicle(String(vehicle.id))
            return vehicle
          }
        }
      }
    }

    return null
  }

  async function handleOpenProject(projectId) {
    if (!token) return

    setLoadingProject(true)
    setProjectError('')

    try {
      const projectData = await getProject(token, projectId)
      const project = projectData.project

      const [partsData, categoriesData, compatibilitiesData] =
        await Promise.all([
          getProjectParts(token, project.id),
          getPartCategories(),
          getCompatibilitiesByVehicle(project.vehicleId),
        ])

      const compatibilityMap = {}
      ;(compatibilitiesData.compatibilities || []).forEach(
        (compatibility) => {
          compatibilityMap[compatibility.partId] = compatibility
        },
      )

      const detailsMap = {}
      ;(partsData.parts || []).forEach((projectPart) => {
        if (projectPart.part) {
          detailsMap[projectPart.partId] = projectPart.part
        }
      })

      await loadVehicleHierarchy(project.vehicleId)

      setCurrentProject(project)
      setProjectName(project.name)
      setProjectMode(project.mode)
      setCategories(categoriesData.categories || [])
      setCompatibilities(compatibilityMap)
      setProjectParts(partsData.parts || [])
      setProjectPartDetails(detailsMap)
      setSelectedCategory('')
      setParts([])
      setEditingProject(false)
      setView('home')
    } catch (error) {
      console.error(error)
      setProjectError(error.message || 'Erro ao abrir projeto.')
    } finally {
      setLoadingProject(false)
    }
  }

  function handleNewProject() {
    clearProjectSelection()
    setProjectError('')
    setError('')
  }

  function handleStartEditProject() {
    if (!currentProject) return

    setEditProjectName(currentProject.name)
    setEditProjectMode(currentProject.mode)
    setEditingProject(true)
    setProjectError('')
  }

  function handleCancelEditProject() {
    setEditingProject(false)
    setProjectError('')
  }

  async function handleSaveProjectEdit(event) {
    event.preventDefault()

    if (!token || !currentProject) return

    if (!editProjectName.trim()) {
      setProjectError('Informe um nome para o projeto.')
      return
    }

    try {
      setProjectActionLoading(true)
      setProjectError('')

      const data = await updateProject(
        token,
        currentProject.id,
        editProjectName.trim(),
        editProjectMode,
      )

      setCurrentProject(data.project)
      setProjectName(data.project.name)
      setProjectMode(data.project.mode)

      setProjects((current) =>
        current.map((project) =>
          project.id === data.project.id
            ? { ...project, ...data.project }
            : project,
        ),
      )

      setEditingProject(false)
    } catch (error) {
      console.error(error)
      setProjectError(
        error.message || 'Erro ao atualizar projeto.',
      )
    } finally {
      setProjectActionLoading(false)
    }
  }

  async function handleDeleteCurrentProject() {
    if (!token || !currentProject) return

    if (
      !window.confirm(
        'Tem certeza que deseja excluir este projeto? Essa ação não pode ser desfeita.',
      )
    ) {
      return
    }

    try {
      setProjectActionLoading(true)
      setProjectError('')

      await deleteProject(token, currentProject.id)

      setProjects((current) =>
        current.filter((project) => project.id !== currentProject.id),
      )

      handleNewProject()
    } catch (error) {
      console.error(error)
      setProjectError(
        error.message || 'Erro ao excluir projeto.',
      )
    } finally {
      setProjectActionLoading(false)
    }
  }

  async function handleDuplicateCurrentProject() {
    if (!token || !currentProject) return

    try {
      setProjectActionLoading(true)
      setProjectError('')

      const data = await duplicateProject(
        token,
        currentProject.id,
      )

      setProjects((current) => [data.project, ...current])
      await handleOpenProject(data.project.id)
    } catch (error) {
      console.error(error)
      setProjectError(
        error.message || 'Erro ao duplicar projeto.',
      )
    } finally {
      setProjectActionLoading(false)
    }
  }

  async function handleToggleProjectPublication() {
    if (!token || !currentProject) return

    try {
      setProjectActionLoading(true)
      setProjectError('')

      const data = await updateProjectPublication(
        token,
        currentProject.id,
        !currentProject.isPublic,
      )

      setCurrentProject(data.project)

      setProjects((current) =>
        current.map((project) =>
          project.id === data.project.id
            ? { ...project, ...data.project }
            : project,
        ),
      )
    } catch (error) {
      console.error(error)
      setProjectError(
        error.message || 'Erro ao alterar publicação.',
      )
    } finally {
      setProjectActionLoading(false)
    }
  }

  async function handleCopyShareLink() {
    if (!currentProject?.isPublic || !currentProject.shareToken) {
      return
    }

    const shareUrl =
      `${window.location.origin}/?share=${currentProject.shareToken}`

    try {
      await navigator.clipboard.writeText(shareUrl)
      setProjectError('Link de compartilhamento copiado.')
    } catch (error) {
      console.error(error)
      setProjectError('Não foi possível copiar o link.')
    }
  }


  const availableYears = [
  ...new Set(
    vehicles
      .map((vehicle) => Number(vehicle.year))
      .filter((year) => Number.isFinite(year)),
  ),
].sort((a, b) => b - a)

const visibleVehicles = selectedYear
  ? vehicles.filter(
      (vehicle) =>
        String(vehicle.year) === String(selectedYear),
    )
  : []

  const selectedVehicleData = vehicles.find(
    (vehicle) =>
      String(vehicle.id) === String(selectedVehicle),
  )

  const projectTotal = projectParts.reduce(
    (total, projectPart) =>
      total +
      Number(projectPart.priceAtTime || 0) *
        Number(projectPart.quantity || 0),
    0,
  )

  function renderHome() {
    return (
      <main className="dashboard-page">
        <header className="dashboard-header">
          <div>
            <span className="dashboard-eyebrow">
              PLATAFORMA AUTOMOTIVA
            </span>

            <h1>Seu espaço automotivo</h1>

            <p>
              Olá, <strong>{user?.name || user?.email}</strong>
            </p>
          </div>

          <button
            className="logout-button"
            type="button"
            onClick={handleLogout}
          >
            Sair
          </button>
        </header>

        <ProjectList
          projects={projects}
          loading={loadingProjects}
          error={projectsError}
          onOpen={handleOpenProject}
        />

        <VehicleSelector
        brands={brands}
        models={models}
        years={availableYears}
        vehicles={visibleVehicles}
        selectedBrand={selectedBrand}
        selectedModel={selectedModel}
        selectedYear={selectedYear}
        selectedVehicle={selectedVehicle}
        loadingBrands={loadingBrands}
        loadingModels={loadingModels}
        loadingVehicles={loadingVehicles}
        onBrandChange={handleBrandChange}
        onModelChange={handleModelChange}
        onYearChange={handleYearChange}
        onVehicleChange={handleVehicleChange}
        />

        {selectedVehicle && (
          <>
            <ProjectBuilder
              token={token}
              selectedVehicleData={selectedVehicleData}
              currentProject={currentProject}
              projectName={projectName}
              projectMode={projectMode}
              loadingProject={loadingProject}
              projectError={projectError}
              onProjectNameChange={setProjectName}
              onProjectModeChange={setProjectMode}
              onCreate={handleCreateProject}
              onNewProject={handleNewProject}
            />

            {currentProject && (
              <PartsCatalog
                categories={categories}
                parts={parts}
                compatibilities={compatibilities}
                currentProject={currentProject}
                selectedCategory={selectedCategory}
                loadingCategories={loadingCategories}
                loadingParts={loadingParts}
                projectParts={projectParts}
                onCategoryChange={handleCategoryChange}
                onAddPart={handleAddPart}
              />
            )}
          </>
        )}

        {currentProject && (
          <CurrentProject
            currentProject={currentProject}
            projectParts={projectParts}
            projectPartDetails={projectPartDetails}
            projectTotal={projectTotal}
            editingProject={editingProject}
            editProjectName={editProjectName}
            editProjectMode={editProjectMode}
            projectActionLoading={projectActionLoading}
            projectError={projectError}
            onStartEdit={handleStartEditProject}
            onCancelEdit={handleCancelEditProject}
            onSaveEdit={handleSaveProjectEdit}
            onEditNameChange={setEditProjectName}
            onEditModeChange={setEditProjectMode}
            onDuplicate={handleDuplicateCurrentProject}
            onDelete={handleDeleteCurrentProject}
            onTogglePublication={handleToggleProjectPublication}
            onCopyShareLink={handleCopyShareLink}
            onUpdateQuantity={handleUpdatePartQuantity}
            onRemovePart={handleRemovePart}
          />
        )}

        {error && <p>{error}</p>}
      </main>
    )
  }

  if (view === 'public' && shareToken) {
    return <PublicProjectPage shareToken={shareToken} />
  }

  if (!token && view === 'landing') {
    return <LandingPage onEnter={handleGoToLogin} />
  }

  if (!token && view === 'login') {
    return (
      <AuthPanel
        mode={authMode}
        email={authEmail}
        password={authPassword}
        name={authName}
        username={authUsername}
        loading={loadingAuth}
        error={authError}
        message={authMessage}
        onModeChange={setAuthMode}
        onEmailChange={setAuthEmail}
        onPasswordChange={setAuthPassword}
        onNameChange={setAuthName}
        onUsernameChange={setAuthUsername}
        onSubmit={authMode === 'login' ? handleLogin : handleRegister}
        onBack={() => setView('landing')}
      />
    )
  }

  return renderHome()
}

export default App

const API_URL = 'http://localhost:3000/api'

export async function getBrands() {
  const response = await fetch(`${API_URL}/cars/brands`)

  if (!response.ok) {
    throw new Error('Erro ao buscar marcas')
  }

  return response.json()
}

export async function getModelsByBrand(brandId) {
  const response = await fetch(
    `${API_URL}/cars/brands/${brandId}/models`,
  )

  if (!response.ok) {
    throw new Error('Erro ao buscar modelos')
  }

  return response.json()
}

export async function getGenerationsByModel(modelId) {
  const response = await fetch(
    `${API_URL}/cars/models/${modelId}/generations`,
  )

  if (!response.ok) {
    throw new Error('Erro ao buscar gerações')
  }

  return response.json()
}

export async function getVehiclesByGeneration(generationId) {
  const response = await fetch(
    `${API_URL}/cars/generations/${generationId}/vehicles`,
  )

  if (!response.ok) {
    throw new Error('Erro ao buscar veículos')
  }

  return response.json()
}

export async function getPartCategories() {
  const response = await fetch(
    `${API_URL}/parts/categories`,
  )

  if (!response.ok) {
    throw new Error('Erro ao buscar categorias de peças')
  }

  return response.json()
}

export async function getPartsByCategory(categoryId) {
  const response = await fetch(
    `${API_URL}/parts/categories/${categoryId}/parts`,
  )

  if (!response.ok) {
    throw new Error('Erro ao buscar peças')
  }

  return response.json()
}

export async function registerUser(userData) {
  const response = await fetch(
    `${API_URL}/auth/register`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    },
  )

  const data = await response.json()

  if (!response.ok) {
    throw new Error(
      data.message || 'Erro ao cadastrar usuário',
    )
  }

  return data
}

export async function loginUser(email, password) {
  const response = await fetch(
    `${API_URL}/auth/login`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
      }),
    },
  )

  const data = await response.json()

  if (!response.ok) {
    throw new Error(
      data.message || 'Erro ao realizar login',
    )
  }

  return data
}

export async function createProject(
  token,
  vehicleId,
  name,
  mode,
) {
  const response = await fetch(
    `${API_URL}/projects`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        vehicleId,
        name,
        mode,
      }),
    },
  )

  const data = await response.json()

  if (!response.ok) {
    throw new Error(
      data.message || 'Erro ao criar projeto',
    )
  }

  return data
}

export async function getProjectParts(
  token,
  projectId,
) {
  const response = await fetch(
    `${API_URL}/projects/${projectId}/parts`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  )

  const data = await response.json()

  if (!response.ok) {
    throw new Error(
      data.message ||
        'Erro ao buscar peças do projeto',
    )
  }

  return data
}

export async function addPartToProject(
  token,
  projectId,
  partId,
  quantity = 1,
) {
  const response = await fetch(
    `${API_URL}/projects/${projectId}/parts`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        partId,
        quantity,
      }),
    },
  )

  const data = await response.json()

  if (!response.ok) {
    throw new Error(
      data.message ||
        'Erro ao adicionar peça ao projeto',
    )
  }

  return data
}

export async function removePartFromProject(
  token,
  projectId,
  partId,
) {
  const response = await fetch(
    `${API_URL}/projects/${projectId}/parts/${partId}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  )

  const data = await response.json()

  if (!response.ok) {
    throw new Error(
      data.message ||
        'Erro ao remover peça do projeto',
    )
  }

  return data
}

export async function getProjects(token) {
  const response = await fetch(
    `${API_URL}/projects`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  )

  const data = await response.json()

  if (!response.ok) {
    throw new Error(
      data.message ||
        'Erro ao buscar projetos',
    )
  }

  return data
}

export async function getProject(
  token,
  projectId,
) {
  const response = await fetch(
    `${API_URL}/projects/${projectId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  )

  const data = await response.json()

  if (!response.ok) {
    throw new Error(
      data.message ||
        'Erro ao buscar projeto',
    )
  }

  return data
}

export async function getCompatibilitiesByVehicle(
  vehicleId,
) {
  const response = await fetch(
    `${API_URL}/parts/vehicles/${vehicleId}/compatibilities`,
  )

  const data = await response.json()

  if (!response.ok) {
    throw new Error(
      data.message ||
        'Erro ao buscar compatibilidades',
    )
  }

  return data
}
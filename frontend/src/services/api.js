export const API_URL = 'http://localhost:3000/api'

// Quem está logado manda o token também nas listas do catálogo: é com ele que
// o servidor libera os carros e peças do plano Pro.
function optionalAuth(token) {
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {}
}

export async function getBrands(token) {
  const response = await fetch(`${API_URL}/cars/brands`, optionalAuth(token))

  if (!response.ok) {
    throw new Error('Erro ao buscar marcas')
  }

  return response.json()
}

export async function getModelsByBrand(brandId, token) {
  const response = await fetch(
    `${API_URL}/cars/brands/${brandId}/models`,
    optionalAuth(token),
  )

  if (!response.ok) {
    throw new Error('Erro ao buscar modelos')
  }

  return response.json()
}

export async function getGenerationsByModel(modelId, token) {
  const response = await fetch(
    `${API_URL}/cars/models/${modelId}/generations`,
    optionalAuth(token),
  )

  if (!response.ok) {
    throw new Error('Erro ao buscar gerações')
  }

  return response.json()
}

export async function getVehiclesByGeneration(generationId, token) {
  const response = await fetch(
    `${API_URL}/cars/generations/${generationId}/vehicles`,
    optionalAuth(token),
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

export async function getPartsByCategory(categoryId, token) {
  const response = await fetch(
    `${API_URL}/parts/categories/${categoryId}/parts`,
    optionalAuth(token),
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
    const error = new Error(
      data.message || 'Erro ao criar projeto',
    )
    error.code = data.code
    throw error
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

export async function updateProjectPartQuantity(
  token,
  projectId,
  partId,
  quantity,
) {
  const response = await fetch(
    `${API_URL}/projects/${projectId}/parts/${partId}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        quantity,
      }),
    },
  )

  const data = await response.json()

  if (!response.ok) {
    throw new Error(
      data.message ||
        'Erro ao atualizar quantidade da peça',
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

export async function updateProject(
  token,
  projectId,
  name,
  mode,
) {
  const response = await fetch(
    `${API_URL}/projects/${projectId}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name,
        mode,
      }),
    },
  )

  const data = await response.json()

  if (!response.ok) {
    throw new Error(
      data.message ||
        'Erro ao atualizar projeto',
    )
  }

  return data
}

export async function deleteProject(
  token,
  projectId,
) {
  const response = await fetch(
    `${API_URL}/projects/${projectId}`,
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
        'Erro ao excluir projeto',
    )
  }

  return data
}

export async function duplicateProject(
  token,
  projectId,
) {
  const response = await fetch(
    `${API_URL}/projects/${projectId}/duplicate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  )

  const data = await response.json()

  if (!response.ok) {
    throw new Error(
      data.message ||
        'Erro ao duplicar projeto',
    )
  }

  return data
}

export async function updateProjectPublication(
  token,
  projectId,
  isPublic,
  details = {},
) {
  const response = await fetch(`${API_URL}/projects/${projectId}/publication`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ isPublic, ...details }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Erro ao alterar publicação do projeto')
  }

  return data
}

export async function getFeed({ page = 1, limit = 12 } = {}) {
  const response = await fetch(
    `${API_URL}/projects/feed?page=${page}&limit=${limit}`,
  )

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Erro ao carregar o feed')
  }

  return data
}

export async function getPublicProject(
  shareToken,
) {
  const response = await fetch(
    `${API_URL}/projects/share/${shareToken}`,
  )

  const data = await response.json()

  if (!response.ok) {
    throw new Error(
      data.message ||
        'Projeto público não encontrado',
    )
  }

  return data
}


const ASSET_URL = API_URL.replace(/\/api$/, '')

export function assetUrl(path) {
  if (!path) return ''
  return path.startsWith('http') ? path : `${ASSET_URL}${path}`
}

export async function uploadProjectCover(token, projectId, image) {
  const response = await fetch(`${API_URL}/projects/${projectId}/cover`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ image }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Erro ao salvar a capa do projeto')
  }

  return data
}
export async function getMe(token) {
  const response = await fetch(`${API_URL}/users/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Erro ao buscar usuário')
  }

  return data
}

export async function getUserProfile(username) {
  const response = await fetch(
    `${API_URL}/users/${encodeURIComponent(username)}/profile`,
  )

  const data = await response.json()

  if (!response.ok) {
    const error = new Error(data.message || 'Erro ao carregar o perfil')
    error.status = response.status
    throw error
  }

  return data
}

export async function deleteAccount(token, password) {
  const response = await fetch(`${API_URL}/users/me`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ password }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Erro ao excluir a conta')
  }

  return data
}

export const API_URL = 'http://localhost:4000/api'

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

// Destaca (ou tira o destaque de) um projeto no perfil. Recurso Pro.
export async function updateProjectFeatured(token, projectId, featured) {
  const response = await fetch(`${API_URL}/projects/${projectId}/featured`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ featured }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Erro ao destacar o projeto')
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

// sort: 'recent' (padrão) | 'views' | 'likes'
export async function getFeed({ page = 1, limit = 12, sort = 'recent' } = {}) {
  const response = await fetch(
    `${API_URL}/projects/feed?page=${page}&limit=${limit}&sort=${sort}`,
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

// color = "#rrggbb" ou null (volta para a cor original); finish = GLOSS | MATTE | METALLIC | PEARL
export async function updateProjectPaint(token, projectId, color, finish) {
  const response = await fetch(`${API_URL}/projects/${projectId}/paint`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ color, finish }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Erro ao salvar a pintura')
  }

  return data
}

// Compara dois projetos do usuário lado a lado. Recurso Pro.
export async function compareProjects(token, a, b) {
  const response = await fetch(
    `${API_URL}/projects/compare?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  )

  const data = await response.json()

  if (!response.ok) {
    const error = new Error(data.message || 'Erro ao comparar projetos')
    error.code = data.code
    throw error
  }

  return data
}

// Liga/desliga o compartilhamento só com link. Recurso Pro.
export async function updateProjectLink(token, projectId, enabled) {
  const response = await fetch(`${API_URL}/projects/${projectId}/link`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ enabled }),
  })

  const data = await response.json()

  if (!response.ok) {
    const error = new Error(data.message || 'Erro ao alterar o link do projeto')
    error.code = data.code
    throw error
  }

  return data
}

// Avisa o servidor que alguém abriu o projeto compartilhado (uma vez por sessão).
export async function registerProjectView(shareToken) {
  await fetch(`${API_URL}/projects/share/${shareToken}/view`, {
    method: 'POST',
  })
}

// Números do projeto para o dono: { views, likes }. Recurso Pro.
export async function getProjectStats(token, projectId) {
  const response = await fetch(`${API_URL}/projects/${projectId}/stats`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Erro ao buscar as estatísticas')
  }

  return data.stats
}

// ---- assinatura (plano Pro) -------------------------------------------------

async function subscriptionRequest(token, path = '', method = 'GET', body) {
  const response = await fetch(`${API_URL}/subscription${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const data = await response.json()

  if (!response.ok) {
    const error = new Error(data.message || 'Erro na assinatura')
    error.code = data.code
    throw error
  }

  return data.subscription
}

// { state: NONE | ACTIVE | CANCELED | EXPIRED | MANUAL, period, currentPeriodEnd, ... }
export function getSubscription(token) {
  return subscriptionRequest(token)
}

// period: 'MONTHLY' | 'YEARLY'; card: { number, name, expiry (MM/AA), cvc }
export function subscribePro(token, period, card) {
  return subscriptionRequest(token, '', 'POST', { period, card })
}

export function cancelSubscription(token) {
  return subscriptionRequest(token, '/cancel', 'POST')
}

export function reactivateSubscription(token) {
  return subscriptionRequest(token, '/reactivate', 'POST')
}

// ---- recuperação de senha ---------------------------------------------------

async function passwordRequest(path, body) {
  const response = await fetch(`${API_URL}/auth/password/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Erro ao recuperar a senha')
  }

  return data
}

// Pede o código por e-mail (a resposta é a mesma exista o e-mail ou não)
export function forgotPassword(email) {
  return passwordRequest('forgot', { email })
}

// Confere o código de 6 dígitos
export function verifyResetCode(email, code) {
  return passwordRequest('verify', { email, code })
}

// Define a nova senha com o e-mail e o código confirmados
export function resetPassword(email, code, password) {
  return passwordRequest('reset', { email, code, password })
}
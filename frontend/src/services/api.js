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
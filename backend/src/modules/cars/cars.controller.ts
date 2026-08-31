import type { Request, Response } from 'express'

import {
  createBrand,
  getBrandById,
  listBrands,
  createGeneration,
  createModel,
  createVehicle,
  getGenerationById,
  getModelById,
  getVehicleById,
  listGenerationsByModel,
  listModelsByBrand,
  listVehiclesByGeneration
} from './cars.service'

export async function getBrands(
  _req: Request,
  res: Response,
) {
  try {
    const brands = await listBrands()

    return res.json({
      brands,
    })
  } catch (error) {
    console.error(error)

    return res.status(500).json({
      message: 'Erro interno do servidor',
    })
  }
}

export async function getBrand(
  req: Request,
  res: Response,
) {
  try {
    const id = Number(req.params.id)

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        message: 'ID da marca inválido',
      })
    }

    const brand = await getBrandById(id)

    if (!brand) {
      return res.status(404).json({
        message: 'Marca não encontrada',
      })
    }

    return res.json({
      brand,
    })
  } catch (error) {
    console.error(error)

    return res.status(500).json({
      message: 'Erro interno do servidor',
    })
  }
}

export async function postBrand(
  req: Request,
  res: Response,
) {
  try {
    const { name, slug } = req.body

    if (!name || !slug) {
      return res.status(400).json({
        message: 'Nome e slug são obrigatórios',
      })
    }

    const brand = await createBrand(
      name.trim(),
      slug.trim().toLowerCase(),
    )

    return res.status(201).json({
      message: 'Marca criada com sucesso',
      brand,
    })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'BRAND_NAME_ALREADY_EXISTS') {
        return res.status(409).json({
          message: 'Marca já cadastrada',
        })
      }

      if (error.message === 'BRAND_SLUG_ALREADY_EXISTS') {
        return res.status(409).json({
          message: 'Slug já cadastrado',
        })
      }
    }

    console.error(error)

    return res.status(500).json({
      message: 'Erro interno do servidor',
    })
  }
}

export async function getModelsByBrand(
  req: Request,
  res: Response,
) {
  try {
    const brandId = Number(req.params.brandId)

    if (!Number.isInteger(brandId)) {
      return res.status(400).json({
        message: 'ID da marca inválido',
      })
    }

    const models = await listModelsByBrand(brandId)

    return res.json({
      models,
    })
  } catch (error) {
    console.error(error)

    return res.status(500).json({
      message: 'Erro interno do servidor',
    })
  }
}

export async function getModel(
  req: Request,
  res: Response,
) {
  try {
    const id = Number(req.params.id)

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        message: 'ID do modelo inválido',
      })
    }

    const model = await getModelById(id)

    if (!model) {
      return res.status(404).json({
        message: 'Modelo não encontrado',
      })
    }

    return res.json({
      model,
    })
  } catch (error) {
    console.error(error)

    return res.status(500).json({
      message: 'Erro interno do servidor',
    })
  }
}

export async function postModel(
  req: Request,
  res: Response,
) {
  try {
    const { brandId, name, slug } = req.body

    if (!brandId || !name || !slug) {
      return res.status(400).json({
        message: 'brandId, name e slug são obrigatórios',
      })
    }

    const model = await createModel(
      Number(brandId),
      name.trim(),
      slug.trim().toLowerCase(),
    )

    return res.status(201).json({
      message: 'Modelo criado com sucesso',
      model,
    })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'BRAND_NOT_FOUND') {
        return res.status(404).json({
          message: 'Marca não encontrada',
        })
      }

      if (error.message === 'MODEL_SLUG_ALREADY_EXISTS') {
        return res.status(409).json({
          message: 'Slug do modelo já cadastrado',
        })
      }
    }

    console.error(error)

    return res.status(500).json({
      message: 'Erro interno do servidor',
    })
  }
}

export async function getGenerationsByModel(
  req: Request,
  res: Response,
) {
  try {
    const modelId = Number(req.params.modelId)

    if (!Number.isInteger(modelId)) {
      return res.status(400).json({
        message: 'ID do modelo inválido',
      })
    }

    const generations = await listGenerationsByModel(modelId)

    return res.json({
      generations,
    })
  } catch (error) {
    console.error(error)

    return res.status(500).json({
      message: 'Erro interno do servidor',
    })
  }
}

export async function getGeneration(
  req: Request,
  res: Response,
) {
  try {
    const id = Number(req.params.id)

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        message: 'ID da geração inválido',
      })
    }

    const generation = await getGenerationById(id)

    if (!generation) {
      return res.status(404).json({
        message: 'Geração não encontrada',
      })
    }

    return res.json({
      generation,
    })
  } catch (error) {
    console.error(error)

    return res.status(500).json({
      message: 'Erro interno do servidor',
    })
  }
}

export async function postGeneration(
  req: Request,
  res: Response,
) {
  try {
    const {
      modelId,
      name,
      yearStart,
      yearEnd,
    } = req.body

    if (!modelId || !name || !yearStart) {
      return res.status(400).json({
        message: 'modelId, name e yearStart são obrigatórios',
      })
    }

    const generation = await createGeneration(
      Number(modelId),
      name.trim(),
      Number(yearStart),
      yearEnd ? Number(yearEnd) : undefined,
    )

    return res.status(201).json({
      message: 'Geração criada com sucesso',
      generation,
    })
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === 'MODEL_NOT_FOUND'
    ) {
      return res.status(404).json({
        message: 'Modelo não encontrado',
      })
    }

    console.error(error)

    return res.status(500).json({
      message: 'Erro interno do servidor',
    })
  }
}

export async function getVehiclesByGeneration(
  req: Request,
  res: Response,
) {
  try {
    const generationId = Number(req.params.generationId)

    if (!Number.isInteger(generationId)) {
      return res.status(400).json({
        message: 'ID da geração inválido',
      })
    }

    const vehicles =
      await listVehiclesByGeneration(generationId)

    return res.json({
      vehicles,
    })
  } catch (error) {
    console.error(error)

    return res.status(500).json({
      message: 'Erro interno do servidor',
    })
  }
}

export async function getVehicle(
  req: Request,
  res: Response,
) {
  try {
    const id = Number(req.params.id)

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        message: 'ID do veículo inválido',
      })
    }

    const vehicle = await getVehicleById(id)

    if (!vehicle) {
      return res.status(404).json({
        message: 'Veículo não encontrado',
      })
    }

    return res.json({
      vehicle,
    })
  } catch (error) {
    console.error(error)

    return res.status(500).json({
      message: 'Erro interno do servidor',
    })
  }
}

export async function postVehicle(
  req: Request,
  res: Response,
) {
  try {
    const {
      generationId,
      year,
      version,
      engine,
      transmission,
    } = req.body

    if (!generationId || !year) {
      return res.status(400).json({
        message: 'generationId e year são obrigatórios',
      })
    }

    const vehicle = await createVehicle(
      Number(generationId),
      Number(year),
      version?.trim(),
      engine?.trim(),
      transmission?.trim(),
    )

    return res.status(201).json({
      message: 'Veículo criado com sucesso',
      vehicle,
    })
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === 'GENERATION_NOT_FOUND'
    ) {
      return res.status(404).json({
        message: 'Geração não encontrada',
      })
    }

    console.error(error)

    return res.status(500).json({
      message: 'Erro interno do servidor',
    })
  }
}
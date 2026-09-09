import type { Request, Response } from 'express'

import {
  createCategory,
  createPart,
  getCategoryById,
  getPartById,
  listCategories,
  listPartsByCategory,
  listCompatibilitiesByVehicle,
} from './parts.service'

export async function getCategories(
  _req: Request,
  res: Response,
) {
  try {
    const categories = await listCategories()

    return res.json({
      categories,
    })
  } catch (error) {
    console.error(error)

    return res.status(500).json({
      message: 'Erro interno do servidor',
    })
  }
}

export async function getCategory(
  req: Request,
  res: Response,
) {
  try {
    const id = Number(req.params.id)

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        message: 'ID da categoria inválido',
      })
    }

    const category = await getCategoryById(id)

    if (!category) {
      return res.status(404).json({
        message: 'Categoria não encontrada',
      })
    }

    return res.json({
      category,
    })
  } catch (error) {
    console.error(error)

    return res.status(500).json({
      message: 'Erro interno do servidor',
    })
  }
}

export async function postCategory(
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

    const category = await createCategory(
      name.trim(),
      slug.trim().toLowerCase(),
    )

    return res.status(201).json({
      message: 'Categoria criada com sucesso',
      category,
    })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'CATEGORY_NAME_ALREADY_EXISTS') {
        return res.status(409).json({
          message: 'Categoria já cadastrada',
        })
      }

      if (error.message === 'CATEGORY_SLUG_ALREADY_EXISTS') {
        return res.status(409).json({
          message: 'Slug da categoria já cadastrado',
        })
      }
    }

    console.error(error)

    return res.status(500).json({
      message: 'Erro interno do servidor',
    })
  }
}

export async function getPartsByCategory(
  req: Request,
  res: Response,
) {
  try {
    const categoryId = Number(req.params.categoryId)

    if (!Number.isInteger(categoryId)) {
      return res.status(400).json({
        message: 'ID da categoria inválido',
      })
    }

    const parts = await listPartsByCategory(categoryId)

    return res.json({
      parts,
    })
  } catch (error) {
    console.error(error)

    return res.status(500).json({
      message: 'Erro interno do servidor',
    })
  }
}

export async function getPart(
  req: Request,
  res: Response,
) {
  try {
    const id = Number(req.params.id)

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        message: 'ID da peça inválido',
      })
    }

    const part = await getPartById(id)

    if (!part) {
      return res.status(404).json({
        message: 'Peça não encontrada',
      })
    }

    return res.json({
      part,
    })
  } catch (error) {
    console.error(error)

    return res.status(500).json({
      message: 'Erro interno do servidor',
    })
  }
}

export async function postPart(
  req: Request,
  res: Response,
) {
  try {
    const {
      categoryId,
      name,
      slug,
      brand,
      description,
      estimatedPrice,
      imageUrl,
      modelUrl,
    } = req.body

    if (
      !categoryId ||
      !name ||
      !slug ||
      estimatedPrice === undefined
    ) {
      return res.status(400).json({
        message:
          'categoryId, name, slug e estimatedPrice são obrigatórios',
      })
    }

    const part = await createPart(
      Number(categoryId),
      name.trim(),
      slug.trim().toLowerCase(),
      Number(estimatedPrice),
      brand?.trim(),
      description?.trim(),
      imageUrl?.trim(),
      modelUrl?.trim(),
    )

    return res.status(201).json({
      message: 'Peça criada com sucesso',
      part,
    })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'CATEGORY_NOT_FOUND') {
        return res.status(404).json({
          message: 'Categoria não encontrada',
        })
      }

      if (error.message === 'PART_SLUG_ALREADY_EXISTS') {
        return res.status(409).json({
          message: 'Slug da peça já cadastrado nessa categoria',
        })
      }
    }

    console.error(error)

    return res.status(500).json({
      message: 'Erro interno do servidor',
    })
  }
}

export async function getCompatibilitiesByVehicle(
  req: Request,
  res: Response,
) {
  try {
    const vehicleId = Number(
      req.params.vehicleId,
    )

    if (!Number.isInteger(vehicleId)) {
      return res.status(400).json({
        message: 'ID do veículo inválido',
      })
    }

    const compatibilities =
      await listCompatibilitiesByVehicle(
        vehicleId,
      )

    return res.json({
      compatibilities,
    })
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === 'VEHICLE_NOT_FOUND'
    ) {
      return res.status(404).json({
        message: 'Veículo não encontrado',
      })
    }

    console.error(error)

    return res.status(500).json({
      message: 'Erro interno do servidor',
    })
  }
}
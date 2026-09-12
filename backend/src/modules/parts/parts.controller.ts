import type { Request, Response } from 'express'

import {
  createCategory,
  createCompatibility,
  createPart,
  deleteCompatibility as deleteCompatibilityService,
  getCategoryById,
  getPartById,
  listCategories,
  listCompatibilitiesByPart,
  listCompatibilitiesByVehicle,
  listPartsByCategory,
  updateCompatibility,
} from './parts.service'

export async function getCategories(
  _req: Request,
  res: Response,
) {
  try {
    const categories =
      await listCategories()

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

    const category =
      await getCategoryById(id)

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

    if (
      typeof name !== 'string' ||
      typeof slug !== 'string' ||
      !name.trim() ||
      !slug.trim()
    ) {
      return res.status(400).json({
        message:
          'Nome e slug são obrigatórios',
      })
    }

    const category =
      await createCategory(
        name.trim(),
        slug.trim().toLowerCase(),
      )

    return res.status(201).json({
      message:
        'Categoria criada com sucesso',
      category,
    })
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message ===
        'CATEGORY_NAME_ALREADY_EXISTS'
      ) {
        return res.status(409).json({
          message:
            'Categoria já cadastrada',
        })
      }

      if (
        error.message ===
        'CATEGORY_SLUG_ALREADY_EXISTS'
      ) {
        return res.status(409).json({
          message:
            'Slug da categoria já cadastrado',
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
    const categoryId = Number(
      req.params.categoryId,
    )

    if (!Number.isInteger(categoryId)) {
      return res.status(400).json({
        message:
          'ID da categoria inválido',
      })
    }

    const parts =
      await listPartsByCategory(
        categoryId,
      )

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

    const part =
      await getPartById(id)

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
      categoryId === undefined ||
      typeof name !== 'string' ||
      typeof slug !== 'string' ||
      estimatedPrice === undefined
    ) {
      return res.status(400).json({
        message:
          'categoryId, name, slug e estimatedPrice são obrigatórios',
      })
    }

    const numericCategoryId =
      Number(categoryId)

    const numericEstimatedPrice =
      Number(estimatedPrice)

    if (
      !Number.isInteger(
        numericCategoryId,
      )
    ) {
      return res.status(400).json({
        message:
          'categoryId inválido',
      })
    }

    if (
      !Number.isFinite(
        numericEstimatedPrice,
      ) ||
      numericEstimatedPrice < 0
    ) {
      return res.status(400).json({
        message:
          'estimatedPrice deve ser um número maior ou igual a zero',
      })
    }

    const part =
      await createPart(
        numericCategoryId,
        name.trim(),
        slug.trim().toLowerCase(),
        numericEstimatedPrice,
        typeof brand === 'string'
          ? brand.trim() || undefined
          : undefined,
        typeof description === 'string'
          ? description.trim() ||
              undefined
          : undefined,
        typeof imageUrl === 'string'
          ? imageUrl.trim() || undefined
          : undefined,
        typeof modelUrl === 'string'
          ? modelUrl.trim() || undefined
          : undefined,
      )

    return res.status(201).json({
      message:
        'Peça criada com sucesso',
      part,
    })
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message ===
        'CATEGORY_NOT_FOUND'
      ) {
        return res.status(404).json({
          message:
            'Categoria não encontrada',
        })
      }

      if (
        error.message ===
        'PART_SLUG_ALREADY_EXISTS'
      ) {
        return res.status(409).json({
          message:
            'Slug da peça já cadastrado nessa categoria',
        })
      }

      if (
        error.message ===
        'INVALID_ESTIMATED_PRICE'
      ) {
        return res.status(400).json({
          message:
            'estimatedPrice inválido',
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
        message:
          'ID do veículo inválido',
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
      error.message ===
        'VEHICLE_NOT_FOUND'
    ) {
      return res.status(404).json({
        message:
          'Veículo não encontrado',
      })
    }

    console.error(error)

    return res.status(500).json({
      message: 'Erro interno do servidor',
    })
  }
}

export async function getCompatibilitiesByPart(
  req: Request,
  res: Response,
) {
  try {
    const partId = Number(
      req.params.partId,
    )

    if (!Number.isInteger(partId)) {
      return res.status(400).json({
        message:
          'ID da peça inválido',
      })
    }

    const compatibilities =
      await listCompatibilitiesByPart(
        partId,
      )

    return res.json({
      compatibilities,
    })
  } catch (error) {
    if (
      error instanceof Error &&
      error.message ===
        'PART_NOT_FOUND'
    ) {
      return res.status(404).json({
        message:
          'Peça não encontrada',
      })
    }

    console.error(error)

    return res.status(500).json({
      message: 'Erro interno do servidor',
    })
  }
}

export async function postCompatibility(
  req: Request,
  res: Response,
) {
  try {
    const {
      partId,
      vehicleId,
      level,
      requiresAdaptation,
      notes,
    } = req.body

    const numericPartId =
      Number(partId)

    const numericVehicleId =
      Number(vehicleId)

    if (
      !Number.isInteger(numericPartId) ||
      !Number.isInteger(
        numericVehicleId,
      )
    ) {
      return res.status(400).json({
        message:
          'partId e vehicleId são obrigatórios e devem ser válidos',
      })
    }

    if (
      level !== 'COMPATIBLE' &&
      level !== 'ADAPTATION' &&
      level !== 'INCOMPATIBLE'
    ) {
      return res.status(400).json({
        message:
          'level deve ser COMPATIBLE, ADAPTATION ou INCOMPATIBLE',
      })
    }

    const normalizedRequiresAdaptation =
      requiresAdaptation === true

    if (
      requiresAdaptation !== undefined &&
      typeof requiresAdaptation !==
        'boolean'
    ) {
      return res.status(400).json({
        message:
          'requiresAdaptation deve ser booleano',
      })
    }

    if (
      notes !== undefined &&
      typeof notes !== 'string'
    ) {
      return res.status(400).json({
        message:
          'notes deve ser texto',
      })
    }

    const compatibility =
      await createCompatibility(
        numericPartId,
        numericVehicleId,
        level,
        normalizedRequiresAdaptation,
        typeof notes === 'string'
          ? notes.trim() || undefined
          : undefined,
      )

    return res.status(201).json({
      message:
        'Compatibilidade criada com sucesso',
      compatibility,
    })
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message ===
        'PART_NOT_FOUND'
      ) {
        return res.status(404).json({
          message:
            'Peça não encontrada',
        })
      }

      if (
        error.message ===
        'VEHICLE_NOT_FOUND'
      ) {
        return res.status(404).json({
          message:
            'Veículo não encontrado',
        })
      }

      if (
        error.message ===
        'COMPATIBILITY_ALREADY_EXISTS'
      ) {
        return res.status(409).json({
          message:
            'A compatibilidade dessa peça com esse veículo já está cadastrada',
        })
      }
    }

    console.error(error)

    return res.status(500).json({
      message: 'Erro interno do servidor',
    })
  }
}

export async function patchCompatibility(
  req: Request,
  res: Response,
) {
  try {
    const id = Number(req.params.id)

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        message:
          'ID da compatibilidade inválido',
      })
    }

    const {
      level,
      requiresAdaptation,
      notes,
    } = req.body

    if (
      level !== undefined &&
      level !== 'COMPATIBLE' &&
      level !== 'ADAPTATION' &&
      level !== 'INCOMPATIBLE'
    ) {
      return res.status(400).json({
        message:
          'level deve ser COMPATIBLE, ADAPTATION ou INCOMPATIBLE',
      })
    }

    if (
      requiresAdaptation !== undefined &&
      typeof requiresAdaptation !==
        'boolean'
    ) {
      return res.status(400).json({
        message:
          'requiresAdaptation deve ser booleano',
      })
    }

    if (
      notes !== undefined &&
      typeof notes !== 'string'
    ) {
      return res.status(400).json({
        message:
          'notes deve ser texto',
      })
    }

    const compatibility =
      await updateCompatibility(
        id,
        level,
        requiresAdaptation,
        typeof notes === 'string'
          ? notes.trim() || undefined
          : undefined,
      )

    return res.json({
      message:
        'Compatibilidade atualizada com sucesso',
      compatibility,
    })
  } catch (error) {
    if (
      error instanceof Error &&
      error.message ===
        'COMPATIBILITY_NOT_FOUND'
    ) {
      return res.status(404).json({
        message:
          'Compatibilidade não encontrada',
      })
    }

    console.error(error)

    return res.status(500).json({
      message: 'Erro interno do servidor',
    })
  }
}

export async function deleteCompatibility(
  req: Request,
  res: Response,
) {
  try {
    const id = Number(req.params.id)

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        message:
          'ID da compatibilidade inválido',
      })
    }

    await deleteCompatibilityService(id)

    return res.json({
      message:
        'Compatibilidade removida com sucesso',
    })
  } catch (error) {
    if (
      error instanceof Error &&
      error.message ===
        'COMPATIBILITY_NOT_FOUND'
    ) {
      return res.status(404).json({
        message:
          'Compatibilidade não encontrada',
      })
    }

    console.error(error)

    return res.status(500).json({
      message: 'Erro interno do servidor',
    })
  }
}
import type { Request, Response } from 'express'

import type {
  AuthenticatedRequest,
} from '../../middlewares/auth.middleware'

import {
  addPartToProject,
  createProject,
  deleteProject,
  duplicateProject,
  getPublicProject,
  getFeed,
  listProjectParts,
  listProjectsByUser,
  publishProject,
  removePartFromProject,
  updateProject,
  updateProjectPartQuantity,
  getProjectById,
  saveProjectCover,
} from './projects.service'

export async function getProjects(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const projects =
      await listProjectsByUser(
        req.userId!,
      )

    return res.json({
      projects,
    })
  } catch (error) {
    console.error(error)

    return res.status(500).json({
      message:
        'Erro interno do servidor',
    })
  }
}

export async function getProject(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const id = Number(
      req.params.id,
    )

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        message:
          'ID do projeto inválido',
      })
    }

    const project =
      await getProjectById(
        id,
        req.userId!,
      )

    if (!project) {
      return res.status(404).json({
        message:
          'Projeto não encontrado',
      })
    }

    return res.json({
      project,
    })
  } catch (error) {
    console.error(error)

    return res.status(500).json({
      message:
        'Erro interno do servidor',
    })
  }
}

export async function putProjectCoverController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const id = Number(req.params.id)
    const { image } = req.body

    if (!Number.isInteger(id)) {
      return res.status(400).json({ message: 'ID do projeto inválido' })
    }

    if (typeof image !== 'string') {
      return res.status(400).json({ message: 'image é obrigatória' })
    }

       const project = await saveProjectCover(id, req.userId!, image)

    return res.json({ coverUrl: project?.coverUrl ?? null })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'PROJECT_NOT_FOUND') {
        return res.status(404).json({ message: 'Projeto não encontrado' })
      }

      if (error.message === 'INVALID_COVER') {
        return res.status(400).json({ message: 'Imagem de capa inválida' })
      }
    }

    console.error(error)

    return res.status(500).json({ message: 'Erro interno do servidor' })
  }
}

export async function postProject(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const {
      vehicleId,
      name,
      mode,
    } = req.body

    if (
      !vehicleId ||
      typeof name !== 'string' ||
      !name.trim()
    ) {
      return res.status(400).json({
        message:
          'vehicleId e name são obrigatórios',
      })
    }

    const parsedVehicleId =
      Number(vehicleId)

    if (
      !Number.isInteger(
        parsedVehicleId,
      )
    ) {
      return res.status(400).json({
        message:
          'vehicleId inválido',
      })
    }

    if (
      mode !== 'REAL' &&
      mode !== 'FREE'
    ) {
      return res.status(400).json({
        message:
          'mode deve ser REAL ou FREE',
      })
    }

    const project =
      await createProject(
        req.userId!,
        parsedVehicleId,
        name.trim(),
        mode,
      )

    return res.status(201).json({
      message:
        'Projeto criado com sucesso',
      project,
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
      message:
        'Erro interno do servidor',
    })
  }
}

export async function patchProject(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const id = Number(
      req.params.id,
    )

    const {
      name,
      mode,
    } = req.body

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        message:
          'ID do projeto inválido',
      })
    }

    if (
      typeof name !== 'string' ||
      !name.trim()
    ) {
      return res.status(400).json({
        message:
          'name é obrigatório',
      })
    }

    if (
      mode !== 'REAL' &&
      mode !== 'FREE'
    ) {
      return res.status(400).json({
        message:
          'mode deve ser REAL ou FREE',
      })
    }

    const project =
      await updateProject(
        id,
        req.userId!,
        name.trim(),
        mode,
      )

    return res.json({
      message:
        'Projeto atualizado com sucesso',
      project,
    })
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message ===
        'PROJECT_NOT_FOUND'
      ) {
        return res.status(404).json({
          message:
            'Projeto não encontrado',
        })
      }

      if (
        error.message ===
        'PROJECT_HAS_INCOMPATIBLE_PARTS'
      ) {
        return res.status(409).json({
          message:
            'O projeto possui peças incompatíveis ou sem compatibilidade cadastrada para o modo Projeto Real.',
        })
      }

      if (
        error.message ===
        'INVALID_PROJECT_NAME'
      ) {
        return res.status(400).json({
          message:
            'Nome do projeto inválido',
        })
      }

      if (
        error.message ===
        'INVALID_PROJECT_MODE'
      ) {
        return res.status(400).json({
          message:
            'Modo do projeto inválido',
        })
      }
    }

    console.error(error)

    return res.status(500).json({
      message:
        'Erro interno do servidor',
    })
  }
}

export async function deleteProjectController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const id = Number(
      req.params.id,
    )

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        message:
          'ID do projeto inválido',
      })
    }

    await deleteProject(
      id,
      req.userId!,
    )

    return res.json({
      message:
        'Projeto excluído com sucesso',
    })
  } catch (error) {
    if (
      error instanceof Error &&
      error.message ===
        'PROJECT_NOT_FOUND'
    ) {
      return res.status(404).json({
        message:
          'Projeto não encontrado',
      })
    }

    console.error(error)

    return res.status(500).json({
      message:
        'Erro interno do servidor',
    })
  }
}

export async function duplicateProjectController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const id = Number(
      req.params.id,
    )

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        message:
          'ID do projeto inválido',
      })
    }

    const project =
      await duplicateProject(
        id,
        req.userId!,
      )

    return res.status(201).json({
      message:
        'Projeto duplicado com sucesso',
      project,
    })
  } catch (error) {
    if (
      error instanceof Error &&
      error.message ===
        'PROJECT_NOT_FOUND'
    ) {
      return res.status(404).json({
        message:
          'Projeto não encontrado',
      })
    }

    console.error(error)

    return res.status(500).json({
      message:
        'Erro interno do servidor',
    })
  }
}

export async function patchProjectPublication(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const id = Number(req.params.id)
    const { isPublic, name, description } = req.body

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        message: 'ID do projeto inválido',
      })
    }

    if (typeof isPublic !== 'boolean') {
      return res.status(400).json({
        message: 'isPublic deve ser booleano',
      })
    }

    if (
      name !== undefined &&
      (typeof name !== 'string' || !name.trim())
    ) {
      return res.status(400).json({
        message: 'Nome do projeto inválido',
      })
    }

    if (
      description !== undefined &&
      (typeof description !== 'string' || description.length > 500)
    ) {
      return res.status(400).json({
        message: 'A descrição deve ter no máximo 500 caracteres',
      })
    }

    const project = await publishProject(
      id,
      req.userId!,
      isPublic,
      { name, description },
    )

    return res.json({
      message: isPublic
        ? 'Projeto publicado com sucesso'
        : 'Projeto despublicado com sucesso',
      project,
    })
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === 'PROJECT_NOT_FOUND'
    ) {
      return res.status(404).json({
        message: 'Projeto não encontrado',
      })
    }

    console.error(error)

    return res.status(500).json({
      message: 'Erro interno do servidor',
    })
  }
}

export async function getFeedController(
  req: Request,
  res: Response,
) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(30, Math.max(1, Number(req.query.limit) || 12))

    const feed = await getFeed(page, limit)

    return res.json(feed)
  } catch (error) {
    console.error(error)

    return res.status(500).json({
      message: 'Erro interno do servidor',
    })
  }
}

export async function getPublicProjectController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
      const token = req.params.shareToken

      if (Array.isArray(token)) {
        return res.status(400).json({
          message:
            'Token de compartilhamento inválido',
        })
      }

      const data =
        await getPublicProject(token)

    return res.json(data)
  } catch (error) {
    if (
      error instanceof Error &&
      (
        error.message ===
          'PUBLIC_PROJECT_NOT_FOUND' ||
        error.message ===
          'SHARE_TOKEN_INVALID'
      )
    ) {
      return res.status(404).json({
        message:
          'Projeto público não encontrado',
      })
    }

    console.error(error)

    return res.status(500).json({
      message:
        'Erro interno do servidor',
    })
  }
}

export async function getProjectParts(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const projectId = Number(
      req.params.projectId,
    )

    if (!Number.isInteger(projectId)) {
      return res.status(400).json({
        message:
          'ID do projeto inválido',
      })
    }

    const parts =
      await listProjectParts(
        projectId,
        req.userId!,
      )

    return res.json({
      parts,
    })
  } catch (error) {
    if (
      error instanceof Error &&
      error.message ===
        'PROJECT_NOT_FOUND'
    ) {
      return res.status(404).json({
        message:
          'Projeto não encontrado',
      })
    }

    console.error(error)

    return res.status(500).json({
      message:
        'Erro interno do servidor',
    })
  }
}

export async function postProjectPart(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const projectId = Number(
      req.params.projectId,
    )

    const {
      partId,
      quantity,
    } = req.body

    if (!Number.isInteger(projectId)) {
      return res.status(400).json({
        message:
          'ID do projeto inválido',
      })
    }

    const parsedPartId =
      Number(partId)

    if (
      !Number.isInteger(
        parsedPartId,
      )
    ) {
      return res.status(400).json({
        message:
          'partId é obrigatório',
      })
    }

    const parsedQuantity =
      quantity === undefined
        ? 1
        : Number(quantity)

    if (
      !Number.isInteger(
        parsedQuantity,
      ) ||
      parsedQuantity < 1
    ) {
      return res.status(400).json({
        message:
          'quantity deve ser um número inteiro maior que zero',
      })
    }

    const projectPart =
      await addPartToProject(
        projectId,
        req.userId!,
        parsedPartId,
        parsedQuantity,
      )

    return res.status(200).json({
      message:
        'Peça adicionada/quantidade atualizada',
      projectPart,
    })
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message ===
        'PROJECT_NOT_FOUND'
      ) {
        return res.status(404).json({
          message:
            'Projeto não encontrado',
        })
      }

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
        'PART_NOT_COMPATIBLE'
      ) {
        return res.status(409).json({
          message:
            'Peça incompatível com o veículo no modo Projeto Real',
        })
      }

      if (
        error.message ===
        'INVALID_QUANTITY'
      ) {
        return res.status(400).json({
          message:
            'Quantidade deve ser um número inteiro maior que zero',
        })
      }
    }

    console.error(error)

    return res.status(500).json({
      message:
        'Erro interno do servidor',
    })
  }
}

export async function patchProjectPart(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const projectId = Number(
      req.params.projectId,
    )

    const partId = Number(
      req.params.partId,
    )

    const quantity = Number(
      req.body.quantity,
    )

    if (
      !Number.isInteger(projectId) ||
      !Number.isInteger(partId)
    ) {
      return res.status(400).json({
        message: 'ID inválido',
      })
    }

    if (
      !Number.isInteger(quantity) ||
      quantity < 1
    ) {
      return res.status(400).json({
        message:
          'quantity deve ser um número inteiro maior que zero',
      })
    }

    const projectPart =
      await updateProjectPartQuantity(
        projectId,
        req.userId!,
        partId,
        quantity,
      )

    return res.json({
      message:
        'Quantidade atualizada',
      projectPart,
    })
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message ===
        'PROJECT_NOT_FOUND'
      ) {
        return res.status(404).json({
          message:
            'Projeto não encontrado',
        })
      }

      if (
        error.message ===
        'PROJECT_PART_NOT_FOUND'
      ) {
        return res.status(404).json({
          message:
            'Peça não encontrada no projeto',
        })
      }

      if (
        error.message ===
        'INVALID_QUANTITY'
      ) {
        return res.status(400).json({
          message:
            'Quantidade deve ser um número inteiro maior que zero',
        })
      }
    }

    console.error(error)

    return res.status(500).json({
      message:
        'Erro interno do servidor',
    })
  }
}

export async function deleteProjectPart(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const projectId = Number(
      req.params.projectId,
    )

    const partId = Number(
      req.params.partId,
    )

    if (
      !Number.isInteger(projectId) ||
      !Number.isInteger(partId)
    ) {
      return res.status(400).json({
        message: 'ID inválido',
      })
    }

    await removePartFromProject(
      projectId,
      req.userId!,
      partId,
    )

    return res.json({
      message:
        'Peça removida do projeto',
    })
  } catch (error) {
    if (
      error instanceof Error &&
      error.message ===
        'PROJECT_NOT_FOUND'
    ) {
      return res.status(404).json({
        message:
          'Projeto não encontrado',
      })
    }

    console.error(error)

    return res.status(500).json({
      message:
        'Erro interno do servidor',
    })
  }
}
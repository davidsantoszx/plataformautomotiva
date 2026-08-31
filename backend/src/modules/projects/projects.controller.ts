import type { Response } from 'express'

import type { AuthenticatedRequest } from '../../middlewares/auth.middleware'

import {
  addPartToProject,
  createProject,
  getProjectById,
  listProjectParts,
  listProjectsByUser,
  removePartFromProject,
} from './projects.service'

export async function getProjects(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const projects = await listProjectsByUser(req.userId!)

    return res.json({
      projects,
    })
  } catch (error) {
    console.error(error)

    return res.status(500).json({
      message: 'Erro interno do servidor',
    })
  }
}

export async function getProject(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const id = Number(req.params.id)

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        message: 'ID do projeto inválido',
      })
    }

    const project = await getProjectById(
      id,
      req.userId!,
    )

    if (!project) {
      return res.status(404).json({
        message: 'Projeto não encontrado',
      })
    }

    return res.json({
      project,
    })
  } catch (error) {
    console.error(error)

    return res.status(500).json({
      message: 'Erro interno do servidor',
    })
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

    if (!vehicleId || !name) {
      return res.status(400).json({
        message: 'vehicleId e name são obrigatórios',
      })
    }

    if (mode !== 'REAL' && mode !== 'FREE') {
      return res.status(400).json({
        message: 'mode deve ser REAL ou FREE',
      })
    }

    const project = await createProject(
      req.userId!,
      Number(vehicleId),
      name.trim(),
      mode,
    )

    return res.status(201).json({
      message: 'Projeto criado com sucesso',
      project,
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

export async function getProjectParts(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const projectId = Number(req.params.projectId)

    if (!Number.isInteger(projectId)) {
      return res.status(400).json({
        message: 'ID do projeto inválido',
      })
    }

    const parts = await listProjectParts(
      projectId,
      req.userId!,
    )

    return res.json({
      parts,
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

export async function postProjectPart(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const projectId = Number(req.params.projectId)

    const {
      partId,
      quantity,
    } = req.body

    if (!Number.isInteger(projectId)) {
      return res.status(400).json({
        message: 'ID do projeto inválido',
      })
    }

    if (!partId) {
      return res.status(400).json({
        message: 'partId é obrigatório',
      })
    }

    const projectPart = await addPartToProject(
      projectId,
      req.userId!,
      Number(partId),
      quantity ? Number(quantity) : 1,
    )

    return res.status(201).json({
      message: 'Peça adicionada ao projeto',
      projectPart,
    })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'PROJECT_NOT_FOUND') {
        return res.status(404).json({
          message: 'Projeto não encontrado',
        })
      }

      if (error.message === 'PART_NOT_FOUND') {
        return res.status(404).json({
          message: 'Peça não encontrada',
        })
      }

      if (error.message === 'PART_NOT_COMPATIBLE') {
        return res.status(409).json({
          message:
            'Peça incompatível com o veículo no modo Projeto Real',
        })
      }
    }

    console.error(error)

    return res.status(500).json({
      message: 'Erro interno do servidor',
    })
  }
}

export async function deleteProjectPart(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const projectId = Number(req.params.projectId)
    const partId = Number(req.params.partId)

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
      message: 'Peça removida do projeto',
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
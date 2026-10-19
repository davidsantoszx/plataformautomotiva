import type { Response } from 'express'

import type {
  AuthenticatedRequest,
} from '../../middlewares/auth.middleware'

import {
  likeProject,
  listLikedProjectIds,
  unlikeProject,
} from './likes.service'

export async function putLikeController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const projectId = Number(req.params.id)

    if (!Number.isInteger(projectId)) {
      return res.status(400).json({ message: 'ID do projeto inválido' })
    }

    const result = await likeProject(projectId, req.userId!)

    return res.json(result)
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === 'PUBLIC_PROJECT_NOT_FOUND'
    ) {
      return res.status(404).json({ message: 'Projeto público não encontrado' })
    }

    console.error(error)

    return res.status(500).json({ message: 'Erro interno do servidor' })
  }
}

export async function deleteLikeController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const projectId = Number(req.params.id)

    if (!Number.isInteger(projectId)) {
      return res.status(400).json({ message: 'ID do projeto inválido' })
    }

    const result = await unlikeProject(projectId, req.userId!)

    return res.json(result)
  } catch (error) {
    console.error(error)

    return res.status(500).json({ message: 'Erro interno do servidor' })
  }
}

export async function getLikedController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const projectIds = await listLikedProjectIds(req.userId!)

    return res.json({ projectIds })
  } catch (error) {
    console.error(error)

    return res.status(500).json({ message: 'Erro interno do servidor' })
  }
}

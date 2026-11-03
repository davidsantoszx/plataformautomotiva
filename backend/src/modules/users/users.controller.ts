import type { Request, Response } from 'express'

import type { AuthenticatedRequest } from '../../middlewares/auth.middleware'
import { db } from '../../prisma/db'
import { getUserProfile } from './profile.service'

export async function getMe(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    if (!req.userId) {
      return res.status(401).json({
        message: 'Usuário não autenticado',
      })
    }

    const user = await db.orm.public.User
      .select(
        'id',
        'email',
        'username',
        'name',
        'createdAt',
        'updatedAt',
      )
      .first({
        id: req.userId,
      })

    if (!user) {
      return res.status(404).json({
        message: 'Usuário não encontrado',
      })
    }

    return res.json({
      user,
    })
  } catch (error) {
    console.error(error)

    return res.status(500).json({
      message: 'Erro interno do servidor',
    })
  }
}

// Perfil público de um usuário (sem login, como o feed)
export async function getProfile(req: Request, res: Response) {
  try {
    const username = String(req.params.username ?? '').trim()

    if (!username) {
      return res.status(400).json({
        message: 'Username inválido',
      })
    }

    const profile = await getUserProfile(username)

    if (!profile) {
      return res.status(404).json({
        message: 'Usuário não encontrado',
      })
    }

    return res.json(profile)
  } catch (error) {
    console.error(error)

    return res.status(500).json({
      message: 'Erro interno do servidor',
    })
  }
}

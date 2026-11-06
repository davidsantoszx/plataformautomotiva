import type { Request, Response } from 'express'

import type { AuthenticatedRequest } from '../../middlewares/auth.middleware'
import { db } from '../../prisma/db'
import { getPlanInfo } from '../plans/plans.service'
import { getUserProfile } from './profile.service'
import { deleteUser } from './users.service'

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
        'plan',
        'planExpiresAt',
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
      user: {
        ...user,
        ...getPlanInfo(user),
      },
    })
  } catch (error) {
    console.error(error)

    return res.status(500).json({
      message: 'Erro interno do servidor',
    })
  }
}

// Exclui a conta de quem está logado. Exige a senha no corpo da requisição.
export async function deleteMe(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    if (!req.userId) {
      return res.status(401).json({
        message: 'Usuário não autenticado',
      })
    }

    const password = String(req.body?.password ?? '')

    await deleteUser(req.userId, password)

    return res.json({
      message: 'Conta excluída com sucesso',
    })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'PASSWORD_REQUIRED') {
        return res.status(400).json({
          message: 'Informe sua senha para excluir a conta',
        })
      }

      // 403 (e não 401) para não confundir com token vencido
      if (error.message === 'INVALID_PASSWORD') {
        return res.status(403).json({
          message: 'Senha incorreta',
        })
      }

      if (error.message === 'USER_NOT_FOUND') {
        return res.status(404).json({
          message: 'Usuário não encontrado',
        })
      }
    }

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

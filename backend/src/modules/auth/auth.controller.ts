import type { Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'

import { db } from '../../prisma/db'
import { getPlanInfo } from '../plans/plans.service'
import { createUser } from '../users/users.service'
import {
  requestPasswordReset,
  resetPassword,
  verifyPasswordResetCode,
} from './passwordReset.service'

const JWT_SECRET = process.env.JWT_SECRET

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET não configurado no .env')
}

export async function register(req: Request, res: Response) {
  try {
    const { email, username, name, password } = req.body

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email e senha são obrigatórios',
      })
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: 'A senha deve possuir pelo menos 6 caracteres',
      })
    }

    const user = await createUser(
      email,
      username,
      name,
      password,
    )

    return res.status(201).json({
      message: 'Usuário criado com sucesso',
      user: {
        ...user,
        ...getPlanInfo(user),
      },
    })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'USERNAME_REQUIRED') {
        return res.status(400).json({
          message: 'Escolha um username',
        })
      }

      if (error.message === 'USERNAME_INVALID_CHARS') {
        return res.status(400).json({
          message:
            'O username só pode ter letras minúsculas, números e _',
        })
      }

      if (error.message === 'USERNAME_TOO_SHORT') {
        return res.status(400).json({
          message: 'O username precisa ter no mínimo 6 caracteres',
        })
      }

      if (error.message === 'USERNAME_TOO_LONG') {
        return res.status(400).json({
          message: 'O username pode ter no máximo 15 caracteres',
        })
      }

      if (error.message === 'EMAIL_ALREADY_EXISTS') {
        return res.status(409).json({
          message: 'Email já cadastrado',
        })
      }

      if (error.message === 'USERNAME_ALREADY_EXISTS') {
        return res.status(409).json({
          message: 'Username já cadastrado',
        })
      }
    }

    console.error(error)

    return res.status(500).json({
      message: 'Erro interno do servidor',
    })
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email e senha são obrigatórios',
      })
    }

    const user = await db.orm.public.User.first({
      email: email.trim().toLowerCase(),
    })

    if (!user) {
      return res.status(401).json({
        message: 'Email ou senha inválidos',
      })
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.password,
    )

    if (!passwordMatches) {
      return res.status(401).json({
        message: 'Email ou senha inválidos',
      })
    }

    const token = jwt.sign(
      {
        userId: user.id,
      },
      JWT_SECRET!,
      {
        expiresIn: '7d',
      },
    )

    return res.json({
      message: 'Login realizado com sucesso',
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
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

// ---- recuperação de senha ---------------------------------------------------

// Limite simples por IP (na memória do servidor): 15 pedidos a cada 15 minutos
// nas rotas de recuperação, para ninguém ficar testando códigos em sequência.
const RESET_WINDOW_MS = 15 * 60_000
const RESET_MAX_REQUESTS = 15
const resetHits = new Map<string, { count: number; startedAt: number }>()

function isRateLimited(req: Request) {
  const key = req.ip ?? 'unknown'
  const now = Date.now()
  const hit = resetHits.get(key)

  if (!hit || now - hit.startedAt > RESET_WINDOW_MS) {
    resetHits.set(key, { count: 1, startedAt: now })
    return false
  }

  hit.count += 1

  return hit.count > RESET_MAX_REQUESTS
}

function tooManyRequests(res: Response) {
  return res.status(429).json({
    message: 'Muitas tentativas. Aguarde alguns minutos e tente de novo.',
  })
}

function resetErrorResponse(error: unknown, res: Response) {
  if (error instanceof Error) {
    if (error.message === 'EMAIL_INVALID') {
      return res.status(400).json({
        message: 'Informe um e-mail válido',
      })
    }

    if (error.message === 'RESET_CODE_INVALID') {
      return res.status(400).json({
        message: 'Código inválido ou expirado',
      })
    }

    if (error.message === 'RESET_CODE_LOCKED') {
      return res.status(429).json({
        message: 'Muitas tentativas erradas. Peça um novo código.',
      })
    }

    if (error.message === 'PASSWORD_TOO_SHORT') {
      return res.status(400).json({
        message: 'A senha deve possuir pelo menos 6 caracteres',
      })
    }
  }

  console.error(error)

  return res.status(500).json({
    message: 'Erro interno do servidor',
  })
}

export async function forgotPassword(req: Request, res: Response) {
  if (isRateLimited(req)) return tooManyRequests(res)

  try {
    await requestPasswordReset(req.body?.email)

    // mesma resposta exista o e-mail ou não
    return res.json({
      message: 'Se o e-mail estiver cadastrado, enviamos um código para ele.',
    })
  } catch (error) {
    return resetErrorResponse(error, res)
  }
}

export async function verifyResetCodeController(
  req: Request,
  res: Response,
) {
  if (isRateLimited(req)) return tooManyRequests(res)

  try {
    await verifyPasswordResetCode(req.body?.email, req.body?.code)

    return res.json({ message: 'Código confirmado' })
  } catch (error) {
    return resetErrorResponse(error, res)
  }
}

export async function resetPasswordController(
  req: Request,
  res: Response,
) {
  if (isRateLimited(req)) return tooManyRequests(res)

  try {
    await resetPassword(
      req.body?.email,
      req.body?.code,
      req.body?.password,
    )

    return res.json({ message: 'Senha alterada com sucesso' })
  } catch (error) {
    return resetErrorResponse(error, res)
  }
}
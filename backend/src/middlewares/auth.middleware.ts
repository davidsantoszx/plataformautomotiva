import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET não configurado no .env')
}

export interface AuthenticatedRequest extends Request {
  userId?: number
}

export function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  const authorization = req.headers.authorization

  if (!authorization) {
    return res.status(401).json({
      message: 'Token não informado',
    })
  }

  const [scheme, token] = authorization.split(' ')

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({
      message: 'Token inválido',
    })
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET!) as jwt.JwtPayload & {
      userId?: unknown
    }

    if (typeof payload.userId !== 'number') {
      return res.status(401).json({
        message: 'Token inválido',
      })
    }

    req.userId = payload.userId

    next()
  } catch {
    return res.status(401).json({
      message: 'Token inválido ou expirado',
    })
  }
}

// Rotas públicas que mudam conforme o plano (ex.: catálogo básico x completo).
// Com token válido, preenche req.userId. Sem token, ou com token inválido,
// segue como visitante: nunca devolve 401.
export function optionalAuthMiddleware(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
) {
  const authorization = req.headers.authorization

  if (authorization) {
    const [scheme, token] = authorization.split(' ')

    if (scheme === 'Bearer' && token) {
      try {
        const payload = jwt.verify(token, JWT_SECRET!) as jwt.JwtPayload & {
          userId?: unknown
        }

        if (typeof payload.userId === 'number') {
          req.userId = payload.userId
        }
      } catch {
        // token vencido ou inválido: trata como visitante
      }
    }
  }

  next()
}

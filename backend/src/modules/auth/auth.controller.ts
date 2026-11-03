import type { Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'

import { db } from '../../prisma/db'
import { createUser } from '../users/users.service'

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
      user,
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
      },
    })
  } catch (error) {
    console.error(error)

    return res.status(500).json({
      message: 'Erro interno do servidor',
    })
  }
}

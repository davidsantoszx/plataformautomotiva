import bcrypt from 'bcrypt'

import { db } from '../../prisma/db'
import { deleteProject } from '../projects/projects.service'

// 6 a 15 caracteres: letras minúsculas, números e "_"
const USERNAME_MIN = 6
const USERNAME_MAX = 15
const USERNAME_CHARS = /^[a-z0-9_]+$/

export function normalizeUsername(value: string | undefined | null) {
  return String(value ?? '').trim().toLowerCase()
}

// O banco tem índice único em email e username. Se duas pessoas cadastrarem o
// mesmo valor ao mesmo tempo, a checagem de antes passa nas duas e o banco
// barra a segunda (código 23505): aqui isso vira o mesmo erro de "já existe".
function translateUniqueViolation(error: unknown): never {
  const code = (error as { code?: string } | null)?.code
  const text = String((error as Error | null)?.message ?? '').toLowerCase()

  if (code === '23505') {
    if (text.includes('username')) throw new Error('USERNAME_ALREADY_EXISTS')
    if (text.includes('email')) throw new Error('EMAIL_ALREADY_EXISTS')
  }

  throw error
}

export async function createUser(
  email: string,
  username: string | undefined,
  name: string | undefined,
  password: string,
) {
  const normalizedEmail = email.trim().toLowerCase()
  const normalizedUsername = normalizeUsername(username)

  if (!normalizedUsername) {
    throw new Error('USERNAME_REQUIRED')
  }

  if (!USERNAME_CHARS.test(normalizedUsername)) {
    throw new Error('USERNAME_INVALID_CHARS')
  }

  if (normalizedUsername.length < USERNAME_MIN) {
    throw new Error('USERNAME_TOO_SHORT')
  }

  if (normalizedUsername.length > USERNAME_MAX) {
    throw new Error('USERNAME_TOO_LONG')
  }

  const existingEmail = await db.orm.public.User.first({
    email: normalizedEmail,
  })

  if (existingEmail) {
    throw new Error('EMAIL_ALREADY_EXISTS')
  }

  const existingUsername = await db.orm.public.User.first({
    username: normalizedUsername,
  })

  if (existingUsername) {
    throw new Error('USERNAME_ALREADY_EXISTS')
  }

  const hashedPassword = await bcrypt.hash(password, 12)

  try {
    return await db.orm.public.User
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
      .create({
        email: normalizedEmail,
        username: normalizedUsername,
        name,
        password: hashedPassword,
      })
  } catch (error) {
    return translateUniqueViolation(error)
  }
}

// Exclui a conta e tudo que depende dela. As chaves estrangeiras do banco não
// têm ON DELETE CASCADE, então a ordem importa:
//   1. projetos do usuário (deleteProject já apaga curtidas, peças e a capa)
//   2. curtidas que o usuário deu em projetos de outras pessoas
//   3. o próprio usuário
// A senha é conferida antes de apagar qualquer coisa.
export async function deleteUser(userId: number, password: string) {
  if (!password) {
    throw new Error('PASSWORD_REQUIRED')
  }

  const user = await db.orm.public.User.first({ id: userId })

  if (!user) {
    throw new Error('USER_NOT_FOUND')
  }

  const passwordMatches = await bcrypt.compare(password, user.password)

  if (!passwordMatches) {
    throw new Error('INVALID_PASSWORD')
  }

  const projects = await db.orm.public.Project.select('id')
    .where({ userId })
    .all()

  // um por vez: cada projeto remove os próprios arquivos de capa
  for (const project of projects) {
    await deleteProject(project.id, userId)
  }

  // .delete() remove UMA linha por chamada, por isso apagamos pelo id
  const likes = await db.orm.public.ProjectLike.select('id')
    .where({ userId })
    .all()

  await Promise.all(
    likes.map((like) =>
      db.orm.public.ProjectLike.where({ id: like.id }).delete(),
    ),
  )

  return db.orm.public.User.where({ id: userId }).delete()
}

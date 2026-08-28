import bcrypt from 'bcrypt'

import { db } from '../../prisma/db'

export async function createUser(
  email: string,
  username: string | undefined,
  name: string | undefined,
  password: string,
) {
  const normalizedEmail = email.trim().toLowerCase()

  const existingEmail = await db.orm.public.User.first({
    email: normalizedEmail,
  })

  if (existingEmail) {
    throw new Error('EMAIL_ALREADY_EXISTS')
  }

  if (username) {
    const existingUsername = await db.orm.public.User.first({
      username,
    })

    if (existingUsername) {
      throw new Error('USERNAME_ALREADY_EXISTS')
    }
  }

  const hashedPassword = await bcrypt.hash(password, 12)

  return db.orm.public.User
    .select(
      'id',
      'email',
      'username',
      'name',
      'createdAt',
      'updatedAt',
    )
    .create({
      email: normalizedEmail,
      username,
      name,
      password: hashedPassword,
    })
}
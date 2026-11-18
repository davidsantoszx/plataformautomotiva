import { createHmac, randomInt, timingSafeEqual } from 'node:crypto'
import bcrypt from 'bcrypt'

import { db } from '../../prisma/db'
import { sendPasswordResetEmail } from '../mail/mail.service'

const CODE_MINUTES = 15
const MAX_ATTEMPTS = 5
const RESEND_SECONDS = 60

const SECRET = process.env.JWT_SECRET

if (!SECRET) {
  throw new Error('JWT_SECRET não configurado no .env')
}

export function normalizeEmail(email: unknown) {
  return String(email ?? '').trim().toLowerCase()
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// o código nunca é guardado puro: só o hash dele junto com o e-mail
function hashCode(email: string, code: string) {
  return createHmac('sha256', SECRET!).update(`${email}:${code}`).digest('hex')
}

function sameHash(a: string, b: string) {
  const first = Buffer.from(a)
  const second = Buffer.from(b)

  return first.length === second.length && timingSafeEqual(first, second)
}

function toTime(value: unknown) {
  const time = new Date(String(value ?? '')).getTime()

  return Number.isNaN(time) ? 0 : time
}

async function listResets(email: string) {
  return db.orm.public.PasswordReset.where({ email }).all()
}

async function clearResets(email: string) {
  const resets = await listResets(email)

  await Promise.all(
    resets.map((reset) =>
      db.orm.public.PasswordReset.where({ id: reset.id }).delete(),
    ),
  )
}

// Pede o código. A resposta é a mesma exista o e-mail ou não, para ninguém
// descobrir quem tem conta na plataforma.
export async function requestPasswordReset(rawEmail: unknown) {
  const email = normalizeEmail(rawEmail)

  if (!isValidEmail(email)) {
    throw new Error('EMAIL_INVALID')
  }

  const user = await db.orm.public.User.first({ email })

  if (!user) return

  const resets = await listResets(email)
  const latest = resets.reduce(
    (last, reset) => Math.max(last, toTime(reset.createdAt)),
    0,
  )

  // pedidos seguidos não geram outro e-mail
  if (Date.now() - latest < RESEND_SECONDS * 1000) return

  await clearResets(email)

  const code = String(randomInt(0, 1_000_000)).padStart(6, '0')

  await db.orm.public.PasswordReset.create({
    email,
    codeHash: hashCode(email, code),
    expiresAt: new Date(Date.now() + CODE_MINUTES * 60_000).toISOString(),
  })

  await sendPasswordResetEmail(email, code, CODE_MINUTES)
}

// Confere o código. Erra mais de 5 vezes e o código deixa de valer.
async function checkCode(rawEmail: unknown, rawCode: unknown) {
  const email = normalizeEmail(rawEmail)
  const code = String(rawCode ?? '').trim()

  if (!isValidEmail(email) || !/^\d{6}$/.test(code)) {
    throw new Error('RESET_CODE_INVALID')
  }

  const resets = await listResets(email)
  const reset = resets
    .filter((item) => !item.usedAt)
    .sort((a, b) => toTime(b.createdAt) - toTime(a.createdAt))[0]

  if (!reset || toTime(reset.expiresAt) < Date.now()) {
    throw new Error('RESET_CODE_INVALID')
  }

  if (reset.attempts >= MAX_ATTEMPTS) {
    throw new Error('RESET_CODE_LOCKED')
  }

  if (!sameHash(reset.codeHash, hashCode(email, code))) {
    await db.orm.public.PasswordReset.where({ id: reset.id }).update({
      attempts: reset.attempts + 1,
    })

    throw new Error('RESET_CODE_INVALID')
  }

  return { email, reset }
}

export async function verifyPasswordResetCode(
  email: unknown,
  code: unknown,
) {
  await checkCode(email, code)
}

export async function resetPassword(
  rawEmail: unknown,
  rawCode: unknown,
  password: unknown,
) {
  if (typeof password !== 'string' || password.length < 6) {
    throw new Error('PASSWORD_TOO_SHORT')
  }

  const { email } = await checkCode(rawEmail, rawCode)

  const user = await db.orm.public.User.first({ email })

  if (!user) {
    throw new Error('RESET_CODE_INVALID')
  }

  const hash = await bcrypt.hash(password, 10)

  await db.orm.public.User.where({ id: user.id }).update({
    password: hash,
  })

  // o código foi usado: apaga todos os pedidos desse e-mail
  await clearResets(email)
}
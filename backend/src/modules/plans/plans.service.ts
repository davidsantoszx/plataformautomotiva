import { db } from '../../prisma/db'

// Limite de projetos do plano Free. O Pro não tem limite.
export const FREE_PROJECT_LIMIT = 4

// Mensagens dos erros de plano. As regras (projects.service) lançam o código;
// o controller transforma em resposta 403 com esta mensagem.
export const PLAN_ERROR_MESSAGES: Record<string, string> = {
  PRO_REQUIRED: 'O projeto livre é exclusivo do plano Pro.',
  PROJECT_LIMIT_REACHED: `Você atingiu o limite de ${FREE_PROJECT_LIMIT} projetos do plano Free. Exclua um projeto ou assine o Pro para criar mais.`,
  PROJECT_LOCKED:
    'Este projeto livre está bloqueado porque o seu plano Pro não está ativo. Renove o Pro para editá-lo.',
  PREMIUM_VEHICLE: 'Este veículo é exclusivo do plano Pro.',
  PREMIUM_PART: 'Esta peça é exclusiva do plano Pro.',
}

export type PlanUser = {
  plan: string
  planExpiresAt: string | null
}

// Regra única de "esta pessoa é Pro agora?":
//  - o plano precisa ser PRO;
//  - sem data de vencimento (null) = Pro sem prazo (testes, contas internas);
//  - com data, só vale enquanto ela estiver no futuro.
export function isProActive(user: PlanUser) {
  if (user.plan !== 'PRO') return false

  if (!user.planExpiresAt) return true

  const expiresAt = new Date(user.planExpiresAt).getTime()

  return !Number.isNaN(expiresAt) && expiresAt > Date.now()
}

// Campos de plano que vão junto do usuário nas respostas da API.
// "plan" é o que está gravado; "isPro" é o que vale agora (considera o vencimento).
export function getPlanInfo(user: PlanUser) {
  const isPro = isProActive(user)

  return {
    plan: user.plan,
    planExpiresAt: user.planExpiresAt,
    isPro,
    projectLimit: isPro ? null : FREE_PROJECT_LIMIT,
  }
}

export async function getUserPlan(userId: number) {
  const user = await db.orm.public.User.select('plan', 'planExpiresAt').first({
    id: userId,
  })

  if (!user) {
    throw new Error('USER_NOT_FOUND')
  }

  return getPlanInfo(user)
}

// Para rotas públicas: visitante (sem userId) ou conta inexistente = não é Pro.
export async function isProUser(userId?: number) {
  if (!userId) return false

  const user = await db.orm.public.User.select('plan', 'planExpiresAt').first({
    id: userId,
  })

  return user ? isProActive(user) : false
}

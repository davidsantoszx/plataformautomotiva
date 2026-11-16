import { db } from '../../prisma/db'
import { isProActive } from '../plans/plans.service'
import {
  getPaymentProvider,
  type CardInput,
} from './payment.provider'

export type BillingPeriod = 'MONTHLY' | 'YEARLY'

// Mantenha igual a PRICING em frontend/src/utils/plans.js (valores em centavos)
export const PRICES_CENTS: Record<BillingPeriod, number> = {
  MONTHLY: 990,
  YEARLY: 9900,
}

const PERIOD_LABEL: Record<BillingPeriod, string> = {
  MONTHLY: 'Pro mensal',
  YEARLY: 'Pro anual',
}

// Erro com código e status HTTP próprios (o controller só repassa)
export class BillingError extends Error {
  code: string
  status: number

  constructor(code: string, message: string, status = 400) {
    super(message)
    this.code = code
    this.status = status
  }
}

// "2026-10-18 10:34:46.192495-03" -> Date
function parseDate(value: unknown) {
  const normalized = String(value)
    .replace(' ', 'T')
    .replace(/(\.\d{3})\d+/, '$1')
    .replace(/([+-]\d{2})$/, '$1:00')

  return new Date(normalized)
}

function isBillingPeriod(value: unknown): value is BillingPeriod {
  return value === 'MONTHLY' || value === 'YEARLY'
}

// Soma um mês ou um ano sem "estourar" o dia (31/01 + 1 mês = 28/02)
function addPeriod(from: Date, period: BillingPeriod) {
  const date = new Date(from)
  const day = date.getUTCDate()

  date.setUTCDate(1)

  if (period === 'MONTHLY') date.setUTCMonth(date.getUTCMonth() + 1)
  else date.setUTCFullYear(date.getUTCFullYear() + 1)

  const lastDay = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
  ).getUTCDate()

  date.setUTCDate(Math.min(day, lastDay))

  return date
}

// Validação dos dados do cartão. Vale para o provedor simulado; com um gateway
// real o cartão é tokenizado no navegador e o servidor nunca vê o número.
function validateCard(card: CardInput | undefined) {
  const invalid = (message: string) =>
    new BillingError('CARD_INVALID', message)

  if (!card) throw invalid('Informe os dados do cartão.')

  const digits = String(card.number ?? '').replace(/\D/g, '')

  if (digits.length < 13 || digits.length > 19) {
    throw invalid('Número do cartão inválido.')
  }

  // algoritmo de Luhn
  let sum = 0
  let double = false

  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let value = Number(digits[i])

    if (double) {
      value *= 2
      if (value > 9) value -= 9
    }

    sum += value
    double = !double
  }

  if (sum % 10 !== 0) throw invalid('Número do cartão inválido.')

  if (String(card.name ?? '').trim().length < 2) {
    throw invalid('Informe o nome impresso no cartão.')
  }

  const match = /^(\d{2})\/(\d{2})$/.exec(String(card.expiry ?? '').trim())

  if (!match) throw invalid('Validade inválida. Use MM/AA.')

  const month = Number(match[1])
  const year = 2000 + Number(match[2])

  if (month < 1 || month > 12) throw invalid('Validade inválida.')

  const now = new Date()
  const expired =
    year < now.getUTCFullYear() ||
    (year === now.getUTCFullYear() && month < now.getUTCMonth() + 1)

  if (expired) throw invalid('Cartão vencido.')

  if (!/^\d{3,4}$/.test(String(card.cvc ?? '').trim())) {
    throw invalid('Código de segurança inválido.')
  }
}

async function getLatestSubscription(userId: number) {
  const subscriptions = await db.orm.public.Subscription.select(
    'id',
    'userId',
    'period',
    'status',
    'provider',
    'providerRef',
    'amountCents',
    'currentPeriodStart',
    'currentPeriodEnd',
    'canceledAt',
  )
    .where({ userId })
    .all()

  if (subscriptions.length === 0) return null

  return subscriptions.reduce((latest, item) =>
    item.id > latest.id ? item : latest,
  )
}

async function setUserPlan(userId: number, expiresAt: Date) {
  await db.orm.public.User.where({ id: userId }).update({
    plan: 'PRO',
    planExpiresAt: expiresAt.toISOString(),
  })
}

// Cobra os períodos que já venceram (renovação) ou encerra os cancelados.
// Roda de tempos em tempos (server.ts) e também ao consultar a assinatura,
// então o resultado vale mesmo que o servidor tenha ficado desligado.
async function processUserSubscription(userId: number) {
  let subscription = await getLatestSubscription(userId)

  if (!subscription) return

  const provider = getPaymentProvider()

  for (let guard = 0; guard < 24; guard += 1) {
    if (!subscription) return

    const end = parseDate(subscription.currentPeriodEnd)

    if (
      subscription.status === 'EXPIRED' ||
      Number.isNaN(end.getTime()) ||
      end.getTime() > Date.now()
    ) {
      return
    }

    // venceu e foi cancelada: acabou o acesso (o plano continua "PRO" com
    // data vencida, que é o estado "Seu Pro venceu")
    if (subscription.status === 'CANCELED') {
      await db.orm.public.Subscription.where({
        id: subscription.id,
      }).update({ status: 'EXPIRED' })

      return
    }

    // venceu e segue ativa: renova
    const charge = await provider.charge({
      userId,
      amountCents: subscription.amountCents,
      description: PERIOD_LABEL[subscription.period as BillingPeriod],
    })

    if (!charge.ok) {
      await db.orm.public.Subscription.where({
        id: subscription.id,
      }).update({ status: 'EXPIRED' })

      return
    }

    const nextEnd = addPeriod(end, subscription.period as BillingPeriod)

    const updated = await db.orm.public.Subscription.where({
      id: subscription.id,
    }).update({
      currentPeriodStart: end.toISOString(),
      currentPeriodEnd: nextEnd.toISOString(),
      providerRef: charge.reference,
    })

    await setUserPlan(userId, nextEnd)

    subscription = updated ?? null
  }
}

// Chamada periódica do servidor
export async function processDueSubscriptions() {
  const [active, canceled] = await Promise.all([
    db.orm.public.Subscription.select('userId')
      .where({ status: 'ACTIVE' })
      .all(),
    db.orm.public.Subscription.select('userId')
      .where({ status: 'CANCELED' })
      .all(),
  ])

  const userIds = new Set([...active, ...canceled].map((item) => item.userId))

  for (const userId of userIds) {
    await processUserSubscription(userId)
  }
}

// Situação da assinatura para a tela de planos.
//   NONE      nunca assinou
//   ACTIVE    paga e renovando
//   CANCELED  cancelada, mas com acesso até o fim do período
//   EXPIRED   venceu
//   MANUAL    Pro dado direto no banco (sem assinatura)
export async function getSubscriptionState(userId: number) {
  await processUserSubscription(userId)

  const user = await db.orm.public.User.select(
    'plan',
    'planExpiresAt',
  ).first({ id: userId })

  if (!user) throw new BillingError('USER_NOT_FOUND', 'Usuário não encontrado', 404)

  const subscription = await getLatestSubscription(userId)
  const isPro = isProActive(user)

  let state: 'NONE' | 'ACTIVE' | 'CANCELED' | 'EXPIRED' | 'MANUAL' = 'NONE'

  if (subscription) {
    const end = parseDate(subscription.currentPeriodEnd).getTime()
    const valid = !Number.isNaN(end) && end > Date.now()

    if (subscription.status === 'ACTIVE' && valid) state = 'ACTIVE'
    else if (subscription.status === 'CANCELED' && valid) state = 'CANCELED'
    else state = 'EXPIRED'
  } else if (isPro) {
    state = 'MANUAL'
  } else if (user.plan === 'PRO') {
    state = 'EXPIRED'
  }

  return {
    state,
    period: subscription?.period ?? null,
    amountCents: subscription?.amountCents ?? null,
    currentPeriodEnd: subscription?.currentPeriodEnd ?? user.planExpiresAt,
    canceledAt: subscription?.canceledAt ?? null,
  }
}

export async function subscribe(
  userId: number,
  period: unknown,
  card: CardInput | undefined,
) {
  if (!isBillingPeriod(period)) {
    throw new BillingError('INVALID_PERIOD', 'Escolha mensal ou anual.')
  }

  const current = await getSubscriptionState(userId)

  if (current.state === 'ACTIVE' || current.state === 'CANCELED') {
    throw new BillingError(
      'ALREADY_SUBSCRIBED',
      current.state === 'CANCELED'
        ? 'Sua assinatura está cancelada, mas ainda vale. Reative-a na página de planos.'
        : 'Você já tem uma assinatura ativa.',
    )
  }

  validateCard(card)

  const amountCents = PRICES_CENTS[period]
  const provider = getPaymentProvider()

  const charge = await provider.charge({
    userId,
    amountCents,
    description: PERIOD_LABEL[period],
    card,
  })

  if (!charge.ok) {
    throw new BillingError(
      'PAYMENT_DECLINED',
      'Pagamento recusado. Tente outro cartão.',
      402,
    )
  }

  const start = new Date()
  const end = addPeriod(start, period)

  await db.orm.public.Subscription.create({
    userId,
    period,
    status: 'ACTIVE',
    provider: provider.name,
    providerRef: charge.reference,
    amountCents,
    currentPeriodStart: start.toISOString(),
    currentPeriodEnd: end.toISOString(),
  })

  await setUserPlan(userId, end)

  return getSubscriptionState(userId)
}

// Cancela a renovação. O Pro continua até o fim do período já pago.
export async function cancelSubscription(userId: number) {
  const state = await getSubscriptionState(userId)
  const subscription = await getLatestSubscription(userId)

  if (state.state !== 'ACTIVE' || !subscription) {
    throw new BillingError(
      'NO_ACTIVE_SUBSCRIPTION',
      'Não há assinatura ativa para cancelar.',
    )
  }

  await getPaymentProvider().cancel(subscription.providerRef ?? null)

  await db.orm.public.Subscription.where({ id: subscription.id }).update({
    status: 'CANCELED',
    canceledAt: new Date().toISOString(),
  })

  return getSubscriptionState(userId)
}

// Desfaz o cancelamento enquanto o período pago ainda não acabou.
export async function reactivateSubscription(userId: number) {
  const state = await getSubscriptionState(userId)
  const subscription = await getLatestSubscription(userId)

  if (state.state !== 'CANCELED' || !subscription) {
    throw new BillingError(
      'NOTHING_TO_REACTIVATE',
      'Não há assinatura cancelada para reativar.',
    )
  }

  await db.orm.public.Subscription.where({ id: subscription.id }).update({
    status: 'ACTIVE',
    canceledAt: null,
  })

  return getSubscriptionState(userId)
}

// Usada ao excluir a conta: cancela no provedor e apaga o histórico
// (a chave estrangeira não tem ON DELETE CASCADE).
export async function deleteUserSubscriptions(userId: number) {
  const subscriptions = await db.orm.public.Subscription.select(
    'id',
    'status',
    'providerRef',
  )
    .where({ userId })
    .all()

  const provider = getPaymentProvider()

  for (const subscription of subscriptions) {
    if (subscription.status === 'ACTIVE') {
      await provider.cancel(subscription.providerRef ?? null)
    }

    // .delete() remove UMA linha por chamada
    await db.orm.public.Subscription.where({ id: subscription.id }).delete()
  }
}
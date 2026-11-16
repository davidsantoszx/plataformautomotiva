import type { Response } from 'express'

import type { AuthenticatedRequest } from '../../middlewares/auth.middleware'
import {
  BillingError,
  cancelSubscription,
  getSubscriptionState,
  reactivateSubscription,
  subscribe,
} from './subscriptions.service'

function handleError(error: unknown, res: Response) {
  if (error instanceof BillingError) {
    return res.status(error.status).json({
      message: error.message,
      code: error.code,
    })
  }

  console.error(error)

  return res.status(500).json({
    message: 'Erro interno do servidor',
  })
}

// GET /subscription
export async function getSubscriptionController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const subscription = await getSubscriptionState(req.userId!)

    return res.json({ subscription })
  } catch (error) {
    return handleError(error, res)
  }
}

// POST /subscription  { period: 'MONTHLY' | 'YEARLY', card: {...} }
export async function postSubscribeController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const { period, card } = req.body ?? {}

    const subscription = await subscribe(req.userId!, period, card)

    return res.status(201).json({
      message: 'Assinatura ativada',
      subscription,
    })
  } catch (error) {
    return handleError(error, res)
  }
}

// POST /subscription/cancel
export async function postCancelController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const subscription = await cancelSubscription(req.userId!)

    return res.json({
      message: 'Assinatura cancelada',
      subscription,
    })
  } catch (error) {
    return handleError(error, res)
  }
}

// POST /subscription/reactivate
export async function postReactivateController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const subscription = await reactivateSubscription(req.userId!)

    return res.json({
      message: 'Assinatura reativada',
      subscription,
    })
  } catch (error) {
    return handleError(error, res)
  }
}
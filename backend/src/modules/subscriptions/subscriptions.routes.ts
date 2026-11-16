import { Router } from 'express'

import { authMiddleware } from '../../middlewares/auth.middleware'
import {
  getSubscriptionController,
  postCancelController,
  postReactivateController,
  postSubscribeController,
} from './subscriptions.controller'

const router = Router()

router.use(authMiddleware)

router.get('/', getSubscriptionController)
router.post('/', postSubscribeController)
router.post('/cancel', postCancelController)
router.post('/reactivate', postReactivateController)

export default router
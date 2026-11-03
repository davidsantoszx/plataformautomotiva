import { Router } from 'express'

import { authMiddleware } from '../../middlewares/auth.middleware'
import { getMe, getProfile } from './users.controller'

const router = Router()

router.get('/me', authMiddleware, getMe)
router.get('/:username/profile', getProfile)

export default router

import { Router } from 'express'

import { authMiddleware } from '../../middlewares/auth.middleware'
import { deleteMe, getMe, getProfile } from './users.controller'

const router = Router()

router.get('/me', authMiddleware, getMe)
router.delete('/me', authMiddleware, deleteMe)
router.get('/:username/profile', getProfile)

export default router

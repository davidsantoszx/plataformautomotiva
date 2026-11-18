import { Router } from 'express'

import {
  forgotPassword,
  login,
  register,
  resetPasswordController,
  verifyResetCodeController,
} from './auth.controller'

const router = Router()

router.post('/register', register)
router.post('/login', login)

// recuperação de senha: e-mail -> código -> nova senha
router.post('/password/forgot', forgotPassword)
router.post('/password/verify', verifyResetCodeController)
router.post('/password/reset', resetPasswordController)

export default router
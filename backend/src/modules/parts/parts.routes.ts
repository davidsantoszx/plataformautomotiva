import { Router } from 'express'

import {
  getCategories,
  getCategory,
  postCategory,
  getPartsByCategory,
  getPart,
  postPart,
} from './parts.controller'

const router = Router()

router.get('/categories', getCategories)

router.get('/categories/:id', getCategory)

router.post('/categories', postCategory)

router.get(
  '/categories/:categoryId/parts',
  getPartsByCategory,
)

router.get('/parts/:id', getPart)

router.post('/parts', postPart)

export default router
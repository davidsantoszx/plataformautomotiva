import { Router } from 'express'

import {
  getCategories,
  getCategory,
  postCategory,
  getPartsByCategory,
  getPart,
  postPart,
  getCompatibilitiesByVehicle,
  getCompatibilitiesByPart,
  postCompatibility,
  patchCompatibility,
  deleteCompatibility,
} from './parts.controller'

const router = Router()

router.get('/categories', getCategories)

router.get('/categories/:id', getCategory)

router.post('/categories', postCategory)

router.get(
  '/categories/:categoryId/parts',
  getPartsByCategory,
)

// Compatibilidades
router.get(
  '/vehicles/:vehicleId/compatibilities',
  getCompatibilitiesByVehicle,
)

router.get(
  '/parts/:partId/compatibilities',
  getCompatibilitiesByPart,
)

router.post(
  '/compatibilities',
  postCompatibility,
)

router.patch(
  '/compatibilities/:id',
  patchCompatibility,
)

router.delete(
  '/compatibilities/:id',
  deleteCompatibility,
)

// Peças
router.get('/parts/:id', getPart)

router.post('/parts', postPart)

export default router
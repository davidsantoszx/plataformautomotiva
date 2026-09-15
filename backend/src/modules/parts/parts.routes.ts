import { Router } from 'express'

import {
  getCategories,
  getCategory,
  postCategory,
  patchCategory,
  deleteCategoryController,
  getPartsByCategory,
  getPart,
  postPart,
  patchPart,
  deletePartController,
  getCompatibilitiesByVehicle,
  getCompatibilitiesByPart,
  postCompatibility,
  patchCompatibility,
  deleteCompatibility,
} from './parts.controller'

import { authMiddleware } from '../../middlewares/auth.middleware'

const router = Router()

// Consultas públicas
router.get(
  '/categories',
  getCategories,
)

router.get(
  '/categories/:id',
  getCategory,
)

router.get(
  '/categories/:categoryId/parts',
  getPartsByCategory,
)

router.get(
  '/parts/:id',
  getPart,
)

router.get(
  '/vehicles/:vehicleId/compatibilities',
  getCompatibilitiesByVehicle,
)

router.get(
  '/parts/:partId/compatibilities',
  getCompatibilitiesByPart,
)

// Administração de categorias
router.post(
  '/categories',
  authMiddleware,
  postCategory,
)

router.patch(
  '/categories/:id',
  authMiddleware,
  patchCategory,
)

router.delete(
  '/categories/:id',
  authMiddleware,
  deleteCategoryController,
)

// Administração de peças
router.post(
  '/parts',
  authMiddleware,
  postPart,
)

router.patch(
  '/parts/:id',
  authMiddleware,
  patchPart,
)

router.delete(
  '/parts/:id',
  authMiddleware,
  deletePartController,
)

// Administração de compatibilidades
router.post(
  '/compatibilities',
  authMiddleware,
  postCompatibility,
)

router.patch(
  '/compatibilities/:id',
  authMiddleware,
  patchCompatibility,
)

router.delete(
  '/compatibilities/:id',
  authMiddleware,
  deleteCompatibility,
)

export default router
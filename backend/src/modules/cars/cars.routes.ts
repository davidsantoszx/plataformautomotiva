import { Router } from 'express'

import { optionalAuthMiddleware } from '../../middlewares/auth.middleware'

import {
  getBrand,
  getBrands,
  postBrand,
  getModelsByBrand,
  getModel,
  postModel,
  getGenerationsByModel,
  getGeneration,
  postGeneration,
  getVehiclesByGeneration,
  getVehicle,
  postVehicle,
} from './cars.controller'

const router = Router()

// As listas do catálogo mudam conforme o plano: com token de quem é Pro vem
// o catálogo completo, sem token (ou no Free) vem só o básico.
router.get('/brands', optionalAuthMiddleware, getBrands)

router.get('/brands/:id', getBrand)

router.post('/brands', postBrand)

router.get(
  '/brands/:brandId/models',
  optionalAuthMiddleware,
  getModelsByBrand,
)

router.get('/models/:id', getModel)

router.post('/models', postModel)

router.get(
  '/models/:modelId/generations',
  optionalAuthMiddleware,
  getGenerationsByModel,
)

router.get('/generations/:id', getGeneration)

router.post('/generations', postGeneration)

router.get(
  '/generations/:generationId/vehicles',
  optionalAuthMiddleware,
  getVehiclesByGeneration,
)

router.get('/vehicles/:id', getVehicle)

router.post('/vehicles', postVehicle)

export default router

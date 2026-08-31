import { Router } from 'express'

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

router.get('/brands', getBrands)

router.get('/brands/:id', getBrand)

router.post('/brands', postBrand)

router.get(
  '/brands/:brandId/models',
  getModelsByBrand,
)

router.get('/models/:id', getModel)

router.post('/models', postModel)

router.get(
  '/models/:modelId/generations',
  getGenerationsByModel,
)

router.get('/generations/:id', getGeneration)

router.post('/generations', postGeneration)

router.get(
  '/generations/:generationId/vehicles',
  getVehiclesByGeneration,
)

router.get('/vehicles/:id', getVehicle)

router.post('/vehicles', postVehicle)

export default router
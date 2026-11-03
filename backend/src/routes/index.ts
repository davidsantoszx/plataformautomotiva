import { Router } from 'express'
import authRoutes from '../modules/auth/auth.routes'
import partsRoutes from '../modules/parts/parts.routes'
import carsRoutes from '../modules/cars/cars.routes'
import projectsRoutes from '../modules/projects/projects.routes'
import usersRoutes from '../modules/users/users.routes'

const router = Router()

router.use('/auth', authRoutes)
router.use('/parts', partsRoutes)
router.use('/cars', carsRoutes)
router.use('/projects', projectsRoutes)
router.use('/users', usersRoutes)

export default router
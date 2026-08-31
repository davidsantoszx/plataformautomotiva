import { Router } from 'express'

import { authMiddleware } from '../../middlewares/auth.middleware'

import {
  deleteProjectPart,
  getProject,
  getProjectParts,
  getProjects,
  postProject,
  postProjectPart,
} from './projects.controller'

const router = Router()

router.use(authMiddleware)

router.get('/', getProjects)

router.get('/:id', getProject)

router.post('/', postProject)

router.get(
  '/:projectId/parts',
  getProjectParts,
)

router.post(
  '/:projectId/parts',
  postProjectPart,
)

router.delete(
  '/:projectId/parts/:partId',
  deleteProjectPart,
)

export default router
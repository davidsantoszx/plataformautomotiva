import { Router } from 'express'

import { authMiddleware } from '../../middlewares/auth.middleware'

import {
  deleteProjectController,
  deleteProjectPart,
  duplicateProjectController,
  getProject,
  getProjectParts,
  getProjects,
  getPublicProjectController,
  patchProject,
  patchProjectPart,
  patchProjectPublication,
  postProject,
  postProjectPart,
} from './projects.controller'

const router = Router()

// =========================
// PROJETO PÚBLICO
// =========================

router.get(
  '/share/:shareToken',
  getPublicProjectController,
)

// =========================
// PROJETOS AUTENTICADOS
// =========================

router.use(authMiddleware)

router.get(
  '/',
  getProjects,
)

router.get(
  '/:id',
  getProject,
)

router.post(
  '/',
  postProject,
)

router.patch(
  '/:id',
  patchProject,
)

router.delete(
  '/:id',
  deleteProjectController,
)

router.post(
  '/:id/duplicate',
  duplicateProjectController,
)

router.patch(
  '/:id/publication',
  patchProjectPublication,
)

router.get(
  '/:projectId/parts',
  getProjectParts,
)

router.post(
  '/:projectId/parts',
  postProjectPart,
)

router.patch(
  '/:projectId/parts/:partId',
  patchProjectPart,
)

router.delete(
  '/:projectId/parts/:partId',
  deleteProjectPart,
)

export default router
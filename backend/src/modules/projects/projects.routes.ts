import { Router } from 'express'

import { authMiddleware } from '../../middlewares/auth.middleware'

import {
  deleteProjectController,
  deleteProjectPart,
  duplicateProjectController,
  getFeedController,
  getProject,
  getProjectParts,
  getProjects,
  getPublicProjectController,
  patchProject,
  patchProjectPart,
  patchProjectPublication,
  postProject,
  postProjectPart,
  putProjectCoverController,
} from './projects.controller'

import {
  deleteLikeController,
  getLikedController,
  putLikeController,
} from './likes.controller'

const router = Router()

// =========================
// PROJETO PÚBLICO
// =========================

router.get('/feed', getFeedController)

router.get(
  '/share/:shareToken',
  getPublicProjectController,
)


// =========================
// PROJETOS AUTENTICADOS
// =========================

router.use(authMiddleware)

// precisa vir antes de GET /:id, senão "liked" seria lido como um id
router.get('/liked', getLikedController)

router.put('/:id/like', putLikeController)
router.delete('/:id/like', deleteLikeController)

router.put('/:id/cover', putProjectCoverController)

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

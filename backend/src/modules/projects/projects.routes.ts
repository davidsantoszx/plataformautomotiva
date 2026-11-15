import { Router } from 'express'

import { authMiddleware } from '../../middlewares/auth.middleware'

import {
  deleteProjectController,
  deleteProjectPart,
  duplicateProjectController,
  getCompareController,
  getFeedController,
  getProject,
  getProjectParts,
  getProjectStatsController,
  getProjects,
  getPublicProjectController,
  patchProject,
  patchProjectFeatured,
  patchProjectLink,
  patchProjectPart,
  patchProjectPaint,
  patchProjectPublication,
  postProject,
  postProjectViewController,
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

// conta uma visualização (a página pública avisa uma vez por sessão)
router.post(
  '/share/:shareToken/view',
  postProjectViewController,
)


// =========================
// PROJETOS AUTENTICADOS
// =========================

router.use(authMiddleware)

// precisa vir antes de GET /:id, senão "liked" seria lido como um id
router.get('/liked', getLikedController)

// também antes de GET /:id
router.get('/compare', getCompareController)

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

// números do projeto (recurso Pro)
router.get(
  '/:id/stats',
  getProjectStatsController,
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

// projeto em destaque no perfil (recurso Pro)
router.patch(
  '/:id/featured',
  patchProjectFeatured,
)

// compartilhar só com link (recurso Pro)
router.patch(
  '/:id/link',
  patchProjectLink,
)

router.patch(
  '/:id/paint',
  patchProjectPaint,
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

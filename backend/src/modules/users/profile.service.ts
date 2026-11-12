import { db } from '../../prisma/db'
import { isProActive } from '../plans/plans.service'
import { getVehicleSummary } from '../projects/projects.service'

function toTime(value: unknown) {
  const time = new Date(String(value ?? '')).getTime()
  return Number.isNaN(time) ? 0 : time
}

// Procura primeiro pelo username exato; se não achar, tenta em minúsculas
// (quem digita a URL na mão pode usar maiúsculas).
async function findUserByUsername(username: string) {
  const select = [
    'id',
    'username',
    'name',
    'plan',
    'planExpiresAt',
    'createdAt',
  ] as const

  const exact = await db.orm.public.User
    .select(...select)
    .first({ username })

  if (exact) return exact

  const lower = username.toLowerCase()
  if (lower === username) return null

  return db.orm.public.User
    .select(...select)
    .first({ username: lower })
}

// Perfil público: dados do usuário, estatísticas e só os projetos publicados.
// O selo PRO e o projeto em destaque só valem enquanto o Pro estiver ativo.
export async function getUserProfile(username: string) {
  const user = await findUserByUsername(username)

  if (!user) return null

  const isPro = isProActive(user)

  const projects = await db.orm.public.Project
    .select(
      'id',
      'vehicleId',
      'name',
      'description',
      'coverUrl',
      'mode',
      'isPublic',
      'shareToken',
      'featuredAt',
      'publishedAt',
      'createdAt',
    )
    .where({ userId: user.id })
    .all()

  const isFeatured = (project: { featuredAt?: unknown }) =>
    isPro && Boolean(project.featuredAt)

  // o projeto em destaque vem primeiro; o resto, do mais novo para o mais antigo
  const published = projects
    .filter((project) => project.isPublic && project.shareToken)
    .sort((a, b) => {
      if (isFeatured(a) !== isFeatured(b)) return isFeatured(a) ? -1 : 1

      return (
        toTime(b.publishedAt ?? b.createdAt) -
        toTime(a.publishedAt ?? a.createdAt)
      )
    })

  const summaries = new Map()

  await Promise.all(
    published.map(async (project) => {
      const summary = await getVehicleSummary(project.vehicleId)
      summaries.set(project.vehicleId, summary)
    })
  )

  const items = await Promise.all(
    published.map(async (project) => {
      const [projectParts, likes] = await Promise.all([
        db.orm.public.ProjectPart
          .select('quantity', 'priceAtTime')
          .where({ projectId: project.id })
          .all(),
        db.orm.public.ProjectLike
          .select('id')
          .where({ projectId: project.id })
          .all(),
      ])

      const total = projectParts.reduce(
        (sum, item) => sum + item.priceAtTime * item.quantity,
        0,
      )

      return {
        id: project.id,
        name: project.name,
        description: project.description,
        coverUrl: project.coverUrl,
        mode: project.mode,
        shareToken: project.shareToken,
        publishedAt: project.publishedAt ?? project.createdAt,
        isFeatured: isFeatured(project),
        vehicle: summaries.get(project.vehicleId) ?? null,
        partsCount: projectParts.length,
        likesCount: likes.length,
        total,
      }
    }),
  )

  const likesCount = items.reduce((sum, item) => sum + item.likesCount, 0)

  return {
    user: {
      username: user.username,
      name: user.name,
      isPro,
      createdAt: user.createdAt,
    },
    stats: {
      projectsCount: items.length,
      likesCount,
    },
    projects: items,
  }
}

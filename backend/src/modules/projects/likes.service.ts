import { db } from "../../prisma/db";

async function countLikes(projectId: number) {
  const likes = await db.orm.public.ProjectLike.select("id")
    .where({ projectId })
    .all();

  return likes.length;
}

// Curtir: só projetos públicos. É idempotente (curtir duas vezes não duplica).
export async function likeProject(projectId: number, userId: number) {
  const project = await db.orm.public.Project.select("id", "isPublic").first({
    id: projectId,
  });

  if (!project || !project.isPublic) {
    throw new Error("PUBLIC_PROJECT_NOT_FOUND");
  }

  const existing = await db.orm.public.ProjectLike.first({
    projectId,
    userId,
  });

  if (!existing) {
    await db.orm.public.ProjectLike.create({ projectId, userId });
  }

  return { liked: true, likesCount: await countLikes(projectId) };
}

// Descurtir funciona mesmo se o projeto foi despublicado depois.
export async function unlikeProject(projectId: number, userId: number) {
  const existing = await db.orm.public.ProjectLike.first({
    projectId,
    userId,
  });

  if (existing) {
    await db.orm.public.ProjectLike.where({ id: existing.id }).delete();
  }

  return { liked: false, likesCount: await countLikes(projectId) };
}

// IDs de todos os projetos que o usuário já curtiu (o feed usa para pintar o coração).
export async function listLikedProjectIds(userId: number) {
  const likes = await db.orm.public.ProjectLike.select("projectId")
    .where({ userId })
    .all();

  return likes.map((like) => like.projectId);
}

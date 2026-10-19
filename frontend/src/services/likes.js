import { API_URL } from "./api";

async function request(token, path, method) {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Erro ao processar a curtida");
  }

  return data;
}

// -> { projectIds: number[] }
export async function getLikedProjectIds(token) {
  const data = await request(token, "/projects/liked", "GET");
  return data.projectIds || [];
}

// -> { liked: true, likesCount }
export function likeProject(token, projectId) {
  return request(token, `/projects/${projectId}/like`, "PUT");
}

// -> { liked: false, likesCount }
export function unlikeProject(token, projectId) {
  return request(token, `/projects/${projectId}/like`, "DELETE");
}

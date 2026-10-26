import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ProjectList from "../components/ProjectList";
import { useAuth } from "../context/AuthContext";
import { getProjects } from "../services/api";


export default function ProjectsPage() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  

  // carga inicial mostra o loading; recarga após duplicar/excluir é silenciosa
  const loadProjects = useCallback(
    async ({ silent = false } = {}) => {
      try {
        if (!silent) setLoading(true);
        setError("");

        const data = await getProjects(token);
        setProjects(data.projects || []);
      } catch (err) {
        setError(err.message || "Não foi possível carregar seus projetos.");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [token],
  );

  const refreshProjects = useCallback(
    () => loadProjects({ silent: true }),
    [loadProjects],
  );

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  return (
    <ProjectList
      projects={projects}
      loading={loading}
      error={error}
      onOpen={(id) => navigate(`/projetos/${id}`)}
      onCreate={() => navigate("/projetos/novo")}
      onRefresh={refreshProjects}
    />
  );
}

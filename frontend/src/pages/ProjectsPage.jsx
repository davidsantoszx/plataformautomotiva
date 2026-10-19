import { useEffect, useState } from "react";
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

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");
        const data = await getProjects(token);
        setProjects(data.projects || []);
      } catch (err) {
        setError(err.message || "Não foi possível carregar seus projetos.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [token]);

  return (
    <ProjectList
      projects={projects}
      loading={loading}
      error={error}
      onOpen={(id) => navigate(`/projetos/${id}`)}
      onCreate={() => navigate("/projetos/novo")}
    />
  );
}
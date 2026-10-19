import {
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";


import { useAuth } from "./context/AuthContext";
import ProtectedLayout from "./components/ProtectedLayout";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import PublicProjectPage from "./pages/PublicProjectPage";
import ProjectsPage from "./pages/ProjectsPage";
import NewProjectPage from "./pages/NewProjectPage";
import ProjectPage from "./pages/ProjectPage";
import ConfiguratorPage from "./pages/ConfiguratorPage";
import FeedPage from "./pages/FeedPage";

function LandingRoute() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  // compatibilidade com links antigos: /?share=TOKEN
  const share = params.get("share");
  if (share) return <Navigate to={`/p/${share}`} replace />;

  if (token) return <Navigate to="/projetos" replace />;

  return <LandingPage onEnter={() => navigate("/login")} />;
}

function PublicProjectRoute() {
  const { shareToken } = useParams();
  return <PublicProjectPage shareToken={shareToken} />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingRoute />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/p/:shareToken" element={<PublicProjectRoute />} />

      <Route element={<ProtectedLayout />}>
        <Route path="/projetos" element={<ProjectsPage />} />
        <Route path="/projetos/novo" element={<NewProjectPage />} />
        <Route path="/projetos/:id" element={<ProjectPage />} />
        <Route path="/projetos/:id/configurar" element={<ConfiguratorPage />} />
        <Route path="/feed" element={<FeedPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
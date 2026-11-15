import {
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";

import { useAuth } from "./context/AuthContext";
import { useLoading } from "./context/LoadingContext";
import { ToastProvider } from "./context/ToastContext";
import ProtectedLayout from "./components/ProtectedLayout";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import PublicProjectPage from "./pages/PublicProjectPage";
import ProjectsPage from "./pages/ProjectsPage";
import NewProjectPage from "./pages/NewProjectPage";
import ProjectPage from "./pages/ProjectPage";
import ConfiguratorPage from "./pages/ConfiguratorPage";
import FeedPage from "./pages/FeedPage";
import ProfilePage from "./pages/ProfilePage";
import PlansPage from "./pages/PlansPage";
import ComparePage from "./pages/ComparePage";

function LandingRoute() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { withLoading } = useLoading();
  const [params] = useSearchParams();

  // compatibilidade com links antigos: /?share=TOKEN
  const share = params.get("share");
  if (share) return <Navigate to={`/p/${share}`} replace />;

  if (token) return <Navigate to="/projetos" replace />;

  return (
    <LandingPage onEnter={() => withLoading(() => navigate("/login"))} />
  );
}

function PublicProjectRoute() {
  const { shareToken } = useParams();
  return <PublicProjectPage shareToken={shareToken} />;
}

// /perfil leva para o perfil de quem está logado
function OwnProfileRoute() {
  const { user } = useAuth();

  if (user?.username) {
    return <Navigate to={`/perfil/${user.username}`} replace />;
  }

  return <Navigate to="/projetos" replace />;
}

export default function App() {
  return (
    <ToastProvider>
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
          <Route path="/perfil" element={<OwnProfileRoute />} />
          <Route path="/perfil/:username" element={<ProfilePage />} />
          <Route path="/planos" element={<PlansPage />} />
          <Route path="/comparar" element={<ComparePage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ToastProvider>
  );
}

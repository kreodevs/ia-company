import { Navigate, Route, Routes, useParams } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import {
  RequireSuperAdmin,
  RequireTenantAccess,
  SetupGate,
} from "./components/SetupGate";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { useDocumentLang } from "./hooks/useDocumentLang";
import HelpPage from "./pages/HelpPage";
import OfficePage from "./pages/OfficePage";
import OfficeEncargosPage from "./pages/OfficeEncargosPage";
import OfficeEncargoDetailPage from "./pages/OfficeEncargoDetailPage";
import OpsPage from "./pages/OpsPage";
import ProductsPage from "./pages/ProductsPage";
import SkillsPage from "./pages/SkillsPage";
import ConsensusPage from "./pages/ConsensusPage";
import DecisionsPage from "./pages/DecisionsPage";
import ProductCodePage from "./pages/ProductCodePage";
import ProductSettingsPage from "./pages/ProductSettingsPage";
import ProductConsensusPage from "./pages/ProductConsensusPage";
import ProductTeamPage from "./pages/ProductTeamPage";
import WarRoomPage from "./pages/WarRoomPage";
import TenantInterestsPage from "./pages/TenantInterestsPage";
import SettingsPage from "./pages/SettingsPage";
import PlatformSettingsPage from "./pages/PlatformSettingsPage";
import PlatformTemplatesPage from "./pages/PlatformTemplatesPage";
import PlatformWorkflowTemplatesPage from "./pages/PlatformWorkflowTemplatesPage";
import PlatformWorkflowEditorPage from "./pages/PlatformWorkflowEditorPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import AgentsPage from "./pages/AgentsPage";
import LoginPage from "./pages/LoginPage";
import RunDetailPage from "./pages/RunDetailPage";
import RunsPage from "./pages/RunsPage";
import SetupSuperAdminPage from "./pages/SetupSuperAdminPage";
import SuperAdminDashboardPage from "./pages/SuperAdminDashboardPage";
import TenantUsersPage from "./pages/TenantUsersPage";
import WorkflowEditorPage from "./pages/WorkflowEditorPage";
import WorkflowsPage from "./pages/WorkflowsPage";
import { Toaster } from "./components/molecules/Sonner";
import { defaultHelpSlug } from "./content/help";

function RedirectProductConsensus() {
  const { productId } = useParams<{ productId: string }>();
  if (!productId) return <Navigate to="/debug/consensus" replace />;
  return <Navigate to={`/debug/products/${productId}/consensus`} replace />;
}

function AppShell() {
  useDocumentLang();

  return (
    <AppLayout>
      <main id="main-content" className="page-shell">
        <Routes>
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          <Route element={<SetupGate />}>
            <Route path="setup" element={<SetupSuperAdminPage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="help" element={<Navigate to={`/help/${defaultHelpSlug}`} replace />} />
            <Route path="help/:slug" element={<HelpPage />} />

            <Route element={<RequireSuperAdmin />}>
              <Route path="admin" element={<SuperAdminDashboardPage />} />
              <Route path="admin/settings" element={<PlatformSettingsPage />} />
              <Route path="admin/templates/workflows/:id" element={<PlatformWorkflowEditorPage />} />
              <Route path="admin/templates/workflows" element={<PlatformWorkflowTemplatesPage />} />
              <Route path="admin/templates" element={<PlatformTemplatesPage />} />
            </Route>

            <Route element={<RequireTenantAccess />}>
              <Route index element={<OfficePage />} />
              <Route path="office" element={<OfficePage />} />
              <Route path="office/encargos" element={<OfficeEncargosPage />} />
              <Route path="office/encargos/:runId" element={<OfficeEncargoDetailPage />} />
              <Route path="agents" element={<AgentsPage />} />
              <Route path="skills" element={<SkillsPage />} />
              <Route path="workflows" element={<WorkflowsPage />} />
              <Route path="workflows/:id" element={<WorkflowEditorPage />} />
              <Route path="runs" element={<RunsPage />} />
              <Route path="runs/:id" element={<RunDetailPage />} />
              <Route path="debug/runs" element={<RunsPage />} />
              <Route path="debug/runs/:id" element={<RunDetailPage />} />
              <Route path="debug/workflows" element={<WorkflowsPage />} />
              <Route path="debug/workflows/:id" element={<WorkflowEditorPage />} />
              <Route path="debug/agents" element={<AgentsPage />} />
              <Route path="debug/skills" element={<SkillsPage />} />
              <Route path="debug/team" element={<TenantUsersPage />} />
              <Route path="debug/consensus" element={<ConsensusPage />} />
              <Route path="debug/products/:productId/consensus" element={<ProductConsensusPage />} />
              <Route path="debug/ops" element={<OpsPage />} />
              <Route path="debug/decisions" element={<DecisionsPage />} />
              <Route path="ops" element={<OpsPage />} />
              <Route path="products" element={<ProductsPage />} />
              <Route path="war-room" element={<WarRoomPage />} />
              <Route path="war-room/:productId" element={<WarRoomPage />} />
              <Route path="decisions" element={<DecisionsPage />} />
              <Route path="consensus" element={<Navigate to="/debug/consensus" replace />} />
              <Route path="products/:productId/consensus" element={<RedirectProductConsensus />} />
              <Route path="products/:productId/settings" element={<ProductSettingsPage />} />
              <Route path="products/:productId/code" element={<ProductCodePage />} />
              <Route path="products/:productId/team" element={<ProductTeamPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="settings/interests" element={<TenantInterestsPage />} />
              <Route path="team" element={<TenantUsersPage />} />
            </Route>
          </Route>
        </Routes>
      </main>
    </AppLayout>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppShell />
        <Toaster />
      </AuthProvider>
    </ThemeProvider>
  );
}

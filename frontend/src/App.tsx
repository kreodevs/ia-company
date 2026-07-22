import { Navigate, Route, Routes } from "react-router-dom";
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
import OpsPage from "./pages/OpsPage";
import SkillsPage from "./pages/SkillsPage";
import ConsensusPage from "./pages/ConsensusPage";
import SettingsPage from "./pages/SettingsPage";
import PlatformSettingsPage from "./pages/PlatformSettingsPage";
import PlatformTemplatesPage from "./pages/PlatformTemplatesPage";
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
import { defaultHelpSlug } from "./content/help";

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
              <Route path="admin/templates" element={<PlatformTemplatesPage />} />
              <Route path="admin/settings" element={<PlatformSettingsPage />} />
              <Route path="admin/templates/workflows/:id" element={<PlatformWorkflowEditorPage />} />
            </Route>

            <Route element={<RequireTenantAccess />}>
              <Route index element={<WorkflowsPage />} />
              <Route path="agents" element={<AgentsPage />} />
              <Route path="skills" element={<SkillsPage />} />
              <Route path="workflows" element={<WorkflowsPage />} />
              <Route path="workflows/:id" element={<WorkflowEditorPage />} />
              <Route path="runs" element={<RunsPage />} />
              <Route path="runs/:id" element={<RunDetailPage />} />
              <Route path="ops" element={<OpsPage />} />
              <Route path="consensus" element={<ConsensusPage />} />
              <Route path="settings" element={<SettingsPage />} />
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
      </AuthProvider>
    </ThemeProvider>
  );
}

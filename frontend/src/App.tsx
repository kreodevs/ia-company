import { Route, Routes } from "react-router-dom";
import AppHeader from "./components/AppHeader";
import {
  RequireSuperAdmin,
  RequireTenantAccess,
  SetupGate,
} from "./components/SetupGate";
import { AuthProvider, useAuth } from "./context/AuthContext";
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

function AppShell() {
  const { authenticated } = useAuth();

  return (
    <div className="min-h-screen">
      {authenticated && <AppHeader />}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <Routes>
          <Route path="/setup" element={<SetupSuperAdminPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          <Route element={<SetupGate />}>
            <Route element={<RequireSuperAdmin />}>
              <Route path="/admin" element={<SuperAdminDashboardPage />} />
              <Route path="/admin/templates" element={<PlatformTemplatesPage />} />
              <Route path="/admin/settings" element={<PlatformSettingsPage />} />
              <Route path="/admin/templates/workflows/:id" element={<PlatformWorkflowEditorPage />} />
            </Route>

            <Route element={<RequireTenantAccess />}>
              <Route path="/" element={<WorkflowsPage />} />
              <Route path="/agents" element={<AgentsPage />} />
              <Route path="/skills" element={<SkillsPage />} />
              <Route path="/workflows" element={<WorkflowsPage />} />
              <Route path="/workflows/:id" element={<WorkflowEditorPage />} />
              <Route path="/runs" element={<RunsPage />} />
              <Route path="/runs/:id" element={<RunDetailPage />} />
              <Route path="/consensus" element={<ConsensusPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/team" element={<TenantUsersPage />} />
            </Route>
          </Route>
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}

import { Link, Route, Routes } from "react-router-dom";
import {
  RequireSuperAdmin,
  RequireTenantAccess,
  SetupGate,
} from "./components/SetupGate";
import TenantImpersonationSelect from "./components/TenantImpersonationSelect";
import { AuthProvider, useAuth } from "./context/AuthContext";
import SkillsPage from "./pages/SkillsPage";
import ConsensusPage from "./pages/ConsensusPage";
import SettingsPage from "./pages/SettingsPage";
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

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="rounded-lg px-3 py-2 text-sm text-[var(--color-muted-foreground)] transition hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]"
    >
      {children}
    </Link>
  );
}

function AppShell() {
  const { authenticated, activeTenant, isSuperAdmin, isTenantAdmin, logout } = useAuth();

  const homeLink = isSuperAdmin ? "/admin" : "/workflows";

  return (
    <div className="min-h-screen">
      {authenticated && (
        <header className="border-b border-[var(--color-border)] bg-[var(--color-card)]/80 backdrop-blur">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-4">
            <div className="flex items-center gap-4">
              <Link to={homeLink} className="text-lg font-semibold tracking-tight">
                Auto-Company
              </Link>
              <nav className="flex gap-1">
                {isSuperAdmin && <NavLink to="/admin">Admin</NavLink>}
                {isSuperAdmin && <NavLink to="/admin/templates">Templates</NavLink>}
                {activeTenant && (
                  <>
                    <NavLink to="/agents">Agents</NavLink>
                    <NavLink to="/skills">Skills</NavLink>
                    <NavLink to="/workflows">Workflows</NavLink>
                    <NavLink to="/runs">Runs</NavLink>
                    <NavLink to="/consensus">Consensus</NavLink>
                    {isTenantAdmin && <NavLink to="/settings">Settings</NavLink>}
                    {isTenantAdmin && <NavLink to="/team">Team</NavLink>}
                  </>
                )}
              </nav>
            </div>
            <div className="flex items-center gap-2">
              <TenantImpersonationSelect />
              <button
                onClick={() => void logout()}
                className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </header>
      )}
      <main className="mx-auto max-w-7xl px-6 py-8">
        <Routes>
          <Route path="/setup" element={<SetupSuperAdminPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          <Route element={<SetupGate />}>
            <Route element={<RequireSuperAdmin />}>
              <Route path="/admin" element={<SuperAdminDashboardPage />} />
              <Route path="/admin/templates" element={<PlatformTemplatesPage />} />
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

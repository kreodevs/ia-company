import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import TenantImpersonationSelect from "./TenantImpersonationSelect";
import { useAuth } from "../context/AuthContext";

function NavLink({
  to,
  children,
  onNavigate,
}: {
  to: string;
  children: React.ReactNode;
  onNavigate?: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={onNavigate}
      className="block rounded-lg px-3 py-2 text-sm text-[var(--color-muted-foreground)] transition hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)] md:inline-block"
    >
      {children}
    </Link>
  );
}

export default function AppHeader() {
  const { activeTenant, isSuperAdmin, isTenantAdmin, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const homeLink = isSuperAdmin ? "/admin" : "/workflows";
  const closeMobile = () => setMobileOpen(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <header className="border-b border-[var(--color-border)] bg-[var(--color-card)]/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Link to={homeLink} className="shrink-0 text-lg font-semibold tracking-tight">
            Auto-Company
          </Link>
          <nav className="hidden flex-wrap gap-1 md:flex">
            {isSuperAdmin && <NavLink to="/admin">Admin</NavLink>}
            {isSuperAdmin && <NavLink to="/admin/templates">Templates</NavLink>}
            {isSuperAdmin && <NavLink to="/admin/settings">Settings</NavLink>}
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

        <div className="flex shrink-0 items-center gap-2">
          <TenantImpersonationSelect />
          <button
            onClick={() => void logout()}
            className="hidden rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm sm:inline-flex"
          >
            Logout
          </button>
          <button
            type="button"
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileOpen((open) => !open)}
            className="inline-flex rounded-lg border border-[var(--color-border)] p-2 md:hidden"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              {mobileOpen ? (
                <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
              ) : (
                <>
                  <path strokeLinecap="round" d="M4 7h16" />
                  <path strokeLinecap="round" d="M4 12h16" />
                  <path strokeLinecap="round" d="M4 17h16" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav
          id="mobile-nav"
          className="border-t border-[var(--color-border)] px-4 py-3 md:hidden"
        >
          <div className="flex flex-col gap-1">
            {isSuperAdmin && (
              <NavLink to="/admin" onNavigate={closeMobile}>
                Admin
              </NavLink>
            )}
            {isSuperAdmin && (
              <NavLink to="/admin/templates" onNavigate={closeMobile}>
                Templates
              </NavLink>
            )}
            {isSuperAdmin && (
              <NavLink to="/admin/settings" onNavigate={closeMobile}>
                Settings
              </NavLink>
            )}
            {activeTenant && (
              <>
                <NavLink to="/agents" onNavigate={closeMobile}>
                  Agents
                </NavLink>
                <NavLink to="/skills" onNavigate={closeMobile}>
                  Skills
                </NavLink>
                <NavLink to="/workflows" onNavigate={closeMobile}>
                  Workflows
                </NavLink>
                <NavLink to="/runs" onNavigate={closeMobile}>
                  Runs
                </NavLink>
                <NavLink to="/consensus" onNavigate={closeMobile}>
                  Consensus
                </NavLink>
                {isTenantAdmin && (
                  <NavLink to="/settings" onNavigate={closeMobile}>
                    Settings
                  </NavLink>
                )}
                {isTenantAdmin && (
                  <NavLink to="/team" onNavigate={closeMobile}>
                    Team
                  </NavLink>
                )}
              </>
            )}
            <button
              onClick={() => void logout()}
              className="mt-2 rounded-lg border border-[var(--color-border)] px-3 py-2 text-left text-sm sm:hidden"
            >
              Logout
            </button>
          </div>
        </nav>
      )}
    </header>
  );
}

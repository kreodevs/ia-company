import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import AppHeader from "./AppHeader";
import AppSidebar from "./AppSidebar";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { authenticated } = useAuth();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const closeMobileSidebar = useCallback(() => {
    setMobileSidebarOpen(false);
  }, []);

  const toggleMobileSidebar = useCallback(() => {
    setMobileSidebarOpen((open) => !open);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileSidebarOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileSidebarOpen]);

  if (!authenticated) {
    return <>{children}</>;
  }

  return (
    <div className="app-layout">
      <AppSidebar mobileOpen={mobileSidebarOpen} onMobileClose={closeMobileSidebar} />
      <div className="app-layout-column">
        <AppHeader
          mobileSidebarOpen={mobileSidebarOpen}
          onMobileSidebarToggle={toggleMobileSidebar}
        />
        {children}
      </div>
    </div>
  );
}

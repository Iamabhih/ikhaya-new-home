import { useState } from "react";
import { AdminSidebar } from "./AdminSidebar";
import { Header } from "@/components/layout/Header";
import { cn } from "@/lib/utils";

interface AdminLayoutProps {
  children: React.ReactNode;
  hideHeader?: boolean;
}

export const AdminLayout = ({ children, hideHeader = false }: AdminLayoutProps) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="bg-gray-50/50">
      {!hideHeader && <Header />}

      <div className="flex flex-col lg:flex-row">
        <AdminSidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        {/* No overflow-auto here — the window/body handles page scroll */}
        <main className={cn(
          "flex-1 bg-background",
          "transition-all duration-300",
          "w-full lg:w-auto"
        )}>
          <div className="bg-card px-2 xs:px-4 sm:px-6 py-3 xs:py-4">
              <div className="max-w-none">
                {children}
              </div>
            </div>
        </main>
      </div>
    </div>
  );
};
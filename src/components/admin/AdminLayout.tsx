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
    <div className="min-h-screen bg-gray-50/50">
      {!hideHeader && <Header />}
      
      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-48px)] xs:min-h-[calc(100vh-56px)] sm:min-h-[calc(100vh-64px)]">
        <AdminSidebar 
          collapsed={sidebarCollapsed} 
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
        />
        
        <main className={cn(
          "flex-1 overflow-auto bg-background",
          "transition-all duration-300",
          "w-full lg:w-auto"
        )}>
          <div className="min-h-full">
            <div className="bg-card border-b border-border px-2 xs:px-4 sm:px-6 py-3 xs:py-4">
              <div className="max-w-none">
                {children}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
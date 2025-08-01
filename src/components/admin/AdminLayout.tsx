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
      
      <div className="flex min-h-[calc(100vh-64px)]">
        <AdminSidebar 
          collapsed={sidebarCollapsed} 
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
        />
        
        <main className={cn(
          "flex-1 overflow-auto bg-background",
          "transition-all duration-300"
        )}>
          <div className="min-h-full">
            <div className="bg-card border-b border-border px-6 py-4">
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
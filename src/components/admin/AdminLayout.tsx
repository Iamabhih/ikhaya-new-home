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
      
      <div className="flex h-[calc(100vh-64px)]">
        <AdminSidebar 
          collapsed={sidebarCollapsed} 
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
        />
        
        <main className={cn(
          "flex-1 overflow-auto bg-gray-50/50",
          "transition-all duration-300"
        )}>
          <div className="h-full">
            <div className="bg-white border-b border-gray-200/60 px-8 py-6">
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
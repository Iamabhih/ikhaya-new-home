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
    <div className="min-h-screen bg-background">
      {!hideHeader && <Header />}
      
      <div className="flex h-[calc(100vh-64px)]">
        <AdminSidebar 
          collapsed={sidebarCollapsed} 
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
        />
        
        <main className={cn(
          "flex-1 overflow-auto",
          "transition-all duration-300"
        )}>
          <div className="container mx-auto p-6 max-w-none">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
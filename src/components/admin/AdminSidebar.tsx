import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { 
  BarChart3, 
  Package, 
  ShoppingCart, 
  Users, 
  CreditCard, 
  RotateCcw, 
  Settings, 
  Home,
  Crown,
  Shield,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRoles } from "@/hooks/useRoles";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const adminRoutes = [
  { 
    title: "Dashboard", 
    url: "/admin", 
    icon: BarChart3,
    end: true
  },
  { 
    title: "Products", 
    url: "/admin/products", 
    icon: Package 
  },
  { 
    title: "Orders", 
    url: "/admin/orders", 
    icon: ShoppingCart 
  },
  { 
    title: "Analytics", 
    url: "/admin/analytics", 
    icon: BarChart3 
  },
  { 
    title: "Payments", 
    url: "/admin/payments", 
    icon: CreditCard 
  },
  { 
    title: "Returns", 
    url: "/admin/returns", 
    icon: RotateCcw 
  },
  { 
    title: "Homepage", 
    url: "/admin/homepage", 
    icon: Home 
  },
];

const superAdminRoutes = [
  { 
    title: "User Management", 
    url: "/admin/users", 
    icon: Users,
    badge: "Super"
  },
  { 
    title: "SuperAdmin Settings", 
    url: "/superadmin/settings", 
    icon: Settings,
    badge: "Super"
  },
];

interface AdminSidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export const AdminSidebar = ({ collapsed = false, onToggle }: AdminSidebarProps) => {
  const { user } = useAuth();
  const { roles, isAdmin, isSuperAdmin } = useRoles(user);
  const location = useLocation();

  const isActive = (path: string, end?: boolean) => {
    if (end) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  const getNavClassName = (path: string, end?: boolean) => {
    const active = isActive(path, end);
    return cn(
      "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors",
      "hover:bg-accent hover:text-accent-foreground",
      active 
        ? "bg-primary text-primary-foreground" 
        : "text-muted-foreground"
    );
  };

  if (!isAdmin()) return null;

  return (
    <div className={cn(
      "flex flex-col bg-background border-r border-border h-full transition-all duration-300",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <span className="font-semibold">
              {roles.includes('superadmin') ? 'SuperAdmin' : 'Admin'} Panel
            </span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="h-8 w-8"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {/* Admin Routes */}
        <div className="space-y-1">
          {!collapsed && (
            <h3 className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Administration
            </h3>
          )}
          {adminRoutes.map((route) => (
            <NavLink
              key={route.url}
              to={route.url}
              end={route.end}
              className={({ isActive }) => getNavClassName(route.url, route.end)}
              title={collapsed ? route.title : undefined}
            >
              <route.icon className="h-4 w-4 flex-shrink-0" />
              {!collapsed && <span>{route.title}</span>}
            </NavLink>
          ))}
        </div>

        {/* SuperAdmin Routes */}
        {isSuperAdmin() && (
          <div className="space-y-1 pt-4 border-t border-border">
            {!collapsed && (
              <h3 className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Super Admin
              </h3>
            )}
            {superAdminRoutes.map((route) => (
              <NavLink
                key={route.url}
                to={route.url}
                className={({ isActive }) => getNavClassName(route.url)}
                title={collapsed ? route.title : undefined}
              >
                <route.icon className="h-4 w-4 flex-shrink-0" />
                {!collapsed && (
                  <div className="flex items-center justify-between flex-1">
                    <span>{route.title}</span>
                    {route.badge && (
                      <Badge variant="destructive" className="text-xs">
                        <Crown className="h-3 w-3 mr-1" />
                        {route.badge}
                      </Badge>
                    )}
                  </div>
                )}
                {collapsed && route.badge && (
                  <Crown className="h-3 w-3 text-destructive" />
                )}
              </NavLink>
            ))}
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <NavLink
          to="/"
          className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors hover:bg-accent hover:text-accent-foreground text-muted-foreground"
          title={collapsed ? "Back to Store" : undefined}
        >
          <Home className="h-4 w-4 flex-shrink-0" />
          {!collapsed && <span>Back to Store</span>}
        </NavLink>
      </div>
    </div>
  );
};
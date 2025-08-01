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
      "flex flex-col bg-white border-r border-gray-200/60 h-full transition-all duration-300 shadow-sm",
      collapsed ? "w-16" : "w-72"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200/60">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="font-semibold text-gray-900 text-sm">
                {roles.includes('superadmin') ? 'SuperAdmin' : 'Admin'}
              </span>
              <p className="text-xs text-gray-500">Control Panel</p>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="h-8 w-8 hover:bg-gray-100"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-8">
        {/* Admin Routes */}
        <div className="space-y-2">
          {!collapsed && (
            <h3 className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Core Management
            </h3>
          )}
          {adminRoutes.map((route) => (
            <NavLink
              key={route.url}
              to={route.url}
              end={route.end}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200",
                "hover:bg-gray-50 hover:text-gray-900 group",
                isActive 
                  ? "bg-indigo-50 text-indigo-700 border border-indigo-200/50 shadow-sm" 
                  : "text-gray-600 hover:text-gray-900"
              )}
              title={collapsed ? route.title : undefined}
            >
              <route.icon className={cn(
                "h-5 w-5 flex-shrink-0 transition-colors",
                isActive(route.url, route.end) ? "text-indigo-600" : "text-gray-400 group-hover:text-gray-600"
              )} />
              {!collapsed && <span className="truncate">{route.title}</span>}
            </NavLink>
          ))}
        </div>

        {/* SuperAdmin Routes */}
        {isSuperAdmin() && (
          <div className="space-y-2 pt-4 border-t border-gray-200/60">
            {!collapsed && (
              <h3 className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                System Administration
              </h3>
            )}
            {superAdminRoutes.map((route) => (
              <NavLink
                key={route.url}
                to={route.url}
                className={({ isActive }) => cn(
                  "flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200",
                  "hover:bg-red-50 hover:text-red-700 group",
                  isActive 
                    ? "bg-red-50 text-red-700 border border-red-200/50 shadow-sm" 
                    : "text-gray-600 hover:text-red-600"
                )}
                title={collapsed ? route.title : undefined}
              >
                <route.icon className={cn(
                  "h-5 w-5 flex-shrink-0 transition-colors",
                  isActive(route.url) ? "text-red-600" : "text-gray-400 group-hover:text-red-500"
                )} />
                {!collapsed && (
                  <div className="flex items-center justify-between flex-1 min-w-0">
                    <span className="truncate">{route.title}</span>
                    {route.badge && (
                      <Badge variant="destructive" className="text-xs ml-2 bg-red-100 text-red-700 border-red-200">
                        <Crown className="h-3 w-3 mr-1" />
                        {route.badge}
                      </Badge>
                    )}
                  </div>
                )}
                {collapsed && route.badge && (
                  <Crown className="h-3 w-3 text-red-500" />
                )}
              </NavLink>
            ))}
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200/60">
        <NavLink
          to="/"
          className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 hover:bg-gray-50 text-gray-600 hover:text-gray-900 group"
          title={collapsed ? "Back to Store" : undefined}
        >
          <Home className="h-5 w-5 flex-shrink-0 text-gray-400 group-hover:text-gray-600" />
          {!collapsed && <span>Back to Store</span>}
        </NavLink>
      </div>
    </div>
  );
};
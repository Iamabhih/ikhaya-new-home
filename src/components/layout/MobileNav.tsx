
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Menu, X, Home, Package, Grid3X3, Info, MessageCircle, ShoppingCart, Heart, User, Settings, BarChart3, Users, CreditCard, RotateCcw, FileText, Building2 } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { useWishlist } from "@/hooks/useWishlist";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { TraderApplicationForm } from "@/components/auth/TraderApplicationForm";

interface MobileNavProps {
  user: SupabaseUser | null;
  isAdmin: boolean;
  onAuthClick: () => void;
  onSignOut: () => Promise<void>;
  onClose: () => void;
}

export const MobileNav = ({ user, isAdmin, onAuthClick, onSignOut, onClose }: MobileNavProps) => {
  const location = useLocation();
  const { items } = useCart();
  const { wishlistItems } = useWishlist();

  const itemCount = items.reduce((total, item) => total + item.quantity, 0);
  const wishlistCount = wishlistItems.length;

  const navigationItems = [
    { href: "/", label: "Home", icon: Home },
    { href: "/products", label: "Products", icon: Package },
    { href: "/categories", label: "Categories", icon: Grid3X3 },
    { href: "/about", label: "About", icon: Info },
    { href: "/contact", label: "Contact", icon: MessageCircle },
    { href: "/promotions", label: "Promotions", icon: FileText },
  ];

  // Fixed admin routes to match actual routes in App.tsx
  const adminItems = [
    { href: "/admin", label: "Dashboard", icon: BarChart3 },
    { href: "/admin/products", label: "Products", icon: Package },
    { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/admin/returns", label: "Returns", icon: RotateCcw },
    { href: "/admin/payments", label: "Payments", icon: CreditCard },
    { href: "/admin/subscriptions", label: "Subscriptions", icon: Settings },
    { href: "/admin/homepage", label: "Homepage", icon: Settings },
    { href: "/admin/production", label: "Production", icon: Settings },
  ];

  const isActivePath = (path: string) => {
    return location.pathname === path;
  };

  const handleLinkClick = () => {
    onClose();
  };

  const handleSignOut = async () => {
    try {
      await onSignOut();
      onClose();
    } catch (error) {
      console.error('Sign out error:', error);
      onClose();
    }
  };

  return (
    <div className="md:hidden border-t bg-background">
      <nav className="container mx-auto px-4 py-4">
        <div className="space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={handleLinkClick}
                className={`flex items-center gap-3 px-3 py-3 rounded-md text-sm font-medium transition-colors ${
                  isActivePath(item.href)
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Become a Trader */}
        <div className="pt-4 mt-4 border-t">
          <TraderApplicationForm
            trigger={
              <Button className="w-full bg-[#DC3545] hover:bg-[#BB2D3B] text-white font-semibold">
                <Building2 className="h-5 w-5 mr-2" />
                Become a Trader
              </Button>
            }
          />
        </div>

        {/* Admin Section */}
        {isAdmin && (
          <div className="border-t pt-4 mt-4 space-y-2">
            <div className="px-3 py-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Administration
              </h3>
            </div>
            {adminItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={handleLinkClick}
                  className={`flex items-center gap-3 px-3 py-3 rounded-md text-sm font-medium transition-colors ${
                    isActivePath(item.href)
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}

        {/* User Actions */}
        <div className="border-t pt-4 mt-4 space-y-2">
          {user ? (
            <>
              <Link
                to="/account"
                onClick={handleLinkClick}
                className={`flex items-center gap-3 px-3 py-3 rounded-md text-sm font-medium transition-colors ${
                  isActivePath("/account")
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <User className="h-5 w-5 flex-shrink-0" />
                My Account
              </Link>
              <Button
                onClick={handleSignOut}
                variant="ghost"
                className="w-full justify-start px-3 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                Sign Out
              </Button>
            </>
          ) : (
            <Button
              onClick={() => {
                onAuthClick();
                onClose();
              }}
              variant="ghost"
              className="w-full justify-start px-3 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <User className="h-5 w-5 mr-3 flex-shrink-0" />
              Sign In
            </Button>
          )}
          
          <Link
            to="/wishlist"
            onClick={handleLinkClick}
            className={`flex items-center gap-3 px-3 py-3 rounded-md text-sm font-medium transition-colors ${
              isActivePath("/wishlist")
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <Heart className="h-5 w-5 flex-shrink-0" />
            Wishlist
            {wishlistCount > 0 && (
              <span className="ml-auto bg-destructive text-destructive-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center flex-shrink-0">
                {wishlistCount}
              </span>
            )}
          </Link>
          
          <Link
            to="/cart"
            onClick={handleLinkClick}
            className={`flex items-center gap-3 px-3 py-3 rounded-md text-sm font-medium transition-colors ${
              isActivePath("/cart")
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <ShoppingCart className="h-5 w-5 flex-shrink-0" />
            Cart
            {itemCount > 0 && (
              <span className="ml-auto bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center flex-shrink-0">
                {itemCount}
              </span>
            )}
          </Link>
        </div>
      </nav>
    </div>
  );
};

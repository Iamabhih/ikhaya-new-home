
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Menu, X, Home, Package, Grid3X3, Info, MessageCircle, ShoppingCart, Heart, User } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { useWishlist } from "@/hooks/useWishlist";

export const MobileNav = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { items } = useCart();
  const { user } = useAuth();
  const { wishlistItems } = useWishlist();

  const itemCount = items.reduce((total, item) => total + item.quantity, 0);
  const wishlistCount = wishlistItems.length;

  const navigationItems = [
    { href: "/", label: "Home", icon: Home },
    { href: "/products", label: "Products", icon: Package },
    { href: "/categories", label: "Categories", icon: Grid3X3 },
    { href: "/about", label: "About", icon: Info },
    { href: "/contact", label: "Contact", icon: MessageCircle },
  ];

  const isActivePath = (path: string) => {
    return location.pathname === path;
  };

  const handleLinkClick = () => {
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 p-0">
        <SheetHeader className="p-6 border-b">
          <SheetTitle className="text-left">
            <Link to="/" onClick={handleLinkClick} className="text-xl font-bold">
              Homeware
            </Link>
          </SheetTitle>
        </SheetHeader>
        
        <div className="flex flex-col h-full">
          {/* Main Navigation */}
          <nav className="flex-1 p-6">
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
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* User Actions */}
          <div className="border-t p-6 space-y-2">
            {user ? (
              <Link
                to="/account"
                onClick={handleLinkClick}
                className={`flex items-center gap-3 px-3 py-3 rounded-md text-sm font-medium transition-colors ${
                  isActivePath("/account")
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <User className="h-5 w-5" />
                My Account
              </Link>
            ) : (
              <Link
                to="/auth"
                onClick={handleLinkClick}
                className={`flex items-center gap-3 px-3 py-3 rounded-md text-sm font-medium transition-colors ${
                  isActivePath("/auth")
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <User className="h-5 w-5" />
                Sign In
              </Link>
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
              <Heart className="h-5 w-5" />
              Wishlist
              {wishlistCount > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
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
              <ShoppingCart className="h-5 w-5" />
              Cart
              {itemCount > 0 && (
                <span className="ml-auto bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

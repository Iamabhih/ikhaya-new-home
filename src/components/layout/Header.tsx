import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, User, Search, Menu, X, Package, Settings, BarChart3, Users, CreditCard, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/contexts/AuthContext";
import { useRoles } from "@/hooks/useRoles";
import { AuthModal } from "@/components/auth/AuthModal";
import { MobileNav } from "./MobileNav";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export const Header = () => {
  const { items } = useCart();
  const { user, signOut } = useAuth();
  const { isAdmin } = useRoles(user);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const itemCount = items.reduce((total, item) => total + item.quantity, 0);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery)}`);
      setSearchQuery("");
    }
  };

  const handleAuthSuccess = () => {
    setAuthModalOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-white/20 bg-white/10 backdrop-blur-md supports-[backdrop-filter]:bg-white/5 shadow-lg">
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/4 w-32 h-32 bg-primary/10 rounded-full blur-2xl animate-pulse" />
          <div className="absolute top-0 right-1/4 w-24 h-24 bg-secondary/10 rounded-full blur-xl animate-pulse" />
        </div>

        <div className="container mx-auto px-2 sm:px-4 relative z-10">
          <div className="flex h-16 sm:h-18 items-center justify-between gap-2 sm:gap-4">
            {/* Logo - Enhanced with gradient */}
            <Link to="/" className="flex items-center space-x-2 flex-shrink-0 group">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-lg sm:text-xl lg:text-2xl bg-gradient-to-r from-primary via-primary/90 to-secondary bg-clip-text text-transparent">
                <span className="hidden sm:inline">IKHAYA Homeware</span>
                <span className="sm:hidden">IKHAYA</span>
              </span>
            </Link>

            {/* Desktop Navigation - Enhanced styling */}
            <nav className="hidden lg:flex items-center space-x-1">
              {[
                { to: "/products", label: "Products" },
                { to: "/categories", label: "Categories" },
                { to: "/about", label: "About" },
                { to: "/contact", label: "Contact" }
              ].map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-primary transition-all duration-200 rounded-lg hover:bg-white/20 backdrop-blur-sm"
                >
                  {item.label}
                </Link>
              ))}
              
              {isAdmin() && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-10 bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all duration-200"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Admin
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 bg-white/95 backdrop-blur-md border border-white/20 shadow-xl">
                    <DropdownMenuItem asChild>
                      <Link to="/admin" className="w-full">
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-white/20" />
                    <DropdownMenuItem asChild>
                      <Link to="/admin/products" className="w-full">
                        <Package className="h-4 w-4 mr-2" />
                        Products
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/admin/orders" className="w-full">
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Orders
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/admin/users" className="w-full">
                        <Users className="h-4 w-4 mr-2" />
                        Users
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-white/20" />
                    <DropdownMenuItem asChild>
                      <Link to="/admin/analytics" className="w-full">
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Analytics
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/admin/payments" className="w-full">
                        <CreditCard className="h-4 w-4 mr-2" />
                        Payments
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/admin/returns" className="w-full">
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Returns
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </nav>

            {/* Modern Search Bar */}
            <form onSubmit={handleSearch} className="hidden sm:flex items-center flex-1 max-w-sm lg:max-w-md mx-2 lg:mx-4">
              <Card className="border-0 bg-white/20 backdrop-blur-md shadow-lg w-full">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search products..." 
                    value={searchQuery} 
                    onChange={(e) => setSearchQuery(e.target.value)} 
                    className="pl-10 h-10 bg-transparent border-0 focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/70"
                  />
                </div>
              </Card>
            </form>

            {/* Right Side Actions - Enhanced */}
            <div className="flex items-center space-x-2">
              {/* Mobile Search Button */}
              <Button 
                variant="ghost" 
                size="icon" 
                className="sm:hidden h-10 w-10 bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all duration-200" 
                onClick={() => navigate('/products')}
              >
                <Search className="h-4 w-4" />
              </Button>

              {/* Enhanced Cart Button */}
              <Link to="/cart">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="relative h-10 w-10 bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all duration-200 hover:scale-110 group"
                >
                  <ShoppingCart className="h-5 w-5 group-hover:rotate-12 transition-transform duration-300" />
                  {itemCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center text-xs px-0 bg-gradient-to-r from-primary to-secondary shadow-lg animate-pulse"
                    >
                      {itemCount > 99 ? '99+' : itemCount}
                    </Badge>
                  )}
                </Button>
              </Link>

              {/* Enhanced User Account - Desktop */}
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="hidden sm:flex h-10 w-10 bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all duration-200 hover:scale-110"
                    >
                      <User className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-white/95 backdrop-blur-md border border-white/20 shadow-xl">
                    <DropdownMenuItem asChild>
                      <Link to="/account" className="w-full">My Account</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/orders" className="w-full">My Orders</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/wishlist" className="w-full">Wishlist</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-white/20" />
                    <DropdownMenuItem onClick={signOut} className="w-full">
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setAuthModalOpen(true)} 
                  className="hidden sm:flex h-10 px-4 bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-primary hover:text-primary-foreground transition-all duration-200 hover:scale-105"
                >
                  Sign In
                </Button>
              )}

              {/* Enhanced Mobile Menu Toggle */}
              <Button 
                variant="ghost" 
                size="icon" 
                className="sm:hidden h-10 w-10 bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all duration-200" 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Enhanced Mobile Search Bar */}
          <div className="sm:hidden pb-3">
            <form onSubmit={handleSearch} className="w-full">
              <Card className="border-0 bg-white/20 backdrop-blur-md shadow-lg">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search products..." 
                    value={searchQuery} 
                    onChange={(e) => setSearchQuery(e.target.value)} 
                    className="pl-10 h-10 bg-transparent border-0 focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/70"
                  />
                </div>
              </Card>
            </form>
          </div>
        </div>

        {/* Enhanced Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-white/20 bg-white/10 backdrop-blur-md">
            <MobileNav 
              user={user} 
              isAdmin={isAdmin()} 
              onAuthClick={() => setAuthModalOpen(true)} 
              onSignOut={signOut} 
              onClose={() => setMobileMenuOpen(false)} 
            />
          </div>
        )}
      </header>

      {/* Auth Modal */}
      <AuthModal 
        open={authModalOpen} 
        onOpenChange={setAuthModalOpen} 
        onAuthSuccess={handleAuthSuccess} 
      />
    </>
  );
};
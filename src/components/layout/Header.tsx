import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, User, Search, Menu, X, Package, Settings, BarChart3, Users, CreditCard, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/contexts/AuthContext";
import { useRoles } from "@/hooks/useRoles";
import { AuthModal } from "@/components/auth/AuthModal";
import { MobileNav } from "./MobileNav";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import BackgroundRemovalStatus from "@/components/admin/BackgroundRemovalStatus";

export const Header = () => {
  const { items } = useCart();
  const { user, signOut } = useAuth();
  const { isAdmin } = useRoles(user);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const itemCount = items.reduce((total, item) => total + item.quantity, 0);

  const handleSearch = (e) => {
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
      <header className="fixed top-0 left-0 right-0 z-50 w-full border-b border-border/40 bg-glass-bg backdrop-blur-md supports-[backdrop-filter]:bg-background/80 transition-all duration-300 shadow-soft">
        <div className="container mx-auto px-2 sm:px-4 lg:px-6">
          <div className="flex h-14 sm:h-16 items-center justify-between gap-2 sm:gap-4">
            
            {/* Logo */}
            <Link to="/" className="flex items-center flex-shrink-0">
              <img 
                src="/lovable-uploads/6fdda264-ce80-44ec-9836-c9c81756c513.png" 
                alt="IKHAYA Homeware" 
                className="h-10 sm:h-12 md:h-16 lg:h-18 w-auto"
              />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-8">
              <Link 
                to="/products" 
                className="premium-nav-item"
              >
                Products
              </Link>
              <Link 
                to="/categories" 
                className="premium-nav-item"
              >
                Categories
              </Link>
              <Link 
                to="/about" 
                className="premium-nav-item"
              >
                About
              </Link>
              <Link 
                to="/contact" 
                className="premium-nav-item"
              >
                Contact
              </Link>
              
              {/* Admin Dropdown */}
              {isAdmin() && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                      <Settings className="h-4 w-4 mr-2" />
                      Admin
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem asChild>
                      <Link to="/admin" className="w-full">
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
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
                    <DropdownMenuItem asChild>
                      <Link to="/admin/analytics" className="w-full">
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Analytics
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/admin/returns" className="w-full">
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Returns
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/admin/payments" className="w-full">
                        <CreditCard className="h-4 w-4 mr-2" />
                        Payments
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/admin/subscriptions" className="w-full">
                        <Settings className="h-4 w-4 mr-2" />
                        Subscriptions
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/admin/homepage" className="w-full">
                        <Settings className="h-4 w-4 mr-2" />
                        Homepage
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/admin/production" className="w-full">
                        <Settings className="h-4 w-4 mr-2" />
                        Production
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </nav>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="hidden md:flex items-center flex-1 max-w-xs lg:max-w-sm mx-2 lg:mx-4">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search products..." 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                  className="pl-10 h-9 lg:h-10 text-sm border-border/60 bg-background/50 focus:bg-background transition-colors premium-input" 
                />
              </div>
            </form>

            {/* Right Side Actions */}
            <div className="flex items-center space-x-1 sm:space-x-2">
              {/* Mobile Search Button */}
              <Button 
                variant="ghost" 
                size="icon" 
                className="md:hidden h-9 w-9 sm:h-10 sm:w-10 text-muted-foreground hover:text-foreground" 
                onClick={() => navigate('/products')}
              >
                <Search className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>

              {/* Cart */}
              <Link to="/cart">
                <Button variant="ghost" size="icon" className="relative h-9 w-9 sm:h-10 sm:w-10 text-muted-foreground hover:text-foreground">
                  <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
                  {itemCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center text-xs px-0 min-w-4 sm:min-w-5"
                    >
                      {itemCount > 99 ? '99+' : itemCount}
                    </Badge>
                  )}
                </Button>
              </Link>

              {/* User Account */}
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9 sm:h-10 sm:w-10 text-muted-foreground hover:text-foreground">
                      <User className="h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem asChild>
                      <Link to="/account" className="w-full">My Account</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/orders" className="w-full">My Orders</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/wishlist" className="w-full">Wishlist</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={signOut} className="w-full">
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setAuthModalOpen(true)} 
                  className="hidden sm:flex"
                >
                  Sign In
                </Button>
              )}

              {/* Mobile Menu Toggle */}
              <Button 
                variant="ghost" 
                size="icon" 
                className="lg:hidden h-9 w-9 sm:h-10 sm:w-10 text-muted-foreground hover:text-foreground" 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-4 w-4 sm:h-5 sm:w-5" /> : <Menu className="h-4 w-4 sm:h-5 sm:w-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <MobileNav 
            user={user} 
            isAdmin={isAdmin()} 
            onAuthClick={() => setAuthModalOpen(true)} 
            onSignOut={signOut} 
            onClose={() => setMobileMenuOpen(false)} 
          />
        )}
      </header>

      {/* Auth Modal */}
      <AuthModal 
        open={authModalOpen} 
        onOpenChange={setAuthModalOpen} 
        onAuthSuccess={handleAuthSuccess} 
      />
      
      {/* Background Removal Status */}
      <BackgroundRemovalStatus />
    </>
  );
};

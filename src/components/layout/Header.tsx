import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ShoppingCart, User, Search, Menu, X, Package, Settings, BarChart3, Users, CreditCard, RotateCcw, Sparkles, Home, Grid3X3, Phone, Info, ChevronDown } from "lucide-react";
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
  const [isScrolled, setIsScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const itemCount = items.reduce((total, item) => total + item.quantity, 0);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  const isActiveLink = (path: string) => {
    return location.pathname === path;
  };

  const navigationItems = [
    { to: "/", label: "Home", icon: Home },
    { to: "/products", label: "Products", icon: Package },
    { to: "/categories", label: "Categories", icon: Grid3X3 },
    { to: "/about", label: "About", icon: Info },
    { to: "/contact", label: "Contact", icon: Phone }
  ];

  return (
    <>
      {/* Main Header */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled 
          ? 'bg-white/95 backdrop-blur-xl shadow-2xl shadow-primary/10 border-b border-primary/20' 
          : 'bg-white/90 backdrop-blur-md shadow-lg border-b border-white/30'
      }`}>
        
        {/* Background Pattern */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-primary/5 via-transparent to-secondary/5" />
          <div className={`absolute transition-all duration-500 ${
            isScrolled 
              ? 'top-0 left-1/3 w-20 h-20 opacity-30' 
              : 'top-0 left-1/4 w-32 h-32 opacity-20'
          } bg-primary/10 rounded-full blur-2xl animate-pulse`} />
          <div className={`absolute transition-all duration-500 ${
            isScrolled 
              ? 'top-0 right-1/3 w-16 h-16 opacity-30' 
              : 'top-0 right-1/4 w-24 h-24 opacity-20'
          } bg-secondary/10 rounded-full blur-xl animate-pulse`} />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          {/* Top Bar - Desktop Only */}
          <div className="hidden lg:flex items-center justify-between py-2 border-b border-white/20">
            <div className="flex items-center gap-6 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                📞 +27 31 332 7192
              </span>
              <span className="flex items-center gap-1">
                ✉️ info@ikhaya.shop
              </span>
              <span className="flex items-center gap-1">
                🚚 Free shipping on all orders
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs text-muted-foreground">Follow us:</span>
              <div className="flex gap-2">
                {['📘', '📷', '🐦'].map((emoji, index) => (
                  <a 
                    key={index}
                    href="#" 
                    className="w-6 h-6 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-xs hover:bg-primary/20 transition-all duration-200 hover:scale-110"
                  >
                    {emoji}
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Main Navigation */}
          <div className={`flex items-center justify-between transition-all duration-300 ${
            isScrolled ? 'py-3' : 'py-4'
          }`}>
            
            {/* Logo Section */}
            <Link to="/" className="flex items-center gap-3 group">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-primary via-primary/90 to-secondary rounded-2xl flex items-center justify-center shadow-xl group-hover:shadow-2xl transition-all duration-300 group-hover:scale-110 group-hover:rotate-3">
                  <Sparkles className="w-6 h-6 text-white animate-pulse" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-secondary to-primary rounded-full animate-ping opacity-75" />
              </div>
              <div className="flex flex-col">
                <span className="font-black text-2xl bg-gradient-to-r from-primary via-primary/90 to-secondary bg-clip-text text-transparent leading-tight">
                  IKHAYA
                </span>
                <span className="text-xs text-muted-foreground font-medium tracking-wider">
                  HOMEWARE
                </span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center bg-white/30 backdrop-blur-xl rounded-2xl p-2 shadow-lg border border-white/30">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = isActiveLink(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-lg scale-105'
                        : 'text-muted-foreground hover:text-primary hover:bg-white/50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
              
              {/* Admin Dropdown */}
              {isAdmin() && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-primary hover:bg-white/50 transition-all duration-300"
                    >
                      <Settings className="w-4 h-4" />
                      Admin
                      <ChevronDown className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52 bg-white/95 backdrop-blur-xl border border-white/30 shadow-2xl rounded-xl p-2">
                    <DropdownMenuItem asChild className="rounded-lg">
                      <Link to="/admin" className="w-full flex items-center gap-3 px-3 py-2">
                        <BarChart3 className="h-4 w-4" />
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-white/30 my-2" />
                    <DropdownMenuItem asChild className="rounded-lg">
                      <Link to="/admin/products" className="w-full flex items-center gap-3 px-3 py-2">
                        <Package className="h-4 w-4" />
                        Products
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="rounded-lg">
                      <Link to="/admin/orders" className="w-full flex items-center gap-3 px-3 py-2">
                        <ShoppingCart className="h-4 w-4" />
                        Orders
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="rounded-lg">
                      <Link to="/admin/users" className="w-full flex items-center gap-3 px-3 py-2">
                        <Users className="h-4 w-4" />
                        Users
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </nav>

            {/* Search & Actions */}
            <div className="flex items-center gap-3">
              {/* Enhanced Search */}
              <form onSubmit={handleSearch} className="hidden md:block">
                <div className="relative">
                  <Card className="border-0 bg-white/40 backdrop-blur-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
                    <div className="flex items-center">
                      <Search className="absolute left-4 z-10 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="Search amazing products..." 
                        value={searchQuery} 
                        onChange={(e) => setSearchQuery(e.target.value)} 
                        className="w-80 h-12 pl-12 pr-4 bg-transparent border-0 focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/70 text-sm"
                      />
                      <Button 
                        type="submit"
                        size="sm"
                        className="absolute right-1 bg-primary hover:bg-primary/90 shadow-lg h-10 px-6"
                      >
                        Search
                      </Button>
                    </div>
                  </Card>
                </div>
              </form>

              {/* Mobile Search */}
              <Button 
                variant="ghost" 
                size="icon" 
                className="md:hidden h-12 w-12 bg-white/40 backdrop-blur-xl border border-white/30 hover:bg-white/60 rounded-xl transition-all duration-300 hover:scale-110" 
                onClick={() => navigate('/products')}
              >
                <Search className="h-5 w-5" />
              </Button>

              {/* Cart Button */}
              <Link to="/cart">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="relative h-12 w-12 bg-white/40 backdrop-blur-xl border border-white/30 hover:bg-white/60 rounded-xl transition-all duration-300 hover:scale-110 group"
                >
                  <ShoppingCart className="h-5 w-5 group-hover:rotate-12 transition-transform duration-300" />
                  {itemCount > 0 && (
                    <Badge 
                      className="absolute -top-2 -right-2 h-6 w-6 flex items-center justify-center text-xs px-0 bg-gradient-to-r from-red-500 to-pink-500 shadow-lg animate-bounce border-2 border-white"
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
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="hidden sm:flex h-12 w-12 bg-white/40 backdrop-blur-xl border border-white/30 hover:bg-white/60 rounded-xl transition-all duration-300 hover:scale-110"
                    >
                      <User className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 bg-white/95 backdrop-blur-xl border border-white/30 shadow-2xl rounded-xl p-2">
                    <DropdownMenuItem asChild className="rounded-lg">
                      <Link to="/account" className="w-full px-3 py-2">My Account</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="rounded-lg">
                      <Link to="/orders" className="w-full px-3 py-2">My Orders</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="rounded-lg">
                      <Link to="/wishlist" className="w-full px-3 py-2">Wishlist</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-white/30 my-2" />
                    <DropdownMenuItem onClick={signOut} className="w-full px-3 py-2 rounded-lg text-red-600">
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button 
                  onClick={() => setAuthModalOpen(true)} 
                  className="hidden sm:flex h-12 px-6 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 rounded-xl"
                >
                  Sign In
                </Button>
              )}

              {/* Mobile Menu */}
              <Button 
                variant="ghost" 
                size="icon" 
                className="lg:hidden h-12 w-12 bg-white/40 backdrop-blur-xl border border-white/30 hover:bg-white/60 rounded-xl transition-all duration-300" 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>

          {/* Mobile Search Bar */}
          <div className="md:hidden pb-4">
            <form onSubmit={handleSearch}>
              <Card className="border-0 bg-white/40 backdrop-blur-xl shadow-lg">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search products..." 
                    value={searchQuery} 
                    onChange={(e) => setSearchQuery(e.target.value)} 
                    className="h-12 pl-12 bg-transparent border-0 focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </Card>
            </form>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-white/30 bg-white/95 backdrop-blur-xl">
            <div className="container mx-auto px-4 py-4">
              <div className="space-y-2">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = isActiveLink(item.to);
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-lg'
                          : 'text-muted-foreground hover:text-primary hover:bg-white/50'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      {item.label}
                    </Link>
                  );
                })}
                
                {!user && (
                  <Button 
                    onClick={() => {
                      setAuthModalOpen(true);
                      setMobileMenuOpen(false);
                    }}
                    className="w-full mt-4 h-12 bg-gradient-to-r from-primary to-secondary rounded-xl"
                  >
                    Sign In
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Spacer to prevent content from hiding behind fixed header */}
      <div className="h-20 lg:h-28" />

      {/* Auth Modal */}
      <AuthModal 
        open={authModalOpen} 
        onOpenChange={setAuthModalOpen} 
        onAuthSuccess={handleAuthSuccess} 
      />
    </>
  );
};
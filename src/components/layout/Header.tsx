import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ShoppingCart, User, Search, Menu, X, Package, Settings, BarChart3, Users, CreditCard, RotateCcw, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/contexts/AuthContext";
import { useRoles } from "@/hooks/useRoles";
import { AuthModal } from "@/components/auth/AuthModal";
import { TraderApplicationForm } from "@/components/auth/TraderApplicationForm";
import { MobileNav } from "./MobileNav";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import BackgroundRemovalStatus from "@/components/admin/BackgroundRemovalStatus";
import { BackgroundAudioPlayer } from "@/components/audio/BackgroundAudioPlayer";
import { useAudio } from "@/contexts/AudioContext";
import { lockBodyScroll, unlockBodyScroll } from "@/utils/mobileOptimization";
import ozzLogo from "@/assets/ozz-logo-new.jpg";
export const Header = () => {
  const {
    items
  } = useCart();
  const {
    user,
    signOut
  } = useAuth();
  const {
    isAdmin,
    isManager,
    isSuperAdmin
  } = useRoles(user);
  const { markInteraction } = useAudio();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const itemCount = items.reduce((total, item) => total + item.quantity, 0);
  
  // Mark interaction on homepage only to auto-play audio
  useEffect(() => {
    if (location.pathname !== '/') return undefined;

    const handleInteraction = () => {
      markInteraction();
      document.removeEventListener('click', handleInteraction);
    };
    document.addEventListener('click', handleInteraction);
    return () => document.removeEventListener('click', handleInteraction);
  }, [markInteraction, location.pathname]);

  // Lock/unlock body scroll when mobile menu opens/closes
  useEffect(() => {
    if (mobileMenuOpen) {
      lockBodyScroll();
    } else {
      unlockBodyScroll();
    }

    // Cleanup on unmount
    return () => {
      unlockBodyScroll();
    };
  }, [mobileMenuOpen]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleSearch = e => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery)}`);
      setSearchQuery("");
    }
  };
  const handleAuthSuccess = () => {
    setAuthModalOpen(false);
  };
  return <>
      <header className="fixed top-0 left-0 right-0 z-50 w-full border-b border-border/30 bg-white/95 backdrop-blur-md supports-[backdrop-filter]:bg-white/90 transition-all duration-300 shadow-sm">
        <div className="container mx-auto px-2 sm:px-4 lg:px-6 max-w-[100vw]">
          <div className="flex h-12 xs:h-14 sm:h-16 items-center justify-between gap-1 xs:gap-2 sm:gap-4 min-w-0">
            
            {/* Logo - Mobile Optimized */}
            <Link to="/" className="flex items-center flex-shrink-0 min-w-0">
              <img src={ozzLogo} alt="OZZ Cash & Carry" className="h-8 xs:h-10 sm:h-12 md:h-14 lg:h-16 w-auto max-w-[120px] xs:max-w-none" />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-8">
              <Link to="/" className="premium-nav-item">
                Home
              </Link>
              <Link to="/products" className="premium-nav-item">Products</Link>
              <Link to="/categories" className="premium-nav-item">Categories</Link>
              <Link to="/about" className="premium-nav-item">
                About
              </Link>
              <Link to="/contact" className="premium-nav-item">
                Contact
              </Link>
              <Link to="/promotions" className="premium-nav-item">
                Promotions
              </Link>

              {/* Become a Trader Button */}
              <TraderApplicationForm
                trigger={
                  <Button size="sm" className="bg-sale hover:bg-sale-hover text-sale-foreground font-semibold text-xs px-3">
                    <Building2 className="h-3.5 w-3.5 mr-1.5" />
                    Become a Trader
                  </Button>
                }
              />

              {/* Admin/Manager Dropdown */}
              {(isAdmin() || isManager()) && <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                      <Settings className="h-4 w-4 mr-2" />
                      {isManager() && !isAdmin() ? 'Manager' : 'Admin'}
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
                      <Link to="/admin/orders" className="w-full">
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Orders
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/admin/analytics" className="w-full">
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Analytics
                      </Link>
                    </DropdownMenuItem>
                    {/* Manager and Admin features */}
                    {(isManager() || isAdmin()) && <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link to="/admin/returns" className="w-full">
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Returns
                          </Link>
                        </DropdownMenuItem>
                      </>}
                    {/* Admin-only features */}
                    {isAdmin() && <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link to="/admin/products" className="w-full">
                            <Package className="h-4 w-4 mr-2" />
                            Products
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
                      </>}
                    {/* SuperAdmin-only features */}
                    {isSuperAdmin() && <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link to="/admin/users" className="w-full">
                            <Users className="h-4 w-4 mr-2" />
                            Users
                          </Link>
                        </DropdownMenuItem>
                      </>}
                  </DropdownMenuContent>
                </DropdownMenu>}
            </nav>

            {/* Search Bar - Enhanced Mobile Responsive */}
            <form onSubmit={handleSearch} className="hidden sm:flex items-center flex-1 max-w-[200px] sm:max-w-xs lg:max-w-sm mx-1 sm:mx-2 lg:mx-4">
              <div className="relative w-full">
                <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 h-3 sm:h-4 w-3 sm:w-4 text-muted-foreground" />
                <Input placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-7 sm:pl-10 h-8 sm:h-9 lg:h-10 text-xs sm:text-sm border-border/60 bg-background/50 focus:bg-background transition-colors premium-input" />
              </div>
            </form>

            {/* Right Side Actions - Mobile Enhanced */}
            <div className="flex items-center space-x-0.5 xs:space-x-1 sm:space-x-2 flex-shrink-0">
              {/* Background Audio Player */}
              <BackgroundAudioPlayer />
              
              {/* Mobile Search Button */}
              <Button variant="ghost" size="icon" className="sm:hidden h-8 w-8 xs:h-9 xs:w-9 text-muted-foreground hover:text-foreground" onClick={() => navigate('/products')}>
                <Search className="h-3.5 w-3.5 xs:h-4 xs:w-4" />
              </Button>

              {/* Cart - Mobile Enhanced */}
              <Link to="/cart">
                <Button variant="ghost" size="icon" className="relative h-8 w-8 xs:h-9 xs:w-9 sm:h-10 sm:w-10 text-muted-foreground hover:text-foreground">
                  <ShoppingCart className="h-3.5 w-3.5 xs:h-4 xs:w-4 sm:h-5 sm:w-5" />
                  {itemCount > 0 && <Badge variant="destructive" className="absolute -top-0.5 -right-0.5 xs:-top-1 xs:-right-1 sm:-top-2 sm:-right-2 h-3.5 w-3.5 xs:h-4 xs:w-4 sm:h-5 sm:w-5 flex items-center justify-center text-[10px] xs:text-xs px-0 min-w-3.5 xs:min-w-4 sm:min-w-5">
                      {itemCount > 99 ? '99+' : itemCount}
                    </Badge>}
                </Button>
              </Link>

              {/* User Account */}
              {user ? <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 xs:h-9 xs:w-9 sm:h-10 sm:w-10 text-muted-foreground hover:text-foreground">
                      <User className="h-3.5 w-3.5 xs:h-4 xs:w-4 sm:h-5 sm:w-5" />
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
                </DropdownMenu> : <Button variant="outline" size="sm" onClick={() => setAuthModalOpen(true)} className="hidden sm:flex">
                  Sign In
                </Button>}

              {/* Mobile Menu Toggle */}
              <Button variant="ghost" size="icon" className="lg:hidden h-8 w-8 xs:h-9 xs:w-9 sm:h-10 sm:w-10 text-muted-foreground hover:text-foreground" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                {mobileMenuOpen ? <X className="h-3.5 w-3.5 xs:h-4 xs:w-4 sm:h-5 sm:w-5" /> : <Menu className="h-3.5 w-3.5 xs:h-4 xs:w-4 sm:h-5 sm:w-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && <MobileNav user={user} isAdmin={isAdmin() || isManager()} onAuthClick={() => setAuthModalOpen(true)} onSignOut={signOut} onClose={() => setMobileMenuOpen(false)} />}
      </header>

      {/* Auth Modal */}
      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} onAuthSuccess={handleAuthSuccess} />
      
      {/* Background Removal Status */}
      <BackgroundRemovalStatus />
    </>;
};
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, User, Search, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/contexts/AuthContext";
import { AuthModal } from "@/components/auth/AuthModal";

export const Header = () => {
  const { items } = useCart();
  const { user, signOut } = useAuth();
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

  return (
    <div>
      <header style={{ 
        position: 'sticky', 
        top: 0, 
        zIndex: 50, 
        width: '100%', 
        backgroundColor: 'white', 
        borderBottom: '1px solid #e5e7eb',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 16px' }}>
          <div style={{ 
            display: 'flex', 
            height: '64px', 
            alignItems: 'center', 
            justifyContent: 'space-between' 
          }}>
            
            {/* Logo */}
            <Link to="/" style={{ textDecoration: 'none' }}>
              <span style={{ 
                fontSize: '24px', 
                fontWeight: 'bold', 
                color: '#3b82f6' 
              }}>
                IKHAYA Homeware
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav style={{ display: 'none' }} className="lg:flex lg:items-center lg:space-x-8">
              <Link to="/products" style={{ color: '#374151', textDecoration: 'none' }}>
                Products
              </Link>
              <Link to="/categories" style={{ color: '#374151', textDecoration: 'none' }}>
                Categories
              </Link>
              <Link to="/about" style={{ color: '#374151', textDecoration: 'none' }}>
                About
              </Link>
              <Link to="/contact" style={{ color: '#374151', textDecoration: 'none' }}>
                Contact
              </Link>
            </nav>

            {/* Search */}
            <form onSubmit={handleSearch} style={{ display: 'none' }} className="md:block md:flex-1 md:max-w-md md:mx-8">
              <div style={{ position: 'relative' }}>
                <Input 
                  placeholder="Search products..." 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                  style={{ paddingLeft: '40px' }}
                />
                <Search style={{ 
                  position: 'absolute', 
                  left: '12px', 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  width: '16px', 
                  height: '16px', 
                  color: '#9ca3af' 
                }} />
              </div>
            </form>

            {/* Right Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {/* Cart */}
              <Link to="/cart">
                <Button variant="ghost" size="icon" style={{ position: 'relative' }}>
                  <ShoppingCart style={{ width: '20px', height: '20px' }} />
                  {itemCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      style={{ 
                        position: 'absolute', 
                        top: '-8px', 
                        right: '-8px', 
                        minWidth: '20px', 
                        height: '20px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        fontSize: '12px' 
                      }}
                    >
                      {itemCount > 99 ? '99+' : itemCount}
                    </Badge>
                  )}
                </Button>
              </Link>

              {/* User */}
              {user ? (
                <Button variant="ghost" onClick={signOut}>
                  Sign Out
                </Button>
              ) : (
                <Button onClick={() => setAuthModalOpen(true)}>
                  Sign In
                </Button>
              )}

              {/* Mobile Menu */}
              <Button 
                variant="ghost" 
                size="icon" 
                className="lg:hidden" 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X /> : <Menu />}
              </Button>
            </div>
          </div>

          {/* Mobile Search */}
          <div className="md:hidden" style={{ paddingBottom: '16px' }}>
            <form onSubmit={handleSearch}>
              <div style={{ position: 'relative' }}>
                <Input 
                  placeholder="Search products..." 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                  style={{ paddingLeft: '40px' }}
                />
                <Search style={{ 
                  position: 'absolute', 
                  left: '12px', 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  width: '16px', 
                  height: '16px', 
                  color: '#9ca3af' 
                }} />
              </div>
            </form>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden" style={{ borderTop: '1px solid #e5e7eb', padding: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Link to="/products" style={{ color: '#374151', textDecoration: 'none' }}>
                Products
              </Link>
              <Link to="/categories" style={{ color: '#374151', textDecoration: 'none' }}>
                Categories
              </Link>
              <Link to="/about" style={{ color: '#374151', textDecoration: 'none' }}>
                About
              </Link>
              <Link to="/contact" style={{ color: '#374151', textDecoration: 'none' }}>
                Contact
              </Link>
            </div>
          </div>
        )}
      </header>

      <AuthModal 
        open={authModalOpen} 
        onOpenChange={setAuthModalOpen} 
        onAuthSuccess={() => setAuthModalOpen(false)} 
      />
    </div>
  );
};
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
  const cart = useCart();
  const auth = useAuth();
  const navigate = useNavigate();
  
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const items = cart.items || [];
  const user = auth.user;
  const signOut = auth.signOut;

  let itemCount = 0;
  for (let i = 0; i < items.length; i++) {
    itemCount = itemCount + items[i].quantity;
  }

  const handleSearch = function(e) {
    e.preventDefault();
    if (searchQuery && searchQuery.trim()) {
      navigate("/products?search=" + encodeURIComponent(searchQuery));
      setSearchQuery("");
    }
  };

  return (
    <div>
      <header className="sticky top-0 z-50 w-full bg-white border-b">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            
            <Link to="/" className="text-2xl font-bold text-blue-600">
              IKHAYA Homeware
            </Link>

            <nav className="hidden lg:flex items-center space-x-8">
              <Link to="/products" className="text-gray-700 hover:text-blue-600">
                Products
              </Link>
              <Link to="/categories" className="text-gray-700 hover:text-blue-600">
                Categories
              </Link>
              <Link to="/about" className="text-gray-700 hover:text-blue-600">
                About
              </Link>
              <Link to="/contact" className="text-gray-700 hover:text-blue-600">
                Contact
              </Link>
            </nav>

            <form onSubmit={handleSearch} className="hidden md:block flex-1 max-w-md mx-8">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                  placeholder="Search products..." 
                  value={searchQuery} 
                  onChange={function(e) { setSearchQuery(e.target.value); }} 
                  className="pl-10"
                />
              </div>
            </form>

            <div className="flex items-center space-x-4">
              <Link to="/cart">
                <Button variant="ghost" size="icon" className="relative">
                  <ShoppingCart className="h-5 w-5" />
                  {itemCount > 0 && (
                    <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center text-xs">
                      {itemCount > 99 ? "99+" : itemCount}
                    </Badge>
                  )}
                </Button>
              </Link>

              {user ? (
                <Button variant="ghost" onClick={signOut} className="hidden sm:flex">
                  Sign Out
                </Button>
              ) : (
                <Button onClick={function() { setAuthModalOpen(true); }} className="hidden sm:flex">
                  Sign In
                </Button>
              )}

              <Button 
                variant="ghost" 
                size="icon" 
                className="lg:hidden" 
                onClick={function() { setMobileMenuOpen(!mobileMenuOpen); }}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>

          <div className="md:hidden pb-4">
            <form onSubmit={handleSearch}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                  placeholder="Search products..." 
                  value={searchQuery} 
                  onChange={function(e) { setSearchQuery(e.target.value); }} 
                  className="pl-10"
                />
              </div>
            </form>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="lg:hidden border-t bg-white">
            <div className="container mx-auto px-4 py-4">
              <div className="space-y-2">
                <Link to="/products" className="block py-2 text-gray-700">
                  Products
                </Link>
                <Link to="/categories" className="block py-2 text-gray-700">
                  Categories
                </Link>
                <Link to="/about" className="block py-2 text-gray-700">
                  About
                </Link>
                <Link to="/contact" className="block py-2 text-gray-700">
                  Contact
                </Link>
                {!user && (
                  <Button 
                    onClick={function() { 
                      setAuthModalOpen(true);
                      setMobileMenuOpen(false);
                    }}
                    className="w-full mt-4"
                  >
                    Sign In
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      <AuthModal 
        open={authModalOpen} 
        onOpenChange={setAuthModalOpen} 
        onAuthSuccess={function() { setAuthModalOpen(false); }} 
      />
    </div>
  );
};
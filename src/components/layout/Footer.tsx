import { Link } from "react-router-dom";
import { Facebook, Instagram, Twitter, Mail, Phone, MapPin } from "lucide-react";
export const Footer = () => {
  return <footer className="bg-secondary/30 border-t">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                <span className="text-white font-bold text-sm">IH</span>
              </div>
              <span className="font-bold text-lg text-primary">IKHAYA Homeware</span>
            </div>
            <p className="text-muted-foreground text-sm">
              Your home is your sanctuary. We provide quality homeware to make it beautiful, functional, and uniquely yours.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Quick Links</h3>
            <nav className="flex flex-col space-y-2">
              <Link to="/products" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                All Products
              </Link>
              <Link to="/categories" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                Categories
              </Link>
              <Link to="/about" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                About Us
              </Link>
              <Link to="/contact" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                Contact
              </Link>
            </nav>
          </div>

          {/* Customer Service */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Customer Service</h3>
            <nav className="flex flex-col space-y-2">
              <Link to="/shipping" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                Shipping Info
              </Link>
              <Link to="/returns" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                Returns & Exchanges
              </Link>
              <Link to="/faq" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                FAQ
              </Link>
              <Link to="/privacy" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                Privacy Policy
              </Link>
            </nav>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Contact Us</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>123 Home Street, Cape Town, South Africa</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>+27 21 123 4567</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>hello@ikhayahomeware.co.za</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
          <p>© 2024 IKHAYAHomeware. All rights reserved.</p>
        </div>
      </div>
    </footer>;
};
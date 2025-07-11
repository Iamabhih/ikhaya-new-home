import { Link } from "react-router-dom";
import { Facebook, Instagram, Twitter, Mail, Phone, MapPin } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="bg-muted/30 border-t border-border/40">
      <div className="container mx-auto px-4 lg:px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          
          {/* Brand Section */}
          <div className="space-y-6">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">I</span>
              </div>
              <span className="text-xl font-semibold text-foreground">
                IKHAYA Homeware
              </span>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Your home is your sanctuary. We provide quality homeware to make it beautiful, functional, and uniquely yours.
            </p>
            
            {/* Social Links */}
            <div className="flex space-x-4">
              <a 
                href="#" 
                className="w-10 h-10 bg-background border border-border rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                <Facebook className="h-4 w-4" />
              </a>
              <a 
                href="#" 
                className="w-10 h-10 bg-background border border-border rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a 
                href="#" 
                className="w-10 h-10 bg-background border border-border rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                <Twitter className="h-4 w-4" />
              </a>
            </div>

            {/* Partner Logo */}
            <div className="pt-4">
              <img 
                src="https://kauostzhxqoxggwqgtym.supabase.co/storage/v1/object/public/site-images//OZZ-logo-transparent-1-1.png" 
                alt="OZZ Cash & Carry" 
                className="h-30 w-auto"
              />
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Quick Links</h3>
            <div className="space-y-3">
              <Link to="/products" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                All Products
              </Link>
              <Link to="/categories" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                Categories
              </Link>
              <Link to="/about" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                About Us
              </Link>
              <Link to="/contact" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                Contact
              </Link>
            </div>
          </div>

          {/* Customer Service */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Support</h3>
            <div className="space-y-3">
              <Link to="/shipping" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                Shipping Info
              </Link>
              <Link to="/returns" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                Returns & Exchanges
              </Link>
              <Link to="/faq" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                FAQ
              </Link>
              <Link to="/privacy" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                Privacy Policy
              </Link>
            </div>
          </div>

          {/* Store Locations & Contact */}
          <div className="space-y-6">
            <h3 className="font-semibold text-foreground">Our Locations</h3>
            
            {/* OZZ Cash & Carry */}
            <div className="space-y-2">
              <div className="flex items-start space-x-2">
                <MapPin className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                <div>
                  <p className="font-medium text-foreground text-sm">OZZ CASH & CARRY</p>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    40 Mazeppa & Gull Street<br />
                    Durban, KwaZulu-Natal 4001<br />
                    South Africa
                  </p>
                </div>
              </div>
            </div>

            {/* IKHAYA Homestore */}
            <div className="space-y-2">
              <div className="flex items-start space-x-2">
                <MapPin className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                <div>
                  <p className="font-medium text-foreground text-sm">IKHAYA HOMESTORE</p>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Block D, Shop 88 China City<br />
                    Springfield Park, Durban<br />
                    KwaZulu-Natal, South Africa
                  </p>
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-3 pt-2">
              <a 
                href="tel:+27313327192"
                className="flex items-center space-x-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Phone className="h-4 w-4" />
                <span>+27 31 332 7192</span>
              </a>
              <a 
                href="mailto:info@ikhaya.shop"
                className="flex items-center space-x-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Mail className="h-4 w-4" />
                <span>info@ikhaya.shop</span>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-border/40 mt-12 pt-8 text-center">
          <p className="text-sm text-muted-foreground">
            © 2025 IKHAYA Homeware. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
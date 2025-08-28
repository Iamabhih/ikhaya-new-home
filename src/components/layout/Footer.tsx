import { Link } from "react-router-dom";
import { Facebook, Instagram, Mail, Phone, MapPin } from "lucide-react";
export const Footer = () => {
  return <footer className="bg-gradient-to-b from-background to-muted/40 border-t border-primary/20 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-10 right-10 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-10 w-48 h-48 bg-secondary/5 rounded-full blur-2xl" />
      </div>
      <div className="container mx-auto px-4 lg:px-6 py-16 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          
          {/* Brand Section */}
          <div className="space-y-6">
            <div className="flex items-center">
              <img src="/lovable-uploads/6fdda264-ce80-44ec-9836-c9c81756c513.png" alt="IKHAYA Homeware" className="h-26 w-auto" />
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Your home is your sanctuary. We provide quality homeware to make it beautiful, functional, and uniquely yours.
            </p>
            
            {/* Social Links */}
            <div className="flex space-x-4">
              <a href="https://facebook.com/homeware.ikhaya" target="_blank" rel="noopener noreferrer" className="w-10 h-10 glass-card flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-300 hover-lift">
                <Facebook className="h-4 w-4" />
              </a>
              <a href="https://instagram.com/homeware.ikhaya" target="_blank" rel="noopener noreferrer" className="w-10 h-10 glass-card flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-300 hover-lift">
                <Instagram className="h-4 w-4" />
              </a>
              <a href="https://tiktok.com/@ikhayahomestore" target="_blank" rel="noopener noreferrer" className="w-10 h-10 glass-card flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-300 hover-lift">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.321 5.562c-.799-.505-1.338-1.36-1.338-2.349v-.276h-3.275v11.67c0 1.917-1.555 3.473-3.473 3.473s-3.473-1.556-3.473-3.473 1.555-3.473 3.473-3.473c.351 0 .69.053 1.009.151v-3.367c-.316-.042-.641-.064-.969-.064-3.584 0-6.49 2.906-6.49 6.49s2.906 6.491 6.49 6.491 6.49-2.907 6.49-6.491v-5.622c1.417 1.016 3.151 1.614 5.018 1.614v-3.275c-1.206 0-2.306-.42-3.162-1.115-.42-.34-.782-.766-1.05-1.255-.268-.489-.4-1.022-.4-1.555z" />
                </svg>
              </a>
            </div>

            {/* Partner Logo */}
            <div className="pt-4">
              <p className="text-xs text-muted-foreground mb-2">Proudly by</p>
              <img src="https://kauostzhxqoxggwqgtym.supabase.co/storage/v1/object/public/site-images//OZZ-logo-transparent-1-1.png" alt="OZZ Cash & Carry" className="h-28 w-auto" />
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
              <a href="tel:+27313327192" className="flex items-center space-x-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <Phone className="h-4 w-4" />
                <span>+27 31 332 7192</span>
              </a>
              <a href="mailto:info@ikhaya.shop" className="flex items-center space-x-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <Mail className="h-4 w-4" />
                <span>info@ikhayahomeware.online</span>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-border/40 mt-12 pt-8 text-center">
          <p className="text-sm text-muted-foreground">
            © 2025 IKHAYA Homeware by Ozz Cash & Carry. All rights reserved.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Designed and managed by Black Orchid Consulting{" "}
            <a href="https://www.blackorchid.online" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
              www.blackorchid.online
            </a>
          </p>
        </div>
      </div>
    </footer>;
};
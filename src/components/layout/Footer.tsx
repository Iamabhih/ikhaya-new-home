import { Link } from "react-router-dom";
import { Facebook, Instagram, Mail, Phone, MapPin, MessageCircle } from "lucide-react";
export const Footer = () => {
  return (
    <footer className="bg-primary text-primary-foreground relative overflow-hidden">
      {/* Gradient top border */}
      <div className="h-px bg-brand-gradient" />

      {/* Subtle dot pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(hsl(32 80% 50%) 1px, transparent 1px)', backgroundSize: '32px 32px' }}
      />

      <div className="container mx-auto px-4 lg:px-6 py-16 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand Section */}
          <div className="space-y-6 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start">
              <img src="/lovable-uploads/goc-ozz-group.png" alt="OZZ Group of Companies" className="h-32 xs:h-40 sm:h-48 md:h-64 w-auto" />
            </div>
            <div className="space-y-2 text-center md:text-left">
              <p className="text-primary-foreground/90 font-bold text-sm tracking-wide uppercase">Your Trusted</p>
              <p className="text-primary-foreground font-semibold text-sm">Manufacturer - Importer - Distributor</p>
              <p className="text-primary-foreground/50 text-xs leading-relaxed uppercase">
                Glassware • Aluminiumware • Enamelware • Stainless Steelware • Cutlery • Plasticware • Carpets • Artificial Flowers • Homedecor • General Homeware • Hardware
              </p>
            </div>

            {/* Social Links */}
            <div className="flex space-x-4 justify-center md:justify-start">
              <a
                href="https://facebook.com/homeware.ikhaya"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 border border-primary-foreground/20 rounded-full flex items-center justify-center text-primary-foreground/60 hover:bg-secondary hover:border-secondary hover:text-white transition-all duration-300"
              >
                <Facebook className="h-4 w-4" />
              </a>
              <a
                href="https://instagram.com/homeware.ikhaya"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 border border-primary-foreground/20 rounded-full flex items-center justify-center text-primary-foreground/60 hover:bg-secondary hover:border-secondary hover:text-white transition-all duration-300"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a
                href="https://tiktok.com/@ikhayahomestore"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 border border-primary-foreground/20 rounded-full flex items-center justify-center text-primary-foreground/60 hover:bg-secondary hover:border-secondary hover:text-white transition-all duration-300"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.321 5.562c-.799-.505-1.338-1.36-1.338-2.349v-.276h-3.275v11.67c0 1.917-1.555 3.473-3.473 3.473s-3.473-1.556-3.473-3.473 1.555-3.473 3.473-3.473c.351 0 .69.053 1.009.151v-3.367c-.316-.042-.641-.064-.969-.064-3.584 0-6.49 2.906-6.49 6.49s2.906 6.491 6.49 6.491 6.49-2.907 6.49-6.491v-5.622c1.417 1.016 3.151 1.614 5.018 1.614v-3.275c-1.206 0-2.306-.42-3.162-1.115-.42-.34-.782-.766-1.05-1.255-.268-.489-.4-1.022-.4-1.555z" />
                </svg>
              </a>
            </div>

          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="font-semibold text-secondary uppercase tracking-wider text-sm">Quick Links</h3>
            <div className="space-y-3">
              <Link to="/products" className="block text-sm text-primary-foreground/65 hover:text-primary-foreground transition-colors">All Products</Link>
              <Link to="/categories" className="block text-sm text-primary-foreground/65 hover:text-primary-foreground transition-colors">Categories</Link>
              <Link to="/about" className="block text-sm text-primary-foreground/65 hover:text-primary-foreground transition-colors">About Us</Link>
              <Link to="/contact" className="block text-sm text-primary-foreground/65 hover:text-primary-foreground transition-colors">Contact</Link>
              <Link to="/track-order" className="block text-sm text-primary-foreground/65 hover:text-primary-foreground transition-colors">Track Order</Link>
            </div>
          </div>

          {/* Customer Service */}
          <div className="space-y-4">
            <h3 className="font-semibold text-secondary uppercase tracking-wider text-sm">Support</h3>
            <div className="space-y-3">
              <Link to="/shipping" className="block text-sm text-primary-foreground/65 hover:text-primary-foreground transition-colors">Shipping Info</Link>
              <Link to="/returns" className="block text-sm text-primary-foreground/65 hover:text-primary-foreground transition-colors">Returns & Exchanges</Link>
              <Link to="/faq" className="block text-sm text-primary-foreground/65 hover:text-primary-foreground transition-colors">FAQ</Link>
              <Link to="/privacy" className="block text-sm text-primary-foreground/65 hover:text-primary-foreground transition-colors">Privacy Policy</Link>
            </div>
          </div>

          {/* Store Locations & Contact */}
          <div className="space-y-6">
            <h3 className="font-semibold text-secondary uppercase tracking-wider text-sm">Our Locations</h3>

            {/* OZZ Cash & Carry */}
            <div className="space-y-2">
              <div className="flex items-start space-x-2">
                <MapPin className="h-4 w-4 text-primary-foreground/60 mt-1 flex-shrink-0" />
                <div>
                  <p className="font-medium text-primary-foreground text-sm">OZZ CASH & CARRY</p>
                  <p className="text-primary-foreground/65 text-sm leading-relaxed">
                    40 Mazeppa & Gull Street
                    <br />
                    Durban, KwaZulu-Natal 4001
                    <br />
                    South Africa
                  </p>
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-3 pt-2">
              <a href="tel:+27313327192" className="flex items-center space-x-2 text-sm text-primary-foreground/65 hover:text-primary-foreground transition-colors">
                <Phone className="h-4 w-4" />
                <span>+27 31 332 7192</span>
              </a>
              <a href="https://wa.me/27726633544" target="_blank" rel="noopener noreferrer" className="flex items-center space-x-2 text-sm text-primary-foreground/65 hover:text-whatsapp transition-colors">
                <MessageCircle className="h-4 w-4" />
                <span>+27 72 663 3544 (WhatsApp)</span>
              </a>
              <a href="mailto:queries@ozzsa.com" className="flex items-center space-x-2 text-sm text-primary-foreground/65 hover:text-primary-foreground transition-colors">
                <Mail className="h-4 w-4" />
                <span>queries@ozzsa.com</span>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-secondary/20 mt-12 pt-8 text-center">
          <p className="text-sm text-primary-foreground/50">
            © 2025 OZZ Cash & Carry. All rights reserved.
          </p>
          <p className="text-sm text-primary-foreground/50 mt-2">
            Designed and managed by Black Orchid Consulting{" "}
            <a
              href="https://www.blackorchid.online"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary-foreground transition-colors"
            >
              www.blackorchid.online
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
};

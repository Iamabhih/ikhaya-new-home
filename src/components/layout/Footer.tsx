import { Link } from "react-router-dom";
import { Facebook, Instagram, Mail, Phone, MapPin, MessageCircle } from "lucide-react";
export const Footer = () => {
  return (
    <footer className="bg-foreground text-primary-foreground relative overflow-hidden">
      {/* Brand gradient top border */}
      <div className="h-1 bg-brand-gradient" />

      {/* Subtle brand dot pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(hsl(325 80% 60%) 1px, transparent 1px)', backgroundSize: '28px 28px' }}
      />

      {/* Subtle gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-[hsl(280_62%_38%_/_0.08)] pointer-events-none" />

      <div className="container mx-auto px-4 lg:px-6 py-8 sm:py-12 lg:py-16 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10 md:gap-12">
          {/* Brand Section */}
          <div className="space-y-6 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start">
              <img src="/lovable-uploads/goc-ozz-group.png" alt="OZZ Group of Companies" className="h-32 xs:h-40 sm:h-48 md:h-64 w-auto" />
            </div>
            <div className="space-y-2 text-center md:text-left">
              <p className="text-primary-foreground/90 font-bold text-sm tracking-wide uppercase">Your Trusted</p>
              <p className="text-primary-foreground font-semibold text-sm">Manufacturer · Importer · Distributor</p>
              <p className="text-primary-foreground/45 text-xs leading-relaxed uppercase mt-2">
                Glassware · Aluminiumware · Enamelware · Stainless Steelware · Cutlery · Plasticware · Carpets · Artificial Flowers · Homedecor · General Homeware · Hardware
              </p>
            </div>

            {/* Social Links */}
            <div className="flex space-x-3 justify-center md:justify-start">
              <a
                href="https://facebook.com/ozzcashcarry"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="OZZ on Facebook"
                className="w-10 h-10 border border-primary-foreground/20 rounded-full flex items-center justify-center text-primary-foreground/55 hover:bg-secondary hover:border-secondary hover:text-white transition-all duration-300 hover:scale-110"
              >
                <Facebook className="h-4 w-4" />
              </a>
              <a
                href="https://instagram.com/ozzcashandcarry"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="OZZ on Instagram"
                className="w-10 h-10 border border-primary-foreground/20 rounded-full flex items-center justify-center text-primary-foreground/55 hover:bg-secondary hover:border-secondary hover:text-white transition-all duration-300 hover:scale-110"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a
                href="https://tiktok.com/@ozzcashandcarry"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="OZZ on TikTok"
                className="w-10 h-10 border border-primary-foreground/20 rounded-full flex items-center justify-center text-primary-foreground/55 hover:bg-primary hover:border-primary hover:text-white transition-all duration-300 hover:scale-110"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M19.321 5.562c-.799-.505-1.338-1.36-1.338-2.349v-.276h-3.275v11.67c0 1.917-1.555 3.473-3.473 3.473s-3.473-1.556-3.473-3.473 1.555-3.473 3.473-3.473c.351 0 .69.053 1.009.151v-3.367c-.316-.042-.641-.064-.969-.064-3.584 0-6.49 2.906-6.49 6.49s2.906 6.491 6.49 6.491 6.49-2.907 6.49-6.491v-5.622c1.417 1.016 3.151 1.614 5.018 1.614v-3.275c-1.206 0-2.306-.42-3.162-1.115-.42-.34-.782-.766-1.05-1.255-.268-.489-.4-1.022-.4-1.555z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="font-bold text-sm uppercase tracking-wider gradient-text-brand">Quick Links</h3>
            <nav aria-label="Quick links" className="space-y-2.5">
              {[
                { to: '/products',    label: 'All Products' },
                { to: '/categories',  label: 'Categories'   },
                { to: '/about',       label: 'About Us'     },
                { to: '/contact',     label: 'Contact'      },
                { to: '/track-order', label: 'Track Order'  },
                { to: '/promotions',  label: 'Promotions'   },
              ].map(({ to, label }) => (
                <Link key={to} to={to} className="block text-sm text-primary-foreground/60 hover:text-primary-foreground transition-colors duration-200">
                  {label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Customer Service */}
          <div className="space-y-4">
            <h3 className="font-bold text-sm uppercase tracking-wider gradient-text-brand">Support</h3>
            <nav aria-label="Support links" className="space-y-2.5">
              {[
                { to: '/shipping', label: 'Shipping Info'       },
                { to: '/returns',  label: 'Returns & Exchanges' },
                { to: '/faq',      label: 'FAQ'                 },
                { to: '/privacy',  label: 'Privacy Policy'      },
                { to: '/terms',    label: 'Terms of Service'    },
              ].map(({ to, label }) => (
                <Link key={to} to={to} className="block text-sm text-primary-foreground/60 hover:text-primary-foreground transition-colors duration-200">
                  {label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Store Locations & Contact */}
          <div className="space-y-5">
            <h3 className="font-bold text-sm uppercase tracking-wider gradient-text-brand">Our Location</h3>

            <div className="flex items-start space-x-2.5">
              <MapPin className="h-4 w-4 text-secondary mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-primary-foreground text-sm">OZZ CASH &amp; CARRY</p>
                <p className="text-primary-foreground/60 text-sm leading-relaxed mt-0.5">
                  40 Mazeppa &amp; Gull Street<br />
                  Durban, KwaZulu-Natal 4001<br />
                  South Africa
                </p>
              </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-2.5 pt-1">
              <a href="tel:+27313327192" className="flex items-center space-x-2.5 text-sm text-primary-foreground/60 hover:text-primary-foreground transition-colors duration-200 group">
                <Phone className="h-4 w-4 group-hover:text-secondary transition-colors" />
                <span>+27 31 332 7192</span>
              </a>
              <a href="https://wa.me/27726633544" target="_blank" rel="noopener noreferrer" className="flex items-center space-x-2.5 text-sm text-primary-foreground/60 hover:text-whatsapp transition-colors duration-200 group">
                <MessageCircle className="h-4 w-4 group-hover:text-whatsapp transition-colors" />
                <span>+27 72 663 3544 (WhatsApp)</span>
              </a>
              <a href="mailto:queries@ozzsa.com" className="flex items-center space-x-2.5 text-sm text-primary-foreground/60 hover:text-primary-foreground transition-colors duration-200 group">
                <Mail className="h-4 w-4 group-hover:text-secondary transition-colors" />
                <span>queries@ozzsa.com</span>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-10 sm:mt-14 pt-6 sm:pt-8">
          <div style={{ height: '1px', background: 'var(--brand-gradient)', opacity: '0.2', marginBottom: '1.5rem' }} />
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <p className="text-xs text-primary-foreground/45">
              © {new Date().getFullYear()} OZZ Cash &amp; Carry. All rights reserved.
            </p>
            <p className="text-xs text-primary-foreground/45">
              Designed &amp; managed by{" "}
              <a
                href="https://www.blackorchid.online"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary-foreground transition-colors underline-offset-2 hover:underline"
              >
                Black Orchid Consulting
              </a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

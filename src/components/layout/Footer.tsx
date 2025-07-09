import { Link } from "react-router-dom";
import { Facebook, Instagram, Twitter, Mail, Phone, MapPin, Heart, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const Footer = () => {
  return (
    <footer className="bg-gradient-to-br from-primary/5 via-secondary/10 to-background relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-secondary/15 rounded-full blur-3xl animate-pulse" />
      </div>

      <div className="container mx-auto px-4 py-16 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <Card className="border-0 bg-white/10 backdrop-blur-md shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-xl bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                  IKHAYA Homeware
                </span>
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Your home is your sanctuary. We provide quality homeware to make it beautiful, functional, and uniquely yours.
              </p>
              
              {/* Social Links */}
              <div className="flex space-x-3">
                <a 
                  href="#" 
                  className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/20 transition-all duration-300 hover:scale-110"
                >
                  <Facebook className="h-4 w-4" />
                </a>
                <a 
                  href="#" 
                  className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/20 transition-all duration-300 hover:scale-110"
                >
                  <Instagram className="h-4 w-4" />
                </a>
                <a 
                  href="#" 
                  className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/20 transition-all duration-300 hover:scale-110"
                >
                  <Twitter className="h-4 w-4" />
                </a>
              </div>
              
              {/* OZZ Cash & Carry Logo */}
              <div className="pt-4">
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 hover:bg-white/30 transition-all duration-300">
                  <img 
                    src="https://kauostzhxqoxggwqgtym.supabase.co/storage/v1/object/public/site-images//OZZ-logo-transparent-1-1.png" 
                    alt="OZZ Cash & Carry" 
                    className="h-20 w-auto mx-auto hover:scale-105 transition-transform duration-300"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Links */}
          <Card className="border-0 bg-white/10 backdrop-blur-md shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6 space-y-4">
              <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-primary" />
                Quick Links
              </h3>
              <nav className="flex flex-col space-y-3">
                <Link 
                  to="/products" 
                  className="text-muted-foreground hover:text-primary transition-all duration-200 text-sm group flex items-center gap-2"
                >
                  <span className="w-1 h-1 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"></span>
                  All Products
                </Link>
                <Link 
                  to="/categories" 
                  className="text-muted-foreground hover:text-primary transition-all duration-200 text-sm group flex items-center gap-2"
                >
                  <span className="w-1 h-1 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"></span>
                  Categories
                </Link>
                <Link 
                  to="/about" 
                  className="text-muted-foreground hover:text-primary transition-all duration-200 text-sm group flex items-center gap-2"
                >
                  <span className="w-1 h-1 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"></span>
                  About Us
                </Link>
                <Link 
                  to="/contact" 
                  className="text-muted-foreground hover:text-primary transition-all duration-200 text-sm group flex items-center gap-2"
                >
                  <span className="w-1 h-1 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"></span>
                  Contact
                </Link>
              </nav>
            </CardContent>
          </Card>

          {/* Customer Service */}
          <Card className="border-0 bg-white/10 backdrop-blur-md shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6 space-y-4">
              <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                <Heart className="w-4 h-4 text-primary" />
                Customer Service
              </h3>
              <nav className="flex flex-col space-y-3">
                <Link 
                  to="/shipping" 
                  className="text-muted-foreground hover:text-primary transition-all duration-200 text-sm group flex items-center gap-2"
                >
                  <span className="w-1 h-1 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"></span>
                  Shipping Info
                </Link>
                <Link 
                  to="/returns" 
                  className="text-muted-foreground hover:text-primary transition-all duration-200 text-sm group flex items-center gap-2"
                >
                  <span className="w-1 h-1 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"></span>
                  Returns & Exchanges
                </Link>
                <Link 
                  to="/faq" 
                  className="text-muted-foreground hover:text-primary transition-all duration-200 text-sm group flex items-center gap-2"
                >
                  <span className="w-1 h-1 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"></span>
                  FAQ
                </Link>
                <Link 
                  to="/privacy" 
                  className="text-muted-foreground hover:text-primary transition-all duration-200 text-sm group flex items-center gap-2"
                >
                  <span className="w-1 h-1 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"></span>
                  Privacy Policy
                </Link>
              </nav>
            </CardContent>
          </Card>

          {/* Contact Info */}
          <Card className="border-0 bg-white/10 backdrop-blur-md shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6 space-y-4">
              <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                Contact Us
              </h3>
              <div className="space-y-4">
                {/* First Address - OZZ CASH & CARRY */}
                <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 hover:bg-white/30 transition-all duration-300">
                  <div className="flex items-start space-x-2 text-sm">
                    <MapPin className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                    <div>
                      <div className="font-semibold text-foreground">OZZ CASH & CARRY</div>
                      <span className="text-muted-foreground text-xs leading-relaxed">
                        40 Mazeppa & Gull Street, Durban, Kwa-Zulu Natal, 4001, South Africa
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Second Address - IKHAYA HOMESTORE */}
                <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 hover:bg-white/30 transition-all duration-300">
                  <div className="flex items-start space-x-2 text-sm">
                    <MapPin className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                    <div>
                      <div className="font-semibold text-foreground">IKHAYA HOMESTORE</div>
                      <span className="text-muted-foreground text-xs leading-relaxed">
                        Block D, Shop 88 China City, Springfield Park, Durban, Kwa-Zulu Natal, South Africa
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Contact Details */}
                <div className="space-y-2">
                  <a 
                    href="tel:+27313327192"
                    className="flex items-center space-x-2 text-sm text-muted-foreground hover:text-primary transition-colors duration-200 group"
                  >
                    <Phone className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
                    <span>+27 31 332 7192</span>
                  </a>
                  <a 
                    href="mailto:info@ikhaya.shop"
                    className="flex items-center space-x-2 text-sm text-muted-foreground hover:text-primary transition-colors duration-200 group"
                  >
                    <Mail className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
                    <span>info@ikhaya.shop</span>
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Section */}
        <div className="mt-12 pt-8 border-t border-white/20">
          <Card className="border-0 bg-white/10 backdrop-blur-md shadow-lg">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <p className="text-sm text-muted-foreground text-center md:text-left">
                  © 2025 IKHAYA Homeware. All rights reserved.
                </p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Made with</span>
                  <Heart className="w-3 h-3 text-red-500 animate-pulse" />
                  <span>in South Africa</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </footer>
  );
};
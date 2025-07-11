import { Link } from "react-router-dom";
import { Facebook, Instagram, Twitter, Mail, Phone, MapPin } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="bg-gray-50 border-t">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          
          <div className="space-y-4">
            <div className="text-2xl font-bold text-blue-600">
              IKHAYA Homeware
            </div>
            <p className="text-gray-600 text-sm">
              Your home is your sanctuary. We provide quality homeware to make it beautiful, functional, and uniquely yours.
            </p>
            
            <div className="flex space-x-3">
              <a href="#" className="text-gray-400 hover:text-blue-600">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-blue-600">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-blue-600">
                <Twitter className="h-5 w-5" />
              </a>
            </div>

            <div className="pt-4">
              <img 
                src="https://kauostzhxqoxggwqgtym.supabase.co/storage/v1/object/public/site-images//OZZ-logo-transparent-1-1.png" 
                alt="OZZ Cash & Carry" 
                className="h-32 w-auto"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Quick Links</h3>
            <div className="space-y-2">
              <Link to="/products" className="block text-gray-600 hover:text-blue-600 text-sm">
                All Products
              </Link>
              <Link to="/categories" className="block text-gray-600 hover:text-blue-600 text-sm">
                Categories
              </Link>
              <Link to="/about" className="block text-gray-600 hover:text-blue-600 text-sm">
                About Us
              </Link>
              <Link to="/contact" className="block text-gray-600 hover:text-blue-600 text-sm">
                Contact
              </Link>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Customer Service</h3>
            <div className="space-y-2">
              <Link to="/shipping" className="block text-gray-600 hover:text-blue-600 text-sm">
                Shipping Info
              </Link>
              <Link to="/returns" className="block text-gray-600 hover:text-blue-600 text-sm">
                Returns & Exchanges
              </Link>
              <Link to="/faq" className="block text-gray-600 hover:text-blue-600 text-sm">
                FAQ
              </Link>
              <Link to="/privacy" className="block text-gray-600 hover:text-blue-600 text-sm">
                Privacy Policy
              </Link>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Contact Us</h3>
            
            <div className="space-y-4">
              <div className="flex space-x-2">
                <MapPin className="h-4 w-4 text-blue-600 mt-1 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900 text-sm">OZZ CASH & CARRY</p>
                  <p className="text-gray-600 text-sm">
                    40 Mazeppa & Gull Street<br />
                    Durban, KwaZulu-Natal 4001<br />
                    South Africa
                  </p>
                </div>
              </div>

              <div className="flex space-x-2">
                <MapPin className="h-4 w-4 text-blue-600 mt-1 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900 text-sm">IKHAYA HOMESTORE</p>
                  <p className="text-gray-600 text-sm">
                    Block D, Shop 88 China City<br />
                    Springfield Park, Durban<br />
                    KwaZulu-Natal, South Africa
                  </p>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <a 
                  href="tel:+27313327192"
                  className="flex items-center space-x-2 text-gray-600 hover:text-blue-600"
                >
                  <Phone className="h-4 w-4" />
                  <span className="text-sm">+27 31 332 7192</span>
                </a>
                <a 
                  href="mailto:info@ikhaya.shop"
                  className="flex items-center space-x-2 text-gray-600 hover:text-blue-600"
                >
                  <Mail className="h-4 w-4" />
                  <span className="text-sm">info@ikhaya.shop</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 mt-8 pt-8 text-center">
          <p className="text-sm text-gray-500">
            © 2025 IKHAYA Homeware. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
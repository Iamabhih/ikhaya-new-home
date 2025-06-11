import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SecurityProvider } from "@/contexts/SecurityContext";
import { ThemeProvider } from "next-themes";

import Index from "./pages/Index";
import AuthPage from "./pages/AuthPage";
import ProductsPage from "./pages/ProductsPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import OrdersPage from "./pages/OrdersPage";
import AccountPage from "./pages/AccountPage";
import WishlistPage from "./pages/WishlistPage";
import CategoriesPage from "./pages/CategoriesPage";
import CategoryPage from "./pages/CategoryPage";
import ContactPage from "./pages/ContactPage";
import AboutPage from "./pages/AboutPage";
import ShippingPage from "./pages/ShippingPage";
import ReturnsPage from "./pages/ReturnsPage";
import FAQPage from "./pages/FAQPage";
import PrivacyPage from "./pages/PrivacyPage";
import TermsPage from "./pages/TermsPage";
import PaymentSuccess from "./pages/PaymentSuccess";
import ReturnRequestPage from "./pages/ReturnRequestPage";
import NotFound from "./pages/NotFound";

import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminPayments from "./pages/admin/AdminPayments";
import AdminReturns from "./pages/admin/AdminReturns";
import AdminUsers from "./pages/admin/AdminUsers";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SecurityProvider>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <TooltipProvider>
            <Toaster />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/products" element={<ProductsPage />} />
                <Route path="/products/:slug" element={<ProductDetailPage />} />
                <Route path="/categories" element={<CategoriesPage />} />
                <Route path="/categories/:slug" element={<CategoryPage />} />
                <Route path="/category/:slug" element={<CategoryPage />} />
                <Route path="/cart" element={<CartPage />} />
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="/orders" element={<OrdersPage />} />
                <Route path="/account" element={<AccountPage />} />
                <Route path="/wishlist" element={<WishlistPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/shipping" element={<ShippingPage />} />
                <Route path="/returns" element={<ReturnsPage />} />
                <Route path="/faq" element={<FAQPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/payment-success" element={<PaymentSuccess />} />
                <Route path="/return-request" element={<ReturnRequestPage />} />
                
                {/* Admin Routes */}
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                <Route path="/admin/products" element={<AdminProducts />} />
                <Route path="/admin/orders" element={<AdminOrders />} />
                <Route path="/admin/analytics" element={<AdminAnalytics />} />
                <Route path="/admin/payments" element={<AdminPayments />} />
                <Route path="/admin/returns" element={<AdminReturns />} />
                <Route path="/admin/users" element={<AdminUsers />} />
                
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </ThemeProvider>
      </SecurityProvider>
    </QueryClientProvider>
  );
}

export default App;

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SecurityProvider } from "@/contexts/SecurityContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { BrowserCompatibilityChecker } from "@/components/common/BrowserCompatibilityChecker";
import { ConditionalScriptLoader } from "@/components/common/ConditionalScriptLoader";
import { EmergencyLoader } from "@/components/common/EmergencyLoader";
import { MobileSafeComponent } from "@/components/common/MobileSafeComponent";
import Index from "./pages/Index";
import ProductsPage from "./pages/ProductsPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import CategoriesPage from "./pages/CategoriesPage";
import CategoryPage from "./pages/CategoryPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import PaymentSuccess from "./pages/PaymentSuccess";
import AuthPage from "./pages/AuthPage";
import AccountPage from "./pages/AccountPage";
import OrdersPage from "./pages/OrdersPage";
import WishlistPage from "./pages/WishlistPage";
import AboutPage from "./pages/AboutPage";
import ContactPage from "./pages/ContactPage";
import FAQPage from "./pages/FAQPage";
import ShippingPage from "./pages/ShippingPage";
import ReturnsPage from "./pages/ReturnsPage";
import ReturnRequestPage from "./pages/ReturnRequestPage";
import PrivacyPage from "./pages/PrivacyPage";
import TermsPage from "./pages/TermsPage";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminReturns from "./pages/admin/AdminReturns";
import AdminPayments from "./pages/admin/AdminPayments";
import AdminSetupPage from "./pages/admin/AdminSetupPage";
import AdminHomepage from "./pages/admin/AdminHomepage";
import SuperAdminSettings from "./pages/admin/SuperAdminSettings";
import { AdminProtectedRoute } from "./components/admin/AdminProtectedRoute";
import "./App.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: (failureCount, error) => {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        return isMobile ? failureCount < 1 : failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <EmergencyLoader timeout={15000}>
      <BrowserCompatibilityChecker>
        <ConditionalScriptLoader>
          <QueryClientProvider client={queryClient}>
            <SecurityProvider>
              <AuthProvider>
                <TooltipProvider>
                  <Toaster />
                  <BrowserRouter>
                  <MobileSafeComponent name="Router">
                    <Routes>
                      {/* Public routes */}
                      <Route path="/" element={<Index />} />
                      <Route path="/products" element={<ProductsPage />} />
                      <Route path="/products/:slug" element={<ProductDetailPage />} />
                      <Route path="/categories" element={<CategoriesPage />} />
                      <Route path="/categories/:slug" element={<CategoryPage />} />
                      <Route path="/category/:slug" element={<CategoryPage />} />
                      <Route path="/cart" element={<CartPage />} />
                      <Route path="/checkout" element={<CheckoutPage />} />
                      <Route path="/payment/success" element={<PaymentSuccess />} />
                      <Route path="/auth" element={<AuthPage />} />
                      <Route path="/about" element={<AboutPage />} />
                      <Route path="/contact" element={<ContactPage />} />
                      <Route path="/faq" element={<FAQPage />} />
                      <Route path="/shipping" element={<ShippingPage />} />
                      <Route path="/returns" element={<ReturnsPage />} />
                      <Route path="/return-request" element={<ReturnRequestPage />} />
                      <Route path="/privacy" element={<PrivacyPage />} />
                      <Route path="/terms" element={<TermsPage />} />
                      
                      {/* Protected routes */}
                      <Route path="/account" element={<AccountPage />} />
                      <Route path="/orders" element={<OrdersPage />} />
                      <Route path="/wishlist" element={<WishlistPage />} />
                      
                       {/* Admin routes */}
                       <Route path="/admin" element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>} />
                       <Route path="/admin/products" element={<AdminProtectedRoute><AdminProducts /></AdminProtectedRoute>} />
                       <Route path="/admin/orders" element={<AdminProtectedRoute><AdminOrders /></AdminProtectedRoute>} />
                       <Route path="/admin/analytics" element={<AdminProtectedRoute><AdminAnalytics /></AdminProtectedRoute>} />
                       <Route path="/admin/returns" element={<AdminProtectedRoute><AdminReturns /></AdminProtectedRoute>} />
                       <Route path="/admin/payments" element={<AdminProtectedRoute><AdminPayments /></AdminProtectedRoute>} />
                       <Route path="/admin/homepage" element={<AdminProtectedRoute><AdminHomepage /></AdminProtectedRoute>} />
                       
                        {/* SuperAdmin only routes */}
                        <Route path="/admin/users" element={<AdminProtectedRoute requireSuperAdmin={true}><AdminUsers /></AdminProtectedRoute>} />
                        <Route path="/admin/setup" element={<AdminSetupPage />} />
                        <Route path="/superadmin" element={<AdminProtectedRoute requireSuperAdmin={true}><AdminDashboard /></AdminProtectedRoute>} />
                        <Route path="/superadmin/users" element={<AdminProtectedRoute requireSuperAdmin={true}><AdminUsers /></AdminProtectedRoute>} />
                        <Route path="/superadmin/settings" element={<AdminProtectedRoute requireSuperAdmin={true}><SuperAdminSettings /></AdminProtectedRoute>} />
                        <Route path="/superadmin/setup" element={<AdminSetupPage />} />
                      
                      {/* 404 route */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </MobileSafeComponent>
                </BrowserRouter>
              </TooltipProvider>
            </AuthProvider>
          </SecurityProvider>
        </QueryClientProvider>
      </ConditionalScriptLoader>
      </BrowserCompatibilityChecker>
    </EmergencyLoader>
  );
}

export default App;

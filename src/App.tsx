import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SecurityProvider } from "@/contexts/SecurityContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { WishlistProvider } from "@/contexts/WishlistContext";
import { BackgroundRemovalProvider } from "@/contexts/BackgroundRemovalContext";
import { AudioProvider } from "@/contexts/AudioContext";
import { SecurityMonitor } from "@/components/security/SecurityMonitor";
import { AdminProtectedRoute } from "./components/admin/AdminProtectedRoute";
import { AdminLayout } from "./components/admin/AdminLayout";
import { WhatsAppChatWidget } from "@/components/common/WhatsAppChatWidget";
import "./App.css";

// Public pages - loaded immediately
import Index from "./pages/Index";
import ProductsPage from "./pages/ProductsPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import CategoriesPage from "./pages/CategoriesPage";
import CategoryPage from "./pages/CategoryPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import CheckoutSuccessPage from "./pages/CheckoutSuccessPage";
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
import OzzSAPage from "./pages/OzzSAPage";
import PromotionsPage from "./pages/PromotionsPage";
import GuestOrderTrackingPage from "./pages/GuestOrderTrackingPage";
import NotFound from "./pages/NotFound";

// Admin pages - lazy loaded (only downloaded when accessed)
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminProducts = lazy(() => import("./pages/admin/AdminProducts"));
const AdminOrders = lazy(() => import("./pages/admin/AdminOrders"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminAnalytics = lazy(() => import("./pages/admin/AdminAnalytics"));
const AdminReturns = lazy(() => import("./pages/admin/AdminReturns"));
const AdminSetupPage = lazy(() => import("./pages/admin/AdminSetupPage"));
const AdminHomepage = lazy(() => import("./pages/admin/AdminHomepage"));
const AdminPayments = lazy(() => import("./pages/admin/AdminPayments"));
const AdminPaymentSettings = lazy(() => import("./pages/admin/AdminPaymentSettings"));
const AdminSubscriptions = lazy(() => import("./pages/admin/AdminSubscriptions").then(m => ({ default: m.AdminSubscriptions })));
const AdminOrderRecovery = lazy(() => import("./pages/admin/AdminOrderRecovery"));
const SuperAdminSettings = lazy(() => import("./pages/admin/SuperAdminSettings"));
const AdminProduction = lazy(() => import("./pages/admin/AdminProduction"));
const AdminCartAbandonment = lazy(() => import("./pages/admin/AdminCartAbandonment"));
const AdminQuotes = lazy(() => import("./pages/admin/AdminQuotes"));

// Loading fallback for lazy-loaded components
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // Increased from 1 minute to 5 minutes to reduce refetching
      gcTime: 10 * 60 * 1000, // Keep cached data for 10 minutes
      retry: (failureCount, error) => {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        return isMobile ? failureCount < 1 : failureCount < 2;
      },
      refetchOnWindowFocus: false,
      refetchOnReconnect: false, // Prevent refetch on reconnect to reduce connection storms
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SecurityProvider>
        <AuthProvider>
          <WishlistProvider>
            <BackgroundRemovalProvider>
              <AudioProvider>
                <TooltipProvider>
                <Toaster />
                <SecurityMonitor />
                <WhatsAppChatWidget />
                <BrowserRouter>
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
                <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/faq" element={<FAQPage />} />
                <Route path="/shipping" element={<ShippingPage />} />
                <Route path="/returns" element={<ReturnsPage />} />
                <Route path="/return-request" element={<ReturnRequestPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/promotions" element={<PromotionsPage />} />
                <Route path="/track-order" element={<GuestOrderTrackingPage />} />
                <Route path="/ozz-sa" element={<OzzSAPage />} />
                
                {/* Protected routes */}
                <Route path="/account" element={<AccountPage />} />
                <Route path="/orders" element={<OrdersPage />} />
                <Route path="/wishlist" element={<WishlistPage />} />
                
                 {/* Admin routes - lazy loaded */}
                 <Route path="/admin" element={<AdminProtectedRoute allowManager><Suspense fallback={<PageLoader />}><AdminDashboard /></Suspense></AdminProtectedRoute>} />
                 <Route path="/admin/products" element={<AdminProtectedRoute><AdminLayout><Suspense fallback={<PageLoader />}><AdminProducts /></Suspense></AdminLayout></AdminProtectedRoute>} />
                 <Route path="/admin/orders" element={<AdminProtectedRoute allowManager><Suspense fallback={<PageLoader />}><AdminOrders /></Suspense></AdminProtectedRoute>} />
                 <Route path="/admin/analytics" element={<AdminProtectedRoute allowManager><Suspense fallback={<PageLoader />}><AdminAnalytics /></Suspense></AdminProtectedRoute>} />
                 <Route path="/admin/returns" element={<AdminProtectedRoute allowManager><Suspense fallback={<PageLoader />}><AdminReturns /></Suspense></AdminProtectedRoute>} />
                 <Route path="/admin/payments" element={<AdminProtectedRoute><Suspense fallback={<PageLoader />}><AdminPayments /></Suspense></AdminProtectedRoute>} />
                 <Route path="/admin/subscriptions" element={<AdminProtectedRoute><Suspense fallback={<PageLoader />}><AdminSubscriptions /></Suspense></AdminProtectedRoute>} />
                 <Route path="/admin/cart-abandonment" element={<AdminProtectedRoute><Suspense fallback={<PageLoader />}><AdminCartAbandonment /></Suspense></AdminProtectedRoute>} />
                 <Route path="/admin/quotes" element={<AdminProtectedRoute><Suspense fallback={<PageLoader />}><AdminQuotes /></Suspense></AdminProtectedRoute>} />
                 <Route path="/admin/order-recovery" element={<AdminProtectedRoute><Suspense fallback={<PageLoader />}><AdminOrderRecovery /></Suspense></AdminProtectedRoute>} />
                 <Route path="/admin/homepage" element={<AdminProtectedRoute><Suspense fallback={<PageLoader />}><AdminHomepage /></Suspense></AdminProtectedRoute>} />
                 <Route path="/admin/production" element={<AdminProtectedRoute><Suspense fallback={<PageLoader />}><AdminProduction /></Suspense></AdminProtectedRoute>} />

                  {/* SuperAdmin only routes - lazy loaded */}
                  <Route path="/admin/users" element={<AdminProtectedRoute requireSuperAdmin={true}><Suspense fallback={<PageLoader />}><AdminUsers /></Suspense></AdminProtectedRoute>} />
                  <Route path="/admin/payment-settings" element={<AdminProtectedRoute requireSuperAdmin={true}><Suspense fallback={<PageLoader />}><AdminPaymentSettings /></Suspense></AdminProtectedRoute>} />
                  <Route path="/admin/setup" element={<Suspense fallback={<PageLoader />}><AdminSetupPage /></Suspense>} />
                  <Route path="/superadmin" element={<AdminProtectedRoute requireSuperAdmin={true}><Suspense fallback={<PageLoader />}><AdminDashboard /></Suspense></AdminProtectedRoute>} />
                  <Route path="/superadmin/users" element={<AdminProtectedRoute requireSuperAdmin={true}><Suspense fallback={<PageLoader />}><AdminUsers /></Suspense></AdminProtectedRoute>} />
                  <Route path="/superadmin/settings" element={<AdminProtectedRoute requireSuperAdmin={true}><Suspense fallback={<PageLoader />}><SuperAdminSettings /></Suspense></AdminProtectedRoute>} />
                  <Route path="/superadmin/setup" element={<Suspense fallback={<PageLoader />}><AdminSetupPage /></Suspense>} />
                
                {/* 404 route */}
                <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
                </TooltipProvider>
              </AudioProvider>
            </BackgroundRemovalProvider>
          </WishlistProvider>
        </AuthProvider>
      </SecurityProvider>
    </QueryClientProvider>
  );
}

export default App;

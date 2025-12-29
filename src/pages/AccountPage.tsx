import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useWishlist } from "@/hooks/useWishlist";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { User, Package, Heart, Settings, MapPin, Bell } from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { GuestOrderLookup } from "@/components/account/GuestOrderLookup";
import { EditProfileForm } from "@/components/account/EditProfileForm";
import { OrderHistory } from "@/components/account/OrderHistory";
import { AddressBook } from "@/components/account/AddressBook";
import { NotificationSettings } from "@/components/account/NotificationSettings";
import { SEOMeta } from "@/components/seo/SEOMeta";

const AccountPage = () => {
  const { user, loading } = useAuth();
  const { wishlistItems } = useWishlist();
  const [activeTab, setActiveTab] = useState("overview");

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/4" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-32 bg-muted rounded" />
              ))}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: { pathname: "/account" } }} replace />;
  }

  const userMetadata = user.user_metadata;
  const displayName = userMetadata?.first_name 
    ? `${userMetadata.first_name} ${userMetadata.last_name || ''}`.trim()
    : user.email;

  return (
    <div className="min-h-screen bg-background">
      <SEOMeta
        title="My Account"
        description="Manage your account, view orders, update addresses, and configure preferences."
        noIndex
      />
      <Header />
      <main className="container mx-auto px-4 py-8">
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem>
              <BreadcrumbPage>My Account</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Account</h1>
          <p className="text-muted-foreground">Welcome back, {displayName}!</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-6 h-auto gap-2">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Orders</span>
            </TabsTrigger>
            <TabsTrigger value="addresses" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span className="hidden sm:inline">Addresses</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="wishlist" className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              <span className="hidden sm:inline">Wishlist</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setActiveTab("profile")}
              >
                <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Profile</CardTitle>
                  <User className="h-4 w-4 ml-auto" />
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{displayName}</p>
                  <p className="text-xs text-muted-foreground mb-2">{user.email}</p>
                  <p className="text-xs text-muted-foreground">Manage your personal information</p>
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setActiveTab("orders")}
              >
                <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Orders</CardTitle>
                  <Package className="h-4 w-4 ml-auto" />
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">View All</p>
                  <p className="text-xs text-muted-foreground">Track and manage your orders</p>
                </CardContent>
              </Card>

              <Link to="/wishlist">
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Wishlist</CardTitle>
                    <Heart className="h-4 w-4 ml-auto" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{wishlistItems.length}</p>
                    <p className="text-xs text-muted-foreground">Items you've saved for later</p>
                  </CardContent>
                </Card>
              </Link>

              <Card 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setActiveTab("addresses")}
              >
                <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Addresses</CardTitle>
                  <MapPin className="h-4 w-4 ml-auto" />
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground mb-4">Manage your saved addresses</p>
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setActiveTab("notifications")}
              >
                <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Notifications</CardTitle>
                  <Bell className="h-4 w-4 ml-auto" />
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground mb-4">Email preferences and alerts</p>
                </CardContent>
              </Card>
            </div>

            {/* Guest Order Lookup Section */}
            <div className="mt-12 max-w-4xl mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold mb-2">Order Lookup for Guests</h2>
                <p className="text-muted-foreground">
                  Track any order using your email and order number
                </p>
              </div>
              <GuestOrderLookup />
            </div>
          </TabsContent>

          <TabsContent value="profile">
            <EditProfileForm />
          </TabsContent>

          <TabsContent value="orders">
            <OrderHistory />
          </TabsContent>

          <TabsContent value="addresses">
            <AddressBook />
          </TabsContent>

          <TabsContent value="notifications">
            <NotificationSettings />
          </TabsContent>

          <TabsContent value="wishlist">
            <div className="text-center py-8">
              <Heart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Your Wishlist</h3>
              <p className="text-muted-foreground mb-4">
                You have {wishlistItems.length} items in your wishlist
              </p>
              <Link 
                to="/wishlist" 
                className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                View Wishlist
              </Link>
            </div>
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

export default AccountPage;
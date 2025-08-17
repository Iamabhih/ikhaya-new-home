
import { useAuth } from "@/contexts/AuthContext";
import { useWishlist } from "@/hooks/useWishlist";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { User, Package, Heart, Settings } from "lucide-react";
import { Link, Navigate } from "react-router-dom";

const AccountPage = () => {
  const { user, loading } = useAuth();
  const { wishlistItems } = useWishlist();

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
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Profile</CardTitle>
              <User className="h-4 w-4 ml-auto" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{displayName}</p>
              <p className="text-xs text-muted-foreground mb-2">{user.email}</p>
              <p className="text-xs text-muted-foreground">Manage your personal information</p>
              <Button variant="outline" className="w-full mt-4" disabled>
                Edit Profile (Coming Soon)
              </Button>
            </CardContent>
          </Card>

          <Card className="opacity-75">
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Orders</CardTitle>
              <Package className="h-4 w-4 ml-auto" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">0</p>
              <p className="text-xs text-muted-foreground">View your order history</p>
              <Button variant="outline" className="w-full mt-4" disabled>
                View Orders (Coming Soon)
              </Button>
            </CardContent>
          </Card>

          <Link to="/wishlist">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
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

          <Card className="opacity-75">
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Settings</CardTitle>
              <Settings className="h-4 w-4 ml-auto" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-4">Account preferences and settings</p>
              <Button variant="outline" className="w-full" disabled>
                Manage Settings (Coming Soon)
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AccountPage;

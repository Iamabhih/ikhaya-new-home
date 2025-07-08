
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { Truck, Clock, MapPin, Package, Shield, Star } from "lucide-react";

const ShippingPage = () => {
  const shippingOptions = [
    {
      name: "Standard Delivery",
      duration: "3-5 Business Days",
      cost: "R99",
      description: "Our standard shipping option for most areas in South Africa",
      icon: Truck
    },
    {
      name: "Express Delivery",
      duration: "1-2 Business Days",
      cost: "R199",
      description: "Fast delivery for urgent orders to major cities",
      icon: Clock
    },
    {
      name: "Free Shipping",
      duration: "3-5 Business Days",
      cost: "Free",
      description: "Free standard shipping on orders over R1000",
      icon: Star
    }
  ];

  const deliveryAreas = [
    {
      area: "Cape Town Metro",
      duration: "5-7 days",
      coverage: "All areas including suburbs"
    },
    {
      area: "Johannesburg Metro",
      duration: "3-5 days",
      coverage: "Johannesburg, Sandton, Pretoria"
    },
    {
      area: "Durban Metro",
      duration: "2-3 days",
      coverage: "Durban and surrounding areas"
    },
    {
      area: "Other Major Cities",
      duration: "5-7 days",
      coverage: "Port Elizabeth, Bloemfontein, East London"
    },
    {
      area: "Rural Areas",
      duration: "5-7 days",
      coverage: "Remote and rural locations"
    }
  ];

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
              <BreadcrumbPage>Shipping Information</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">Shipping Information</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Fast, reliable delivery across South Africa. We'll get your homeware to you safely and on time.
            </p>
          </div>

          {/* Shipping Options */}
          <div>
            <h2 className="text-2xl font-semibold mb-6">Shipping Options</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {shippingOptions.map((option, index) => (
                <Card key={index} className="relative">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <option.icon className="h-8 w-8 text-primary" />
                      <Badge variant="outline">{option.cost}</Badge>
                    </div>
                    <CardTitle className="text-xl">{option.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{option.duration}</span>
                      </div>
                      <p className="text-muted-foreground">{option.description}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Delivery Areas */}
          <div>
            <h2 className="text-2xl font-semibold mb-6">Delivery Areas & Times</h2>
            <Card>
              <CardContent className="p-0">
                <div className="space-y-0">
                  {deliveryAreas.map((area, index) => (
                    <div key={index} className="flex items-center justify-between p-6 border-b last:border-b-0">
                      <div className="flex items-center gap-3">
                        <MapPin className="h-5 w-5 text-primary" />
                        <div>
                          <h3 className="font-medium">{area.area}</h3>
                          <p className="text-sm text-muted-foreground">{area.coverage}</p>
                        </div>
                      </div>
                      <Badge variant="secondary">{area.duration}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Shipping Policies */}
          <div className="grid md:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Order Processing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Processing Time</h4>
                  <p className="text-sm text-muted-foreground">
                    Orders placed before 2PM on weekdays are processed the same day. 
                    Weekend orders are processed on Monday.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Order Confirmation</h4>
                  <p className="text-sm text-muted-foreground">
                    You'll receive an email confirmation when your order is placed and 
                    another when it ships with tracking information.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Packaging</h4>
                  <p className="text-sm text-muted-foreground">
                    All items are carefully packaged to prevent damage during shipping. 
                    Fragile items receive extra protection.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Delivery Guarantee
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Safe Delivery</h4>
                  <p className="text-sm text-muted-foreground">
                    We guarantee your items will arrive safely. If anything is damaged 
                    during shipping, we'll replace it at no cost.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Tracking</h4>
                  <p className="text-sm text-muted-foreground">
                    All orders include tracking so you can monitor your delivery 
                    progress from dispatch to your door.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Delivery Attempts</h4>
                  <p className="text-sm text-muted-foreground">
                    Our couriers will make up to 3 delivery attempts. If unsuccessful, 
                    packages are held at the local depot for collection.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Important Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Important Shipping Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-2">Address Requirements</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Provide complete physical address (no P.O. Boxes)</li>
                    <li>• Include contact phone number for delivery</li>
                    <li>• Specify any special delivery instructions</li>
                    <li>• Ensure someone is available to receive the package</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Restricted Items</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Some areas may have delivery restrictions</li>
                    <li>• Large furniture may require special arrangements</li>
                    <li>• Certain remote areas may incur additional fees</li>
                    <li>• Public holidays may affect delivery times</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ShippingPage;

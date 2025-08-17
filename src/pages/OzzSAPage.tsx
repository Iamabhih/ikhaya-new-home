import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Phone, Clock, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import ozzLogo from "@/assets/ozz-logo.png";

export default function OzzSAPage() {
  const hours = [
    { day: "Monday", time: "8 am–12:45 pm, 1:45–4:45 pm" },
    { day: "Tuesday", time: "8 am–12:45 pm, 1:45–4:45 pm" },
    { day: "Wednesday", time: "8 am–12:45 pm, 1:45–4:45 pm" },
    { day: "Thursday", time: "8 am–12:45 pm, 1:45–4:45 pm" },
    { day: "Friday", time: "8 am–12:45 pm, 1:45–4:45 pm" },
    { day: "Saturday", time: "8 am–2:30 pm" },
    { day: "Sunday", time: "9 am–2 pm" },
  ];

  return (
    <div className="min-h-screen bg-background pt-16">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <img 
                src={ozzLogo} 
                alt="OZZ Cash and Carry Logo" 
                className="h-24 w-auto"
              />
            </div>
            <h1 className="text-4xl font-bold text-foreground mb-4">OZZ SA</h1>
            <Badge variant="secondary" className="text-lg px-4 py-2">
              The Foundation of Ikhaya
            </Badge>
          </div>

          {/* Hero CTA */}
          <div className="text-center mb-8">
            <Link to="/products">
              <Button size="lg" className="text-lg px-8 py-4 bg-primary hover:bg-primary/90">
                <ShoppingBag className="mr-2 h-5 w-5" />
                SHOP NOW
              </Button>
            </Link>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Contact Information */}
            <Card className="shadow-lg">
              <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
                <CardTitle className="text-xl flex items-center">
                  <MapPin className="mr-2 h-5 w-5" />
                  Visit Our Store
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Address:</h4>
                    <p className="text-muted-foreground">
                      Cnr Mazeppa &, 40 Gull St<br />
                      South Beach, Durban, 4001
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center">
                      <Phone className="mr-2 h-4 w-4" />
                      Phone:
                    </h4>
                    <p className="text-muted-foreground">031 332 7192</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Hours */}
            <Card className="shadow-lg">
              <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
                <CardTitle className="text-xl flex items-center">
                  <Clock className="mr-2 h-5 w-5" />
                  Opening Hours
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-2">
                  {hours.map((schedule) => (
                    <div key={schedule.day} className="flex justify-between">
                      <span className="font-medium">{schedule.day}</span>
                      <span className="text-muted-foreground text-sm">{schedule.time}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* History Section */}
          <Card className="shadow-lg">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
              <CardTitle className="text-2xl text-center">
                Our Heritage: From Ozz Cash and Carry to Ikhaya
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="prose prose-lg max-w-none text-foreground">
                <p className="text-xl leading-relaxed mb-6">
                  For decades, <strong>Ozz Cash and Carry</strong> has been a cornerstone of South African retail, 
                  serving communities with quality products and unwavering commitment to excellence. 
                  What began as a trusted cash-and-carry operation has evolved into something much greater.
                </p>

                <p className="text-lg leading-relaxed mb-6">
                  Today, Ozz Cash and Carry proudly stands as the <strong>founding anchor</strong> of the 
                  <em className="text-primary font-semibold">Ikhaya</em> brand family. The word "Ikhaya" 
                  means "home" in isiZulu and isiXhosa, perfectly capturing our mission to bring 
                  quality products directly to your doorstep.
                </p>

                <div className="bg-muted/50 p-6 rounded-lg mb-6">
                  <h3 className="text-xl font-semibold mb-4 text-primary">Our Evolution</h3>
                  <p className="leading-relaxed">
                    Building on decades of retail expertise and deep community relationships, 
                    Ozz Cash and Carry has transformed its proven business model into the digital age. 
                    Through Ikhaya, we've expanded our reach while maintaining the personal touch 
                    and quality standards that have defined us for generations.
                  </p>
                </div>

                <p className="text-lg leading-relaxed mb-6">
                  The values that built Ozz Cash and Carry—<strong>trust, quality, and community service</strong>—
                  now form the bedrock of everything Ikhaya represents. We're not just an online marketplace; 
                  we're your digital home for authentic South African products, backed by the reliability 
                  and experience that only comes from decades in the business.
                </p>

                <div className="text-center mt-8">
                  <p className="text-xl font-medium text-primary">
                    From our family business to your family home
                  </p>
                  <p className="text-lg text-muted-foreground mt-2">
                    Welcome to Ikhaya—where tradition meets innovation
                  </p>
                  
                  <div className="mt-6">
                    <Link to="/products">
                      <Button size="lg" className="text-lg px-8 py-4">
                        <ShoppingBag className="mr-2 h-5 w-5" />
                        Start Shopping
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
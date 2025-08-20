import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Phone, Clock, ShoppingBag, Star, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import ozzLogo from "@/assets/ozz-logo.png";
export default function OzzSAPage() {
  const hours = [{
    day: "Monday",
    time: "8 am–12:45 pm, 1:45–4:45 pm"
  }, {
    day: "Tuesday",
    time: "8 am–12:45 pm, 1:45–4:45 pm"
  }, {
    day: "Wednesday",
    time: "8 am–12:45 pm, 1:45–4:45 pm"
  }, {
    day: "Thursday",
    time: "8 am–12:45 pm, 1:45–4:45 pm"
  }, {
    day: "Friday",
    time: "8 am–12:45 pm, 1:45–4:45 pm"
  }, {
    day: "Saturday",
    time: "8 am–2:30 pm"
  }, {
    day: "Sunday",
    time: "9 am–2 pm"
  }];
  return <>
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
        {/* Hero Section */}
        <div className="relative overflow-hidden bg-gradient-to-r from-primary/5 via-secondary/5 to-primary/5 py-16">
          <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <div className="relative inline-block mb-8">
                <div className="absolute inset-0 bg-primary/10 rounded-full blur-2xl scale-110"></div>
                <img src={ozzLogo} alt="OZZ Cash and Carry Logo" className="relative h-40 w-auto mx-auto animate-fade-in" />
              </div>
              
              <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent mb-6">
                OZZ Cash & Carry
              </h1>
              
              <div className="flex items-center justify-center gap-2 mb-8">
                <Star className="h-5 w-5 text-primary" />
                <Badge variant="secondary" className="text-lg px-6 py-3 bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
                  The Foundation of Ikhaya
                </Badge>
                <Star className="h-5 w-5 text-primary" />
              </div>

              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Where tradition meets innovation. Your trusted partner for quality products since day one.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/products">
                  <Button size="lg" className="text-lg px-8 py-4 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 shadow-lg hover:shadow-xl transition-all duration-300">
                    <ShoppingBag className="mr-2 h-5 w-5" />
                    SHOP NOW
                  </Button>
                </Link>
                <Link to="/about">
                  <Button variant="outline" size="lg" className="text-lg px-8 py-4 border-primary/30 hover:bg-primary/5">
                    <Heart className="mr-2 h-5 w-5" />
                    Our Story
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-6xl mx-auto">
            
            {/* Store Info Cards */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
              {/* Contact Information */}
              <Card className="group hover:shadow-2xl transition-all duration-300 border-primary/10 hover:border-primary/20 hover:-translate-y-1">
                <CardHeader className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent pb-6">
                  <CardTitle className="text-xl flex items-center text-primary">
                    <div className="p-2 bg-primary/10 rounded-lg mr-3">
                      <MapPin className="h-5 w-5" />
                    </div>
                    Visit Our Store
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2 text-foreground">Address:</h4>
                      <p className="text-muted-foreground leading-relaxed">
                        Cnr Mazeppa &, 40 Gull St<br />
                        South Beach, Durban, 4001
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2 flex items-center text-foreground">
                        <Phone className="mr-2 h-4 w-4 text-primary" />
                        Phone:
                      </h4>
                      <p className="text-muted-foreground font-medium">031 332 7192</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Hours */}
              <Card className="group hover:shadow-2xl transition-all duration-300 border-secondary/10 hover:border-secondary/20 hover:-translate-y-1">
                <CardHeader className="bg-gradient-to-br from-secondary/10 via-secondary/5 to-transparent pb-6">
                  <CardTitle className="text-xl flex items-center text-secondary">
                    <div className="p-2 bg-secondary/10 rounded-lg mr-3">
                      <Clock className="h-5 w-5" />
                    </div>
                    Opening Hours
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    {hours.map(schedule => <div key={schedule.day} className="flex justify-between items-center py-1">
                        <span className="font-medium text-foreground">{schedule.day}</span>
                        <span className="text-muted-foreground text-sm bg-muted/50 px-2 py-1 rounded">
                          {schedule.time}
                        </span>
                      </div>)}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card className="group hover:shadow-2xl transition-all duration-300 border-primary/10 hover:border-primary/20 hover:-translate-y-1 md:col-span-2 lg:col-span-1">
                <CardHeader className="bg-gradient-to-br from-primary/10 via-secondary/5 to-transparent pb-6">
                  <CardTitle className="text-xl flex items-center text-primary">
                    <div className="p-2 bg-primary/10 rounded-lg mr-3">
                      <Star className="h-5 w-5" />
                    </div>
                    Why Choose Us
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      <span className="text-sm font-medium">Decades of Experience</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-secondary rounded-full"></div>
                      <span className="text-sm font-medium">Quality Guaranteed</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      <span className="text-sm font-medium">Community Focused</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-secondary rounded-full"></div>
                      <span className="text-sm font-medium">Trusted Partner</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Heritage Section */}
            <Card className="shadow-2xl border-primary/10 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-primary/10 via-secondary/5 to-primary/10 pb-8">
                <CardTitle className="text-3xl md:text-4xl text-center font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  Our Heritage: From Ozz Cash and Carry to Ikhaya
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 md:p-12">
                <div className="max-w-4xl mx-auto">
                  <div className="text-center mb-12">
                    <p className="text-2xl leading-relaxed text-foreground mb-8">
                      For decades, <strong className="text-primary">Ozz Cash and Carry</strong> has been a cornerstone of South African retail, 
                      serving communities with quality products and unwavering commitment to excellence.
                    </p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-8 mb-12">
                    <div className="space-y-6">
                      <h3 className="text-2xl font-bold text-primary mb-4">Our Foundation</h3>
                      <p className="text-lg leading-relaxed text-muted-foreground">
                        What began as a trusted cash-and-carry operation has evolved into something much greater. 
                        Today, Ozz Cash and Carry proudly stands as the <strong className="text-foreground">founding anchor</strong> of the 
                        <em className="text-primary font-semibold">Ikhaya</em> brand family.
                      </p>
                    </div>
                    
                    <div className="space-y-6">
                      <h3 className="text-2xl font-bold text-secondary mb-4">The Digital Evolution</h3>
                      <p className="text-lg leading-relaxed text-muted-foreground">
                        The word "Ikhaya" means "home" in isiZulu and isiXhosa, perfectly capturing our mission to bring 
                        quality products directly to your doorstep through innovative digital solutions.
                      </p>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-muted/50 via-muted/30 to-muted/50 p-8 rounded-2xl mb-12 border border-primary/10">
                    <h3 className="text-2xl font-bold mb-6 text-center text-primary">Our Evolution Story</h3>
                    <p className="text-lg leading-relaxed text-center text-foreground">Building on decades of Wholesale expertise and deep community relationships, Ozz Cash and Carry has transformed its proven business model into the digital age. Through Ikhaya, we've expanded our reach while maintaining the personal touch and quality standards that have defined us for generations.</p>
                  </div>

                  <div className="text-center bg-gradient-to-r from-primary/5 to-secondary/5 p-8 rounded-2xl">
                    <p className="text-xl font-medium text-primary mb-4">
                      From our family business to your family home
                    </p>
                    <p className="text-lg text-muted-foreground mb-8">
                      Welcome to Ikhaya — <span className="font-semibold text-foreground">Elegant, Affordable, Quality</span>
                    </p>
                    
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                      <Link to="/products">
                        <Button size="lg" className="text-lg px-8 py-4 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 shadow-lg hover:shadow-xl transition-all duration-300">
                          <ShoppingBag className="mr-2 h-5 w-5" />
                          Start Shopping
                        </Button>
                      </Link>
                      <Link to="/about">
                        <Button variant="outline" size="lg" className="text-lg px-8 py-4 border-primary/30 hover:bg-primary/5">
                          Learn More About Us
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
      <Footer />
    </>;
}
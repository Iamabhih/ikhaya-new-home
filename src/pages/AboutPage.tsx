import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { Award, Truck, Shield, Users, Star, Globe } from "lucide-react";

const stats = [
  { value: "30+", label: "Years of Experience" },
  { value: "50k+", label: "Happy Customers" },
  { value: "10k+", label: "Products" },
  { value: "5+", label: "Countries Sourced" },
];

const values = [
  {
    icon: Award,
    title: "Quality First",
    description: "Every product is carefully inspected and selected to meet our high standards before reaching your door.",
  },
  {
    icon: Shield,
    title: "Trusted Supplier",
    description: "As direct manufacturers and importers, we guarantee authenticity and competitive pricing on all items.",
  },
  {
    icon: Truck,
    title: "Nationwide Delivery",
    description: "We ship across South Africa, ensuring your homeware arrives safely and on time, wherever you are.",
  },
  {
    icon: Users,
    title: "Customer Focused",
    description: "Our team is dedicated to providing exceptional service before, during, and after every purchase.",
  },
  {
    icon: Star,
    title: "Premium Selection",
    description: "We curate the finest homeware — glassware, enamelware, stainless steel, carpets, and more.",
  },
  {
    icon: Globe,
    title: "Global Sourcing",
    description: "We source from trusted manufacturers worldwide to bring you the best quality at the best price.",
  },
];

const AboutPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Page Hero */}
      <section className="bg-brand-gradient py-16 sm:py-20 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-10 right-16 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-8 left-12 w-48 h-48 bg-white/5 rounded-full blur-2xl" />
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <Breadcrumb className="mb-5">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/" className="text-white/75 hover:text-white transition-colors">Home</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbItem>
                <BreadcrumbPage className="text-white">About</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="text-center max-w-3xl mx-auto text-white">
            <h1 className="text-4xl sm:text-5xl font-extrabold mb-5 tracking-tight">About OZZ Cash &amp; Carry</h1>
            <p className="text-lg sm:text-xl text-white/90 leading-relaxed">
              Your trusted manufacturer, importer, and distributor of quality homeware products
              across South Africa — for over 30 years.
            </p>
          </div>
        </div>
      </section>

      <main className="container mx-auto px-4 py-12 sm:py-16 -mt-8 relative z-10">

        {/* Stats strip */}
        <div className="bg-card rounded-2xl shadow-premium border border-border/50 p-6 sm:p-8 mb-12 sm:mb-16">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {stats.map(({ value, label }) => (
              <div key={label} className="space-y-1">
                <p className="text-3xl sm:text-4xl font-extrabold gradient-text-brand">{value}</p>
                <p className="text-sm text-muted-foreground font-medium">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Our Story */}
        <div className="max-w-4xl mx-auto mb-14 sm:mb-20">
          <h2 className="text-2xl sm:text-3xl font-bold mb-5 text-foreground">Our Story</h2>
          <div className="space-y-4 text-muted-foreground leading-relaxed text-base sm:text-lg">
            <p>
              Welcome to OZZ Cash &amp; Carry — South Africa&apos;s premier homeware destination. Founded with a passion
              for beautiful, functional living spaces, we have spent more than three decades curating a carefully
              selected collection of home essentials that blend quality with everyday affordability.
            </p>
            <p>
              From kitchen essentials to bedroom comfort, bathroom accessories to decorative accents, we offer
              everything you need to create spaces that truly feel like home. As direct manufacturers and importers,
              we cut out the middleman — bringing you the best quality at competitive prices.
            </p>
          </div>
        </div>

        {/* Our Mission */}
        <div className="section-brand-tint rounded-2xl p-8 sm:p-12 mb-14 sm:mb-20 border border-primary/8">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl font-bold mb-5">Our Mission</h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              To make quality homeware accessible to every South African family — whether you&apos;re furnishing
              your first apartment or renovating your dream home. We believe that beautiful, functional
              home goods shouldn&apos;t be a luxury. They should be part of everyday life.
            </p>
          </div>
        </div>

        {/* Our Values */}
        <div className="mb-14 sm:mb-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">What Sets Us Apart</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              We combine sourcing expertise, product quality, and genuine customer care to deliver an
              unmatched homeware experience.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {values.map(({ icon: Icon, title, description }) => (
              <div key={title} className="card-feature group">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Product Range */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold mb-6">Our Product Range</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              "Glassware & Drinkware",
              "Aluminiumware & Enamelware",
              "Stainless Steelware & Cutlery",
              "Plasticware & Storage",
              "Carpets & Rugs",
              "Artificial Flowers & Decor",
              "General Homeware",
              "Hardware & Tools",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 p-3.5 rounded-xl bg-accent/60 border border-border/40 hover:border-primary/20 transition-colors">
                <div className="w-2 h-2 rounded-full flex-shrink-0 bg-primary" />
                <span className="text-sm font-medium text-foreground">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AboutPage;

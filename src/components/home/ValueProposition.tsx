import { Truck, Shield, Clock, Award } from "lucide-react";

const features = [
  {
    icon: Award,
    title: "Trusted Supplier",
    description: "Manufacturer & Distributor"
  },
  {
    icon: Truck,
    title: "Nationwide Delivery",
    description: "Fast & reliable shipping"
  },
  {
    icon: Shield,
    title: "Quality Assured",
    description: "Premium homeware products"
  },
  {
    icon: Clock,
    title: "24/7 Shopping",
    description: "Shop anytime, anywhere"
  }
];

export const ValueProposition = () => {
  return (
    <section className="border-b border-border/50 bg-background">
      <div className="container mx-auto px-6 sm:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-border/50">
          {features.map((feature, index) => (
            <div
              key={index}
              className="flex items-center gap-3 sm:gap-4 py-5 sm:py-6 px-3 sm:px-6 first:pl-0 last:pr-0"
            >
              <div className="flex-shrink-0">
                <feature.icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" strokeWidth={1.5} />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-sm sm:text-base text-foreground truncate">
                  {feature.title}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

import { Truck, Shield, Clock, Award } from "lucide-react";

const features = [
  {
    icon: Award,
    title: "Trusted Since Day One",
    description: "30+ years in the industry"
  },
  {
    icon: Truck,
    title: "Nationwide Delivery",
    description: "Door-to-door across SA"
  },
  {
    icon: Shield,
    title: "Quality Guaranteed",
    description: "Every piece inspected"
  },
  {
    icon: Clock,
    title: "Shop Online 24/7",
    description: "Browse anytime, anywhere"
  }
];

export const ValueProposition = () => {
  return (
    <section className="border-b border-border/40 bg-white">
      <div className="container mx-auto px-6 sm:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => (
            <div
              key={index}
              className="flex items-center gap-3 sm:gap-4 py-5 sm:py-6 px-4 sm:px-6 border-r border-border/40 last:border-r-0 [&:nth-child(2)]:border-r-0 lg:[&:nth-child(2)]:border-r"
            >
              <div className="flex-shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-muted/60 flex items-center justify-center">
                <feature.icon className="w-4 h-4 sm:w-5 sm:h-5 text-foreground/70" strokeWidth={1.5} />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-xs sm:text-sm text-foreground uppercase tracking-wide truncate">
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

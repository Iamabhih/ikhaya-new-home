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
    <section className="border-b border-border/40 bg-gradient-to-r from-background via-accent/30 to-background">
      <div className="container mx-auto px-6 sm:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group flex items-center gap-3 sm:gap-4 py-6 sm:py-7 px-4 sm:px-6 border-r border-border/40 last:border-r-0 [&:nth-child(2)]:border-r-0 lg:[&:nth-child(2)]:border-r transition-colors duration-300 hover:bg-accent/40"
            >
              <div className="flex-shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-secondary/10 flex items-center justify-center group-hover:bg-secondary/20 transition-colors duration-300">
                <feature.icon className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-secondary" strokeWidth={1.5} />
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

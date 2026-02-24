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
    <section className="border-b border-border/60 bg-gradient-to-r from-background via-accent/30 to-background">
      <div className="container mx-auto px-6 sm:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group flex items-center gap-3 sm:gap-4 py-6 sm:py-8 px-4 sm:px-6 border-r border-border/60 last:border-r-0 [&:nth-child(2)]:border-r-0 lg:[&:nth-child(2)]:border-r border-t-2 border-t-transparent hover:border-t-secondary transition-all duration-300 hover:bg-accent/50"
            >
              <div className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-secondary/20 to-secondary/5 flex items-center justify-center group-hover:from-secondary/30 group-hover:shadow-glow transition-all duration-300">
                <feature.icon className="w-5 h-5 sm:w-6 sm:h-6 text-secondary group-hover:scale-110 transition-transform duration-300" strokeWidth={1.5} />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-sm sm:text-base text-foreground uppercase tracking-wide truncate">
                  {feature.title}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground/80 truncate">
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

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
  const doubled = [...features, ...features];

  return (
    <section className="border-b border-border/60 bg-gradient-to-r from-background via-accent/30 to-background overflow-hidden">
      <div className="flex w-max animate-marquee hover:[animation-play-state:paused]">
        {doubled.map((feature, index) => (
          <div
            key={index}
            className="group flex items-center gap-4 py-5 px-8 border-r border-border/40 flex-shrink-0 transition-colors duration-300 hover:bg-accent/50 cursor-default"
          >
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-secondary/20 to-secondary/5 flex items-center justify-center group-hover:from-secondary/30 group-hover:shadow-glow transition-all duration-300">
              <feature.icon
                className="w-5 h-5 text-secondary group-hover:scale-110 transition-transform duration-300"
                strokeWidth={1.5}
              />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground uppercase tracking-wide whitespace-nowrap">
                {feature.title}
              </h3>
              <p className="text-xs text-muted-foreground/80 whitespace-nowrap">
                {feature.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

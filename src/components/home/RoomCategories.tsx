import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const rooms = [
  {
    title: "Living Room",
    subtitle: "Lounge & Living",
    description:
      "Transform your lounge into a haven of comfort and style with furniture and decor that just make sense. Relax, unwind, and feel at home.",
    tags: ["Couches", "TV Units", "Coffee Tables", "Rugs", "Decor"],
    link: "/categories",
    image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&q=80",
  },
  {
    title: "Bedroom",
    subtitle: "Sleep & Style",
    description:
      "Create your dream bedroom with elegant bed frames, cozy bedding, and storage that keeps everything in its place. Your personal sanctuary starts here.",
    tags: ["Beds", "Mattresses", "Pedestals", "Cupboards", "Lamps"],
    link: "/categories",
    image: "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=800&q=80",
  },
  {
    title: "Kitchen & Dining",
    subtitle: "Cook & Gather",
    description:
      "Rediscover the heart of your home with smart kitchen solutions that blend style, function, and ease. Cook, gather, and create in comfort.",
    tags: ["Dining Tables", "Chairs", "Stools", "Sideboards", "Glassware"],
    link: "/categories",
    image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80",
  },
];

export const RoomCategories = () => {
  return (
    <section className="py-16 sm:py-20 lg:py-24 bg-white">
      <div className="container mx-auto px-6 sm:px-8">
        {/* Section Header */}
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-3">
            Shop by Room
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base max-w-lg mx-auto">
            Find the perfect furniture for every space in your home
          </p>
        </div>

        {/* Room Cards */}
        <div className="space-y-8 sm:space-y-0 sm:grid sm:grid-cols-3 sm:gap-6 lg:gap-8">
          {rooms.map((room, index) => (
            <Link
              key={index}
              to={room.link}
              className="group block"
            >
              {/* Image */}
              <div className="relative aspect-[4/5] overflow-hidden mb-5">
                <img
                  src={room.image}
                  alt={room.title}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  loading="lazy"
                />
                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-500" />

                {/* Tag overlay at bottom */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
                  <div className="flex flex-wrap gap-2">
                    {room.tags.slice(0, 4).map((tag, i) => (
                      <span
                        key={i}
                        className="text-[10px] sm:text-xs text-white/90 bg-white/20 backdrop-blur-sm px-2 py-1 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Content */}
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
                  {room.subtitle}
                </p>
                <h3 className="text-lg sm:text-xl font-bold text-foreground mb-2 group-hover:text-secondary transition-colors">
                  {room.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  {room.description}
                </p>
                <span className="inline-flex items-center text-sm font-medium text-foreground group-hover:text-secondary transition-colors">
                  Shop {room.title}
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

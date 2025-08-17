import { Card } from "@/components/ui/card";

interface ResponsiveGridProps {
  children: React.ReactNode;
  variant?: "compact" | "standard" | "comfortable";
  className?: string;
}

export const ResponsiveGrid = ({ 
  children, 
  variant = "standard",
  className = "" 
}: ResponsiveGridProps) => {
  const getGridClasses = () => {
    switch (variant) {
      case "compact":
        return "grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-1 xs:gap-2 sm:gap-3";
      case "comfortable":
        return "grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-4 xs:gap-6 sm:gap-8";
      default:
        return "grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 xs:gap-3 sm:gap-4 md:gap-6";
    }
  };

  return (
    <div className={`${getGridClasses()} ${className}`}>
      {children}
    </div>
  );
};

interface ResponsiveContainerProps {
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  className?: string;
}

export const ResponsiveContainer = ({ 
  children, 
  maxWidth = "full",
  className = "" 
}: ResponsiveContainerProps) => {
  const getMaxWidthClass = () => {
    switch (maxWidth) {
      case "sm": return "max-w-screen-sm";
      case "md": return "max-w-screen-md"; 
      case "lg": return "max-w-screen-lg";
      case "xl": return "max-w-screen-xl";
      case "2xl": return "max-w-screen-2xl";
      default: return "";
    }
  };

  return (
    <div className={`container mx-auto px-4 ${getMaxWidthClass()} ${className}`}>
      {children}
    </div>
  );
};

interface AspectRatioBoxProps {
  children: React.ReactNode;
  ratio?: "square" | "video" | "photo" | "portrait";
  className?: string;
}

export const AspectRatioBox = ({ 
  children, 
  ratio = "square",
  className = "" 
}: AspectRatioBoxProps) => {
  const getRatioClass = () => {
    switch (ratio) {
      case "video": return "aspect-video";
      case "photo": return "aspect-[4/3]";
      case "portrait": return "aspect-[3/4]";
      default: return "aspect-square";
    }
  };

  return (
    <div className={`${getRatioClass()} ${className}`}>
      {children}
    </div>
  );
};
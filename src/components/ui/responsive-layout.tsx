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
        return "responsive-grid-compact";
      case "comfortable":
        return "responsive-grid-comfortable";
      default:
        return "responsive-grid-standard";
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
    <div className={`container mx-auto px-3 sm:px-4 ${getMaxWidthClass()} ${className}`}>
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

import { UniversalLoading } from "@/components/ui/universal-loading";

interface LoadingSpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  text?: string;
}

export const LoadingSpinner = ({ className = "", size = "md", text }: LoadingSpinnerProps) => {
  return (
    <UniversalLoading 
      variant="spinner" 
      size={size} 
      text={text}
      className={className}
    />
  );
};

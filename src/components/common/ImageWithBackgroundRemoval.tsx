import { useState } from "react";
import { EnhancedBackgroundRemover } from "@/components/admin/EnhancedBackgroundRemover";

interface ImageWithBackgroundRemovalProps {
  onProcessed?: (blob: Blob) => void;
  className?: string;
}

export const ImageWithBackgroundRemoval = ({ onProcessed, className }: ImageWithBackgroundRemovalProps) => {
  return <EnhancedBackgroundRemover onProcessed={onProcessed} className={className} />;
};

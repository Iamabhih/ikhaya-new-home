import React from 'react';

interface EnhancedBackgroundRemoverProps {
  imageUrl: string;
  onProcessed?: (processedUrl: string) => void;
  className?: string;
}

export const EnhancedBackgroundRemover: React.FC<EnhancedBackgroundRemoverProps> = ({
  imageUrl,
  className
}) => {
  return (
    <img src={imageUrl} alt="" className={className} />
  );
};

export default EnhancedBackgroundRemover;

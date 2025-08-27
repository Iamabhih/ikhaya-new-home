import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download } from 'lucide-react';

interface PDFPreviewProps {
  fileUrl: string;
  fileName?: string;
  className?: string;
  width?: number;
  height?: number;
}

export const PDFPreview = ({ 
  fileUrl, 
  fileName = "Document", 
  className = "", 
  width = 200,
  height = 280 
}: PDFPreviewProps) => {
  
  // Check if file is PDF
  const isPDF = fileUrl.toLowerCase().includes('.pdf') || fileName.toLowerCase().includes('.pdf');

  const handleDownload = () => {
    window.open(fileUrl, '_blank');
  };

  if (!isPDF) {
    return (
      <Card className={`${className} flex items-center justify-center bg-muted/20`} style={{ width, height }}>
        <CardContent className="flex flex-col items-center justify-center p-4 text-center">
          <FileText className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-xs text-muted-foreground">Preview not available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${className} flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100 border-red-200`} style={{ width, height }}>
      <CardContent className="flex flex-col items-center justify-center p-4 text-center space-y-3">
        <FileText className="h-12 w-12 text-red-600" />
        <div>
          <p className="text-sm font-medium text-gray-900 mb-1">PDF Document</p>
          <p className="text-xs text-gray-600 truncate max-w-[160px]" title={fileName}>
            {fileName}
          </p>
        </div>
        <Button
          onClick={handleDownload}
          size="sm"
          className="bg-red-600 hover:bg-red-700 text-white"
        >
          <Download className="h-3 w-3 mr-1" />
          View PDF
        </Button>
      </CardContent>
    </Card>
  );
};
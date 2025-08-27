import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Card, CardContent } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { FileText, AlertCircle } from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set up PDF.js worker with fallbacks
try {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
} catch (error) {
  console.error('Failed to set PDF.js worker:', error);
  // Fallback to unpkg
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
}

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
  const [numPages, setNumPages] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
    setError(null);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('PDF load error:', error);
    console.error('PDF URL:', fileUrl);
    setError('PDF preview unavailable');
    setLoading(false);
  };

  // Check if file is PDF
  const isPDF = fileUrl.toLowerCase().includes('.pdf') || fileName.toLowerCase().includes('.pdf');

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

  if (error) {
    return (
      <Card className={`${className} flex items-center justify-center bg-muted/20`} style={{ width, height }}>
        <CardContent className="flex flex-col items-center justify-center p-4 text-center">
          <AlertCircle className="h-8 w-8 text-destructive mb-2" />
          <p className="text-xs text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${className} overflow-hidden bg-white`} style={{ width, height }}>
      <CardContent className="p-0 h-full flex items-center justify-center">
        {loading && (
          <div className="flex flex-col items-center justify-center h-full">
            <LoadingSpinner className="h-6 w-6 mb-2" />
            <p className="text-xs text-muted-foreground">Loading preview...</p>
          </div>
        )}
        
        <Document
          file={fileUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={null}
          error={null}
          className="flex items-center justify-center h-full"
        >
          <Page
            pageNumber={1}
            width={width - 20} // Account for padding
            renderTextLayer={false}
            renderAnnotationLayer={false}
            className="shadow-sm"
          />
        </Document>
        
        {numPages > 1 && !loading && (
          <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
            {numPages} pages
          </div>
        )}
      </CardContent>
    </Card>
  );
};
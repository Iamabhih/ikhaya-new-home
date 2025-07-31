import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  Upload, 
  FileSpreadsheet, 
  AlertCircle, 
  Download, 
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  FolderOpen,
  Image as ImageIcon
} from "lucide-react";
import { ImportProgressTracker } from './ImportProgressTracker';
import { ProductImageUploader } from './ProductImageUploader';

interface ExcelPreview {
  preview: Array<{
    sheetName: string;
    categoryName: string;
    productCount: number;
    headers: string[];
    sampleProducts: any[];
  }>;
  totalSheets: number;
  totalProducts: number;
}

interface ImportResult {
  importId: string;
  results: {
    total: number;
    successful: number;
    failed: number;
    sheets: number;
    errors: Array<{ sheet?: string; row?: number; error: string }>;
  };
}

export const ExcelProductImport = () => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<ExcelPreview | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [activeImportId, setActiveImportId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("import");

  // Fetch import history
  const { data: importHistory, refetch: refetchHistory } = useQuery({
    queryKey: ['excel-import-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_imports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data;
    }
  });

  // Preview mutation
  const previewMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('action', 'preview');

      const { data, error } = await supabase.functions.invoke('import-excel-products', {
        body: formData
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setPreviewData(data);
      toast.success(`Preview loaded: ${data.totalSheets} sheets with ${data.totalProducts} products`);
    },
    onError: (error: any) => {
      console.error('Preview error:', error);
      toast.error(`Preview failed: ${error.message}`);
    }
  });

  // Import mutation
  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('action', 'import');

      const { data, error } = await supabase.functions.invoke('import-excel-products', {
        body: formData
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setImportResult(data);
      setActiveImportId(data.importId);
      refetchHistory();
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(`Import completed: ${data.results.successful} products imported from ${data.results.sheets} sheets`);
    },
    onError: (error: any) => {
      console.error('Import error:', error);
      toast.error(`Import failed: ${error.message}`);
    }
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        toast.error('Please select a valid Excel file (.xlsx or .xls)');
        return;
      }

      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error('File size must be less than 10MB');
        return;
      }

      setSelectedFile(file);
      setPreviewData(null);
      setImportResult(null);
      toast.info('Excel file selected. Click Preview to analyze sheets.');
    }
  };

  const handlePreview = () => {
    if (selectedFile) {
      previewMutation.mutate(selectedFile);
    }
  };

  const handleImport = () => {
    if (selectedFile && previewData) {
      importMutation.mutate(selectedFile);
    }
  };

  const downloadTemplate = () => {
    // Create a simple Excel template structure
    const templateData = {
      'Category 1': [
        ['name', 'description', 'price', 'sku', 'stock_quantity', 'is_featured'],
        ['Sample Product 1', 'Product description', '99.99', 'SKU001', '10', 'false'],
        ['Sample Product 2', 'Product description', '149.99', 'SKU002', '5', 'true']
      ],
      'Category 2': [
        ['name', 'description', 'price', 'sku', 'stock_quantity', 'is_featured'],
        ['Sample Product 3', 'Product description', '199.99', 'SKU003', '8', 'false']
      ]
    };

    // Note: This is a simplified template. In a real implementation,
    // you would use a library like XLSX to generate a proper Excel file
    const csvContent = Object.entries(templateData)
      .map(([sheetName, rows]) => `Sheet: ${sheetName}\n${rows.map(row => row.join(',')).join('\n')}`)
      .join('\n\n');
    
    const blob = new Blob([csvContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'excel-import-template.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetForm = () => {
    setSelectedFile(null);
    setPreviewData(null);
    setImportResult(null);
    setActiveImportId(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Excel Product Import</h2>
          <p className="text-muted-foreground">
            Import products from Excel files with categories as sheets
          </p>
        </div>
        <Button variant="outline" onClick={downloadTemplate}>
          <Download className="w-4 h-4 mr-2" />
          Download Template
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="import">Import Products</TabsTrigger>
          <TabsTrigger value="images">Upload Images</TabsTrigger>
          <TabsTrigger value="history">Import History</TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="space-y-6">
          {/* File Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5" />
                Upload Excel File
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="excel-file">Select Excel File (.xlsx)</Label>
                  <Input
                    ref={fileInputRef}
                    id="excel-file"
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileSelect}
                    className="mt-1"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Each sheet represents a category. Sheet names will be used as category names.
                  </p>
                </div>

                {selectedFile && (
                  <Alert>
                    <FileSpreadsheet className="w-4 h-4" />
                    <AlertDescription>
                      Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-2">
                  <Button 
                    onClick={handlePreview}
                    disabled={!selectedFile || previewMutation.isPending}
                    variant="outline"
                  >
                    {previewMutation.isPending ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <FolderOpen className="w-4 h-4 mr-2" />
                    )}
                    Preview Sheets
                  </Button>

                  <Button 
                    onClick={handleImport}
                    disabled={!previewData || importMutation.isPending}
                  >
                    {importMutation.isPending ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    Import Products
                  </Button>

                  <Button variant="outline" onClick={resetForm}>
                    Reset
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preview Section */}
          {previewData && (
            <Card>
              <CardHeader>
                <CardTitle>Excel Preview</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {previewData.totalSheets} sheets with {previewData.totalProducts} total products
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {previewData.preview.map((sheet, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-semibold">{sheet.sheetName}</h4>
                          <p className="text-sm text-muted-foreground">
                            Will create/use category: <Badge variant="outline">{sheet.categoryName}</Badge>
                          </p>
                        </div>
                        <Badge>{sheet.productCount} products</Badge>
                      </div>
                      
                      <div className="text-sm mb-2">
                        <strong>Headers:</strong> {sheet.headers.join(', ')}
                      </div>
                      
                      {sheet.sampleProducts.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2">Sample Products:</p>
                          <div className="bg-muted p-2 rounded text-xs">
                            {sheet.sampleProducts.map((product, idx) => (
                              <div key={idx}>
                                {product.name || product.Name || 'Unnamed Product'} - 
                                {product.price || product.Price || 'No Price'} - 
                                {product.sku || product.SKU || 'No SKU'}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Import Progress */}
          {activeImportId && (
            <ImportProgressTracker
              importId={activeImportId}
              onComplete={() => {
                setActiveImportId(null);
                refetchHistory();
              }}
              onError={() => setActiveImportId(null)}
            />
          )}

          {/* Import Results */}
          {importResult && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  Import Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{importResult.results.successful}</div>
                    <div className="text-sm text-muted-foreground">Successful</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{importResult.results.failed}</div>
                    <div className="text-sm text-muted-foreground">Failed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{importResult.results.sheets}</div>
                    <div className="text-sm text-muted-foreground">Sheets</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{importResult.results.total}</div>
                    <div className="text-sm text-muted-foreground">Total</div>
                  </div>
                </div>

                {importResult.results.errors.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Errors:</h4>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {importResult.results.errors.map((error, index) => (
                        <div key={index} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                          {error.sheet && `Sheet: ${error.sheet} - `}
                          {error.row && `Row: ${error.row} - `}
                          {error.error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="images">
          <ProductImageUploader />
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Import History</CardTitle>
            </CardHeader>
            <CardContent>
              {importHistory && importHistory.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Products</TableHead>
                      <TableHead>Success Rate</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importHistory.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.filename}</TableCell>
                        <TableCell>
                          <Badge variant={
                            record.status === 'completed' ? 'default' :
                            record.status === 'failed' ? 'destructive' :
                            record.status === 'processing' ? 'secondary' : 'outline'
                          }>
                            {record.status === 'processing' ? (
                              <Clock className="w-3 h-3 mr-1" />
                            ) : record.status === 'completed' ? (
                              <CheckCircle className="w-3 h-3 mr-1" />
                            ) : record.status === 'failed' ? (
                              <XCircle className="w-3 h-3 mr-1" />
                            ) : null}
                            {record.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{record.total_rows}</TableCell>
                        <TableCell>
                          {record.total_rows > 0 ? 
                            `${Math.round((record.successful_rows / record.total_rows) * 100)}%` : 
                            'N/A'
                          }
                        </TableCell>
                        <TableCell>
                          {new Date(record.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No import history found
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
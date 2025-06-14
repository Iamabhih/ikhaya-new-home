
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Upload, FileText, AlertCircle, CheckCircle, Download } from "lucide-react";

interface ImportPreview {
  preview: any[];
  totalRows: number;
  headers: string[];
}

interface ImportResult {
  importId: string;
  results: {
    total: number;
    successful: number;
    failed: number;
    errors: Array<{ row: number; error: string }>;
  };
}

export const ProductImport = () => {
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch import history
  const { data: imports = [], isLoading: importsLoading } = useQuery({
    queryKey: ['product-imports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_imports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  const previewMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('action', 'preview');

      const { data, error } = await supabase.functions.invoke('import-products', {
        body: formData,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setPreview(data);
      toast.success('CSV preview loaded successfully');
    },
    onError: (error: any) => {
      toast.error(`Preview failed: ${error.message}`);
      console.error('Preview error:', error);
    },
  });

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('action', 'import');

      const { data, error } = await supabase.functions.invoke('import-products', {
        body: formData,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setImportResult(data);
      setIsProcessing(false);
      queryClient.invalidateQueries({ queryKey: ['product-imports'] });
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success(`Import completed: ${data.results.successful} products imported successfully`);
    },
    onError: (error: any) => {
      setIsProcessing(false);
      toast.error(`Import failed: ${error.message}`);
      console.error('Import error:', error);
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        toast.error('Please select a CSV file');
        return;
      }
      setSelectedFile(file);
      setPreview(null);
      setImportResult(null);
    }
  };

  const handlePreview = () => {
    if (selectedFile) {
      previewMutation.mutate(selectedFile);
    }
  };

  const handleImport = () => {
    if (selectedFile) {
      setIsProcessing(true);
      importMutation.mutate(selectedFile);
    }
  };

  const downloadTemplate = () => {
    const template = 'name,sku,price,description,short_description,category,stock_quantity,compare_at_price,is_active,is_featured\n"Sample Product","SKU123",29.99,"Product description","Short description","Electronics",100,39.99,true,false';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'product_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Products from CSV
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button onClick={downloadTemplate} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
            <div className="text-sm text-muted-foreground">
              Download a sample CSV template to see the expected format
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="csv-file">Select CSV File</Label>
              <Input
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="mt-1"
              />
            </div>

            {selectedFile && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span className="text-sm">{selectedFile.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <Button 
                  onClick={handlePreview}
                  disabled={previewMutation.isPending}
                  variant="outline"
                  size="sm"
                >
                  {previewMutation.isPending ? 'Loading...' : 'Preview'}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Preview Section */}
      {preview && (
        <Card>
          <CardHeader>
            <CardTitle>Preview ({preview.totalRows} rows total)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {preview.headers.map((header) => (
                        <TableHead key={header}>{header}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.preview.map((row, index) => (
                      <TableRow key={index}>
                        {preview.headers.map((header) => (
                          <TableCell key={header} className="max-w-32 truncate">
                            {row[header] || '-'}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                  Showing first 5 rows of {preview.totalRows} total rows
                </div>
                <Button 
                  onClick={handleImport}
                  disabled={isProcessing || importMutation.isPending}
                >
                  {isProcessing ? 'Importing...' : `Import ${preview.totalRows} Products`}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Processing Status */}
      {isProcessing && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                <span>Processing import...</span>
              </div>
              <Progress value={undefined} className="w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import Results */}
      {importResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Import Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {importResult.results.successful}
                  </div>
                  <div className="text-sm text-muted-foreground">Successful</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {importResult.results.failed}
                  </div>
                  <div className="text-sm text-muted-foreground">Failed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {importResult.results.total}
                  </div>
                  <div className="text-sm text-muted-foreground">Total</div>
                </div>
              </div>

              {importResult.results.errors.length > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <div className="font-medium">Import Errors:</div>
                      {importResult.results.errors.slice(0, 5).map((error, index) => (
                        <div key={index} className="text-sm">
                          Row {error.row}: {error.error}
                        </div>
                      ))}
                      {importResult.results.errors.length > 5 && (
                        <div className="text-sm text-muted-foreground">
                          And {importResult.results.errors.length - 5} more errors...
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Imports</CardTitle>
        </CardHeader>
        <CardContent>
          {importsLoading ? (
            <div className="text-center py-4">Loading...</div>
          ) : imports.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No imports yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Filename</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Successful</TableHead>
                    <TableHead>Failed</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {imports.map((importRecord) => (
                    <TableRow key={importRecord.id}>
                      <TableCell>{importRecord.filename}</TableCell>
                      <TableCell>
                        <Badge variant={
                          importRecord.status === 'completed' ? 'default' :
                          importRecord.status === 'failed' ? 'destructive' :
                          importRecord.status === 'processing' ? 'secondary' : 'outline'
                        }>
                          {importRecord.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{importRecord.total_rows}</TableCell>
                      <TableCell>{importRecord.successful_rows}</TableCell>
                      <TableCell>{importRecord.failed_rows}</TableCell>
                      <TableCell>
                        {new Date(importRecord.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

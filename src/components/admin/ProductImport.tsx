
import { useState, useRef, useMemo } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { 
  Upload, 
  FileText, 
  AlertCircle, 
  Download, 
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Settings,
  Search,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { ImportProgressTracker } from './ImportProgressTracker';

interface ImportPreview {
  preview: any[];
  allData: any[];
  totalRows: number;
  headers: string[];
  validationWarnings: Array<{
    row: number;
    field: string;
    warning: string;
  }>;
}

interface ImportSettings {
  skipDuplicates: boolean;
  updateExisting: boolean;
  validateCategories: boolean;
  createMissingCategories: boolean;
  requiredFields: string[];
}

export const ProductImport = () => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [allData, setAllData] = useState<any[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [activeImportId, setActiveImportId] = useState<string | null>(null);
  const [importSettings, setImportSettings] = useState<ImportSettings>({
    skipDuplicates: true,
    updateExisting: false,
    validateCategories: true,
    createMissingCategories: true,
    requiredFields: ['name', 'price']
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch import history
  const { data: imports = [], isLoading: importsLoading, refetch: refetchImports } = useQuery({
    queryKey: ['product-imports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_imports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  // Filter data based on search query
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return allData;
    const query = searchQuery.toLowerCase();
    return allData.filter((row) => {
      return Object.values(row).some(value => 
        String(value).toLowerCase().includes(query)
      );
    });
  }, [allData, searchQuery]);

  // Get original indices for filtered data
  const filteredIndices = useMemo(() => {
    if (!searchQuery.trim()) return allData.map((_, i) => i);
    const query = searchQuery.toLowerCase();
    return allData.map((row, index) => {
      const matches = Object.values(row).some(value => 
        String(value).toLowerCase().includes(query)
      );
      return matches ? index : -1;
    }).filter(i => i !== -1);
  }, [allData, searchQuery]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Get original index for a paginated row
  const getOriginalIndex = (pageIndex: number) => {
    const globalFilteredIndex = (currentPage - 1) * itemsPerPage + pageIndex;
    return filteredIndices[globalFilteredIndex];
  };

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
      // Add validation warnings
      const warnings: Array<{ row: number; field: string; warning: string }> = [];
      const dataToValidate = data.allData || data.preview;
      
      dataToValidate.forEach((row: any, index: number) => {
        importSettings.requiredFields.forEach(field => {
          if (!row[field] || String(row[field]).trim() === '') {
            warnings.push({
              row: index + 1,
              field,
              warning: `Required field '${field}' is missing or empty`
            });
          }
        });

        // Validate price
        if (row.price && isNaN(parseFloat(row.price))) {
          warnings.push({
            row: index + 1,
            field: 'price',
            warning: 'Price must be a valid number'
          });
        }
      });

      setPreview({ ...data, validationWarnings: warnings });
      setAllData(data.allData || data.preview);
      
      // Select all rows by default
      const totalItems = data.allData?.length || data.totalRows;
      setSelectedRows(new Set(Array.from({ length: totalItems }, (_, i) => i)));
      setCurrentPage(1);
      setSearchQuery("");
      
      toast.success('CSV preview loaded successfully');
    },
    onError: (error: any) => {
      toast.error(`Preview failed: ${error.message}`);
      console.error('Preview error:', error);
    },
  });

  const importMutation = useMutation({
    mutationFn: async ({ file, selectedItems }: { file: File; selectedItems: any[] }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('action', 'import');
      formData.append('settings', JSON.stringify(importSettings));
      formData.append('selectedItems', JSON.stringify(selectedItems));

      const { data, error } = await supabase.functions.invoke('import-products', {
        body: formData,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setActiveImportId(data.importId);
      queryClient.invalidateQueries({ queryKey: ['product-imports'] });
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success('Import started successfully');
    },
    onError: (error: any) => {
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
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error('File size must be less than 10MB');
        return;
      }
      setSelectedFile(file);
      setPreview(null);
      setAllData([]);
      setSelectedRows(new Set());
      setActiveImportId(null);
      setSearchQuery("");
      setCurrentPage(1);
    }
  };

  const handlePreview = () => {
    if (selectedFile) {
      previewMutation.mutate(selectedFile);
    }
  };

  const handleImport = () => {
    if (selectedFile && selectedRows.size > 0) {
      const criticalErrors = preview?.validationWarnings.filter(w => 
        importSettings.requiredFields.includes(w.field) && selectedRows.has(w.row - 1)
      ) || [];
      
      if (criticalErrors.length > 0 && !importSettings.skipDuplicates) {
        const proceed = window.confirm(
          `There are ${criticalErrors.length} critical validation errors in selected items. Do you want to proceed anyway?`
        );
        if (!proceed) return;
      }
      
      const selectedItems = allData.filter((_, index) => selectedRows.has(index));
      importMutation.mutate({ file: selectedFile, selectedItems });
    }
  };

  const toggleRow = (index: number) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedRows(newSelected);
  };

  const toggleAll = () => {
    if (selectedRows.size === allData.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(Array.from({ length: allData.length }, (_, i) => i)));
    }
  };

  const togglePageSelection = () => {
    const newSelected = new Set(selectedRows);
    const pageIndices = paginatedData.map((_, pageIndex) => getOriginalIndex(pageIndex));
    const allPageSelected = pageIndices.every(index => selectedRows.has(index));
    
    if (allPageSelected) {
      pageIndices.forEach(index => newSelected.delete(index));
    } else {
      pageIndices.forEach(index => newSelected.add(index));
    }
    setSelectedRows(newSelected);
  };

  const downloadTemplate = () => {
    const template = [
      'name,sku,price,description,short_description,category,stock_quantity,compare_at_price,is_active,is_featured',
      '"Sample Product","SKU123",29.99,"Product description","Short description","Electronics",100,39.99,true,false',
      '"Another Product","SKU124",19.99,"Another description","Another short description","Books",50,25.99,true,true'
    ].join('\n');
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'product_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetForm = () => {
    setSelectedFile(null);
    setPreview(null);
    setAllData([]);
    setSelectedRows(new Set());
    setActiveImportId(null);
    setSearchQuery("");
    setCurrentPage(1);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isAllSelected = allData.length > 0 && selectedRows.size === allData.length;
  const isPageAllSelected = paginatedData.length > 0 && 
    paginatedData.every((_, pageIndex) => selectedRows.has(getOriginalIndex(pageIndex)));

  return (
    <div className="space-y-6">
      <Tabs defaultValue="import" className="w-full">
        <TabsList>
          <TabsTrigger value="import">Import Products</TabsTrigger>
          <TabsTrigger value="settings">Import Settings</TabsTrigger>
          <TabsTrigger value="history">Import History</TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="space-y-6">
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
                  Download a sample CSV template with example data
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="csv-file">Select CSV File (Max 10MB)</Label>
                  <Input
                    id="csv-file"
                    ref={fileInputRef}
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
                    <div className="flex gap-2">
                      <Button 
                        onClick={handlePreview}
                        disabled={previewMutation.isPending}
                        variant="outline"
                        size="sm"
                      >
                        {previewMutation.isPending ? 'Loading...' : 'Preview'}
                      </Button>
                      <Button onClick={resetForm} variant="ghost" size="sm">
                        Reset
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Validation Warnings */}
          {preview && preview.validationWarnings.length > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <div className="font-medium">
                    Validation Warnings ({preview.validationWarnings.length})
                  </div>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {preview.validationWarnings.slice(0, 10).map((warning, index) => (
                      <div key={index} className="text-sm">
                        Row {warning.row}, {warning.field}: {warning.warning}
                      </div>
                    ))}
                    {preview.validationWarnings.length > 10 && (
                      <div className="text-sm text-muted-foreground">
                        And {preview.validationWarnings.length - 10} more warnings...
                      </div>
                    )}
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Preview Section with Selection */}
          {preview && allData.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Select Products to Import</CardTitle>
                  <Badge variant="outline" className="text-sm">
                    {selectedRows.size} of {allData.length} selected
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Search and Controls */}
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="relative flex-1 min-w-[200px]">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search products..."
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="pl-9"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={toggleAll}
                      >
                        {isAllSelected ? 'Deselect All' : 'Select All'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={togglePageSelection}
                      >
                        {isPageAllSelected ? 'Deselect Page' : 'Select Page'}
                      </Button>
                    </div>
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="w-12">
                            <Checkbox
                              checked={isPageAllSelected}
                              onCheckedChange={togglePageSelection}
                            />
                          </TableHead>
                          {preview.headers.slice(0, 6).map((header) => (
                            <TableHead key={header} className="font-semibold">
                              {header}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedData.map((row, pageIndex) => {
                          const originalIndex = getOriginalIndex(pageIndex);
                          const isSelected = selectedRows.has(originalIndex);
                          
                          return (
                            <TableRow 
                              key={originalIndex}
                              className={isSelected ? "bg-primary/5" : ""}
                            >
                              <TableCell>
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => toggleRow(originalIndex)}
                                />
                              </TableCell>
                              {preview.headers.slice(0, 6).map((header) => (
                                <TableCell key={header} className="max-w-32 truncate">
                                  {row[header] || '-'}
                                </TableCell>
                              ))}
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Show</span>
                      <Select
                        value={String(itemsPerPage)}
                        onValueChange={(value) => {
                          setItemsPerPage(Number(value));
                          setCurrentPage(1);
                        }}
                      >
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="25">25</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="text-sm text-muted-foreground">per page</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm">
                        Page {currentPage} of {totalPages || 1}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage >= totalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>

                    <Button 
                      onClick={handleImport}
                      disabled={importMutation.isPending || selectedRows.size === 0}
                      className="min-w-[200px]"
                    >
                      {importMutation.isPending ? 'Starting Import...' : `Import ${selectedRows.size} Selected Product${selectedRows.size !== 1 ? 's' : ''}`}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Active Import Progress */}
          {activeImportId && (
            <ImportProgressTracker
              importId={activeImportId}
              onComplete={() => {
                refetchImports();
                queryClient.invalidateQueries({ queryKey: ['admin-products'] });
              }}
              onError={(error) => {
                console.error('Import error:', error);
                refetchImports();
              }}
            />
          )}
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Import Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="skip-duplicates"
                    checked={importSettings.skipDuplicates}
                    onCheckedChange={(checked) => 
                      setImportSettings(prev => ({ ...prev, skipDuplicates: checked as boolean }))
                    }
                  />
                  <Label htmlFor="skip-duplicates">Skip duplicate SKUs</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="update-existing"
                    checked={importSettings.updateExisting}
                    onCheckedChange={(checked) => 
                      setImportSettings(prev => ({ ...prev, updateExisting: checked as boolean }))
                    }
                  />
                  <Label htmlFor="update-existing">Update existing products</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="validate-categories"
                    checked={importSettings.validateCategories}
                    onCheckedChange={(checked) => 
                      setImportSettings(prev => ({ ...prev, validateCategories: checked as boolean }))
                    }
                  />
                  <Label htmlFor="validate-categories">Validate category names</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="create-categories"
                    checked={importSettings.createMissingCategories}
                    onCheckedChange={(checked) => 
                      setImportSettings(prev => ({ ...prev, createMissingCategories: checked as boolean }))
                    }
                  />
                  <Label htmlFor="create-categories">Create missing categories</Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Import History
                <Button onClick={() => refetchImports()} variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </CardTitle>
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
                        <TableHead>Status</TableHead>
                        <TableHead>Filename</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Successful</TableHead>
                        <TableHead>Failed</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {imports.map((importRecord) => {
                        const getStatusIcon = (status: string) => {
                          switch (status) {
                            case 'completed':
                              return <CheckCircle className="h-4 w-4 text-green-500" />;
                            case 'failed':
                              return <XCircle className="h-4 w-4 text-red-500" />;
                            case 'processing':
                              return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
                            default:
                              return <Clock className="h-4 w-4 text-yellow-500" />;
                          }
                        };

                        return (
                          <TableRow key={importRecord.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getStatusIcon(importRecord.status)}
                                <Badge variant={
                                  importRecord.status === 'completed' ? 'default' :
                                  importRecord.status === 'failed' ? 'destructive' :
                                  importRecord.status === 'processing' ? 'secondary' : 'outline'
                                }>
                                  {importRecord.status}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell className="max-w-48 truncate">
                              {importRecord.filename}
                            </TableCell>
                            <TableCell>{importRecord.total_rows}</TableCell>
                            <TableCell className="text-green-600">
                              {importRecord.successful_rows || 0}
                            </TableCell>
                            <TableCell className="text-red-600">
                              {importRecord.failed_rows || 0}
                            </TableCell>
                            <TableCell>
                              {new Date(importRecord.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              {importRecord.status === 'processing' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setActiveImportId(importRecord.id)}
                                >
                                  View Progress
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

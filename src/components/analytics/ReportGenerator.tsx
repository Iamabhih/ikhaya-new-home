
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { CalendarIcon, Download, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface ReportConfig {
  id?: string;
  name: string;
  report_type: string;
  filters: Record<string, any>;
  schedule?: string;
}

export const ReportGenerator = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [newReport, setNewReport] = useState<ReportConfig>({
    name: '',
    report_type: 'sales',
    filters: {},
  });
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});

  // Fetch existing report configurations
  const { data: reports } = useQuery({
    queryKey: ['report-configurations'],
    queryFn: async () => {
      const { data } = await supabase
        .from('report_configurations')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  // Create report configuration
  const createReportMutation = useMutation({
    mutationFn: async (reportConfig: ReportConfig) => {
      // Convert dates to ISO strings for JSONB storage
      const serializedDateRange = {
        from: dateRange.from?.toISOString(),
        to: dateRange.to?.toISOString(),
      };

      const { data, error } = await supabase
        .from('report_configurations')
        .insert({
          name: reportConfig.name,
          report_type: reportConfig.report_type,
          schedule: reportConfig.schedule,
          user_id: user?.id,
          filters: {
            ...reportConfig.filters,
            date_range: serializedDateRange,
          },
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-configurations'] });
      setIsCreating(false);
      setNewReport({ name: '', report_type: 'sales', filters: {} });
      setDateRange({});
      toast.success('Report configuration created successfully');
    },
    onError: (error) => {
      console.error('Error creating report:', error);
      toast.error('Failed to create report configuration');
    },
  });

  // Delete report configuration
  const deleteReportMutation = useMutation({
    mutationFn: async (reportId: string) => {
      const { error } = await supabase
        .from('report_configurations')
        .delete()
        .eq('id', reportId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-configurations'] });
      toast.success('Report configuration deleted');
    },
    onError: (error) => {
      console.error('Error deleting report:', error);
      toast.error('Failed to delete report configuration');
    },
  });

  // Generate and download report
  const generateReport = async (reportConfig: any) => {
    try {
      let data: any[] = [];
      let filename = '';

      switch (reportConfig.report_type) {
        case 'sales':
          const { data: salesData } = await supabase
            .from('orders')
            .select('*')
            .eq('status', 'delivered');
          data = salesData || [];
          filename = 'sales-report.csv';
          break;

        case 'customers':
          const { data: customerData } = await supabase
            .from('customer_analytics')
            .select('*');
          data = customerData || [];
          filename = 'customer-report.csv';
          break;

        case 'products':
          const { data: productData } = await supabase
            .from('product_performance')
            .select('*');
          data = productData || [];
          filename = 'product-report.csv';
          break;

        default:
          throw new Error('Invalid report type');
      }

      // Convert to CSV
      if (data.length > 0) {
        const csvContent = convertToCSV(data);
        downloadCSV(csvContent, filename);
        toast.success('Report downloaded successfully');
      } else {
        toast.error('No data available for this report');
      }
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    }
  };

  const convertToCSV = (data: any[]) => {
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => 
      Object.values(row).map(value => 
        typeof value === 'string' && value.includes(',') 
          ? `"${value}"` 
          : value
      ).join(',')
    ).join('\n');
    return `${headers}\n${rows}`;
  };

  const downloadCSV = (csvContent: string, filename: string) => {
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Create New Report */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Report Generator
            <Button
              onClick={() => setIsCreating(!isCreating)}
              size="sm"
              variant={isCreating ? "outline" : "default"}
            >
              <Plus className="h-4 w-4 mr-2" />
              {isCreating ? 'Cancel' : 'New Report'}
            </Button>
          </CardTitle>
        </CardHeader>
        
        {isCreating && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Report Name</Label>
                <Input
                  id="name"
                  value={newReport.name}
                  onChange={(e) => setNewReport({ ...newReport, name: e.target.value })}
                  placeholder="Enter report name"
                />
              </div>
              
              <div>
                <Label htmlFor="type">Report Type</Label>
                <Select
                  value={newReport.report_type}
                  onValueChange={(value) => setNewReport({ ...newReport, report_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sales">Sales Report</SelectItem>
                    <SelectItem value="customers">Customer Report</SelectItem>
                    <SelectItem value="products">Product Report</SelectItem>
                    <SelectItem value="analytics">Analytics Report</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Date Range (Optional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.from ? format(dateRange.from, 'MMM dd, yyyy') : 'From date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateRange.from}
                      onSelect={(date) => setDateRange({ ...dateRange, from: date })}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div>
                <Label>&nbsp;</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.to ? format(dateRange.to, 'MMM dd, yyyy') : 'To date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateRange.to}
                      onSelect={(date) => setDateRange({ ...dateRange, to: date })}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div>
              <Label htmlFor="schedule">Schedule (Optional)</Label>
              <Select
                value={newReport.schedule || ''}
                onValueChange={(value) => setNewReport({ ...newReport, schedule: value || undefined })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select schedule" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Manual only</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={() => createReportMutation.mutate(newReport)}
              disabled={!newReport.name || createReportMutation.isPending}
              className="w-full"
            >
              {createReportMutation.isPending ? 'Creating...' : 'Create Report'}
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Existing Reports */}
      <Card>
        <CardHeader>
          <CardTitle>Saved Reports</CardTitle>
        </CardHeader>
        <CardContent>
          {reports?.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No saved reports. Create your first report above.
            </p>
          ) : (
            <div className="space-y-4">
              {reports?.map((report) => (
                <div key={report.id} className="flex items-center justify-between p-4 border rounded">
                  <div>
                    <h3 className="font-medium">{report.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {report.report_type} • {report.schedule || 'Manual'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => generateReport(report)}
                      variant="outline"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteReportMutation.mutate(report.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

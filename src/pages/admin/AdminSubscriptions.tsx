import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format as formatDate } from "date-fns";
import { 
  Download, 
  Search, 
  Calendar as CalendarIcon, 
  Mail, 
  Users, 
  TrendingUp,
  Filter,
  RefreshCw,
  Eye,
  EyeOff
} from "lucide-react";

interface NewsletterSubscription {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  source: string;
  is_active: boolean;
  subscribed_at: string;
  unsubscribed_at?: string;
  metadata: any;
  ip_address?: string;
  user_agent?: string;
  referrer?: string;
}

interface SubscriptionStats {
  total: number;
  active: number;
  unsubscribed: number;
  thisMonth: number;
  lastMonth: number;
  growthRate: number;
}

export const AdminSubscriptions = () => {
  const [subscriptions, setSubscriptions] = useState<NewsletterSubscription[]>([]);
  const [stats, setStats] = useState<SubscriptionStats>({
    total: 0,
    active: 0,
    unsubscribed: 0,
    thisMonth: 0,
    lastMonth: 0,
    growthRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'unsubscribed'>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 50;

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('newsletter_subscriptions')
        .select('*', { count: 'exact' });

      // Apply filters
      if (searchTerm) {
        query = query.or(`email.ilike.%${searchTerm}%,first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%`);
      }

      if (statusFilter !== 'all') {
        query = query.eq('is_active', statusFilter === 'active');
      }

      if (sourceFilter !== 'all') {
        query = query.eq('source', sourceFilter);
      }

      if (dateFrom) {
        query = query.gte('subscribed_at', dateFrom.toISOString());
      }

      if (dateTo) {
        query = query.lte('subscribed_at', dateTo.toISOString());
      }

      // Pagination
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      
      query = query
        .order('subscribed_at', { ascending: false })
        .range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      setSubscriptions(data as NewsletterSubscription[] || []);
      setTotalPages(Math.ceil((count || 0) / itemsPerPage));
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      toast.error('Failed to fetch subscriptions');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Get total and active counts
      const { data: totalData, error: totalError } = await supabase
        .from('newsletter_subscriptions')
        .select('id, is_active, subscribed_at');

      if (totalError) throw totalError;

      const total = totalData?.length || 0;
      const active = totalData?.filter(sub => sub.is_active).length || 0;
      const unsubscribed = total - active;

      // Calculate monthly growth
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      const thisMonth = totalData?.filter(sub => 
        new Date(sub.subscribed_at) >= thisMonthStart
      ).length || 0;

      const lastMonth = totalData?.filter(sub => {
        const subDate = new Date(sub.subscribed_at);
        return subDate >= lastMonthStart && subDate <= lastMonthEnd;
      }).length || 0;

      const growthRate = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : 0;

      setStats({
        total,
        active,
        unsubscribed,
        thisMonth,
        lastMonth,
        growthRate
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleExport = async (format: 'csv' | 'json' = 'csv') => {
    setExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('export-subscriptions', {
        body: {
          format,
          filters: {
            searchTerm,
            statusFilter,
            sourceFilter,
            dateFrom: dateFrom?.toISOString(),
            dateTo: dateTo?.toISOString()
          }
        }
      });

      if (error) throw error;

      // Create download link
      const blob = new Blob([data.content], { 
        type: format === 'csv' ? 'text/csv' : 'application/json' 
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `newsletter-subscriptions-${formatDate(new Date(), 'yyyy-MM-dd')}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(`Subscriptions exported successfully as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export subscriptions');
    } finally {
      setExporting(false);
    }
  };

  const toggleSubscriptionStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('newsletter_subscriptions')
        .update({ 
          is_active: !currentStatus,
          unsubscribed_at: !currentStatus ? null : new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      toast.success(`Subscription ${!currentStatus ? 'reactivated' : 'deactivated'}`);
      fetchSubscriptions();
      fetchStats();
    } catch (error) {
      console.error('Error updating subscription:', error);
      toast.error('Failed to update subscription status');
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, [currentPage, searchTerm, statusFilter, sourceFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchStats();
  }, []);

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setSourceFilter('all');
    setDateFrom(undefined);
    setDateTo(undefined);
    setCurrentPage(1);
  };

  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Newsletter Subscriptions</h1>
          <p className="text-muted-foreground">Manage and export your subscriber list</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => handleExport('csv')} 
            disabled={exporting}
            variant="outline"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button 
            onClick={() => handleExport('json')} 
            disabled={exporting}
            variant="outline"
          >
            <Download className="w-4 h-4 mr-2" />
            Export JSON
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Subscribers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscribers</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.thisMonth.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Growth Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.growthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {stats.growthRate > 0 ? '+' : ''}{stats.growthRate.toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter and search your subscriber list</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search email, name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="unsubscribed">Unsubscribed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">From Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? formatDate(dateFrom, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={setDateFrom}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">To Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? formatDate(dateTo, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={setDateTo}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button onClick={resetFilters} variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              Reset Filters
            </Button>
            <Button onClick={fetchSubscriptions} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Subscriptions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Subscriptions ({subscriptions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <RefreshCw className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Subscribed</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions.map((subscription) => (
                    <TableRow key={subscription.id}>
                      <TableCell className="font-medium">{subscription.email}</TableCell>
                      <TableCell>
                        {subscription.first_name || subscription.last_name 
                          ? `${subscription.first_name || ''} ${subscription.last_name || ''}`.trim()
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{subscription.source}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={subscription.is_active ? "default" : "destructive"}>
                          {subscription.is_active ? "Active" : "Unsubscribed"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {formatDate(new Date(subscription.subscribed_at), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleSubscriptionStatus(subscription.id, subscription.is_active)}
                        >
                          {subscription.is_active ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="flex items-center px-4">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
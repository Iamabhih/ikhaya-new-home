import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  Bug, 
  Skull,
  Search,
  RefreshCw,
  Download,
  Filter,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';
type LogCategory = 'auth' | 'cart' | 'checkout' | 'payment' | 'product' | 'admin' | 'error' | 'performance' | 'navigation' | 'api' | 'system';

interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  source: string;
  function_name: string | null;
  message: string;
  user_id: string | null;
  session_id: string | null;
  correlation_id: string | null;
  metadata: Record<string, unknown>;
  error_stack: string | null;
  duration_ms: number | null;
  page_path: string | null;
}

const levelIcons: Record<LogLevel, React.ReactNode> = {
  debug: <Bug className="h-4 w-4" />,
  info: <Info className="h-4 w-4" />,
  warn: <AlertTriangle className="h-4 w-4" />,
  error: <AlertCircle className="h-4 w-4" />,
  fatal: <Skull className="h-4 w-4" />,
};

const levelColors: Record<LogLevel, string> = {
  debug: 'bg-gray-100 text-gray-700 border-gray-300',
  info: 'bg-blue-100 text-blue-700 border-blue-300',
  warn: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  error: 'bg-red-100 text-red-700 border-red-300',
  fatal: 'bg-red-200 text-red-900 border-red-500',
};

const categoryColors: Record<string, string> = {
  auth: 'bg-purple-100 text-purple-700',
  cart: 'bg-green-100 text-green-700',
  checkout: 'bg-indigo-100 text-indigo-700',
  payment: 'bg-emerald-100 text-emerald-700',
  product: 'bg-cyan-100 text-cyan-700',
  admin: 'bg-orange-100 text-orange-700',
  error: 'bg-red-100 text-red-700',
  performance: 'bg-pink-100 text-pink-700',
  navigation: 'bg-slate-100 text-slate-700',
  api: 'bg-teal-100 text-teal-700',
  system: 'bg-gray-100 text-gray-700',
};

export default function AdminLogs() {
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [limit, setLimit] = useState(100);

  const { data: logs = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['application-logs', levelFilter, categoryFilter, limit],
    queryFn: async () => {
      let query = supabase
        .from('application_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (levelFilter !== 'all') {
        query = query.eq('level', levelFilter);
      }
      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as LogEntry[];
    },
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  // Filter logs by search query
  const filteredLogs = logs.filter(log => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      log.message.toLowerCase().includes(query) ||
      log.category.toLowerCase().includes(query) ||
      log.function_name?.toLowerCase().includes(query) ||
      log.correlation_id?.toLowerCase().includes(query) ||
      log.user_id?.toLowerCase().includes(query)
    );
  });

  // Calculate stats
  const stats = {
    total: logs.length,
    errors: logs.filter(l => l.level === 'error' || l.level === 'fatal').length,
    warnings: logs.filter(l => l.level === 'warn').length,
    uniqueSessions: new Set(logs.map(l => l.session_id).filter(Boolean)).size,
  };

  const exportLogs = () => {
    const csv = [
      ['Timestamp', 'Level', 'Category', 'Message', 'User ID', 'Session ID', 'Correlation ID', 'Page Path', 'Duration (ms)'].join(','),
      ...filteredLogs.map(log => [
        log.timestamp,
        log.level,
        log.category,
        `"${log.message.replace(/"/g, '""')}"`,
        log.user_id || '',
        log.session_id || '',
        log.correlation_id || '',
        log.page_path || '',
        log.duration_ms || '',
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.csv`;
    a.click();
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Application Logs</h1>
            <p className="text-muted-foreground">
              Real-time application logs and error tracking
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", isFetching && "animate-spin")} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={exportLogs}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">Total Logs</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-red-600">{stats.errors}</div>
              <p className="text-xs text-muted-foreground">Errors</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-yellow-600">{stats.warnings}</div>
              <p className="text-xs text-muted-foreground">Warnings</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-blue-600">{stats.uniqueSessions}</div>
              <p className="text-xs text-muted-foreground">Unique Sessions</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search logs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={levelFilter} onValueChange={setLevelFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="debug">Debug</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warn">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="fatal">Fatal</SelectItem>
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="auth">Auth</SelectItem>
                  <SelectItem value="cart">Cart</SelectItem>
                  <SelectItem value="checkout">Checkout</SelectItem>
                  <SelectItem value="payment">Payment</SelectItem>
                  <SelectItem value="product">Product</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="performance">Performance</SelectItem>
                  <SelectItem value="navigation">Navigation</SelectItem>
                  <SelectItem value="api">API</SelectItem>
                </SelectContent>
              </Select>
              <Select value={String(limit)} onValueChange={(v) => setLimit(Number(v))}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Limit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">50 logs</SelectItem>
                  <SelectItem value="100">100 logs</SelectItem>
                  <SelectItem value="250">250 logs</SelectItem>
                  <SelectItem value="500">500 logs</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Logs Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">Timestamp</TableHead>
                    <TableHead className="w-[80px]">Level</TableHead>
                    <TableHead className="w-[100px]">Category</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead className="w-[120px]">Duration</TableHead>
                    <TableHead className="w-[180px]">Correlation ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                        <p className="mt-2 text-sm text-muted-foreground">Loading logs...</p>
                      </TableCell>
                    </TableRow>
                  ) : filteredLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <p className="text-muted-foreground">No logs found</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLogs.map((log) => (
                      <TableRow 
                        key={log.id}
                        className={cn(
                          log.level === 'error' && 'bg-red-50',
                          log.level === 'fatal' && 'bg-red-100'
                        )}
                      >
                        <TableCell className="font-mono text-xs">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            {format(new Date(log.timestamp), 'MMM dd HH:mm:ss')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={cn(
                              'flex items-center gap-1 w-fit',
                              levelColors[log.level]
                            )}
                          >
                            {levelIcons[log.level]}
                            {log.level}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="secondary"
                            className={categoryColors[log.category] || 'bg-gray-100'}
                          >
                            {log.category}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-md">
                            <p className="text-sm truncate">{log.message}</p>
                            {log.function_name && (
                              <p className="text-xs text-muted-foreground font-mono">
                                {log.function_name}
                              </p>
                            )}
                            {log.error_stack && (
                              <details className="mt-1">
                                <summary className="text-xs text-red-600 cursor-pointer">
                                  View stack trace
                                </summary>
                                <pre className="text-xs bg-gray-100 p-2 mt-1 rounded overflow-x-auto max-h-32">
                                  {log.error_stack}
                                </pre>
                              </details>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {log.duration_ms && (
                            <span className="text-xs font-mono">
                              {log.duration_ms}ms
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {log.correlation_id && (
                            <span className="text-xs font-mono text-muted-foreground truncate block max-w-[150px]">
                              {log.correlation_id.slice(0, 8)}...
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

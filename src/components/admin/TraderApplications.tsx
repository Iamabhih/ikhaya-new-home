import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import {
  Building2,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Mail,
  Phone,
  MapPin,
  User,
  Calendar,
  Eye,
  RefreshCw
} from "lucide-react";
import { format } from "date-fns";

interface TraderApplication {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  company_name: string | null;
  vat_number: string | null;
  billing_address: string | null;
  wholesale_approved: boolean | null;
  created_at: string;
  updated_at: string;
}

export const TraderApplications = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [selectedApplication, setSelectedApplication] = useState<TraderApplication | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  // Fetch trader applications
  const { data: applications, isLoading, refetch } = useQuery({
    queryKey: ['trader-applications', searchTerm, activeTab],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select('*')
        .not('company_name', 'is', null)
        .neq('company_name', '');

      // Filter by status
      if (activeTab === "pending") {
        query = query.or('wholesale_approved.is.null,wholesale_approved.eq.false');
      } else if (activeTab === "approved") {
        query = query.eq('wholesale_approved', true);
      } else if (activeTab === "rejected") {
        // We'll use a convention where rejected = wholesale_approved is explicitly false
        // and company_name exists
        query = query.eq('wholesale_approved', false);
      }

      // Search filter
      if (searchTerm) {
        query = query.or(`company_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return data as TraderApplication[];
    },
  });

  // Approve trader mutation
  const approveMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('profiles')
        .update({ wholesale_approved: true })
        .eq('id', userId);

      if (error) throw error;

      // Also assign wholesale role
      await supabase.rpc('assign_user_role', {
        target_user_id: userId,
        target_role: 'wholesale'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trader-applications'] });
      toast.success('Trader application approved!');
      setShowDetailDialog(false);
    },
    onError: (error) => {
      toast.error('Failed to approve application');
      console.error(error);
    },
  });

  // Reject trader mutation
  const rejectMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('profiles')
        .update({ wholesale_approved: false })
        .eq('id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trader-applications'] });
      toast.success('Trader application rejected');
      setShowDetailDialog(false);
    },
    onError: (error) => {
      toast.error('Failed to reject application');
      console.error(error);
    },
  });

  const pendingCount = applications?.filter(a => a.wholesale_approved === null || a.wholesale_approved === false).length || 0;
  const approvedCount = applications?.filter(a => a.wholesale_approved === true).length || 0;

  const getStatusBadge = (app: TraderApplication) => {
    if (app.wholesale_approved === true) {
      return <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
    }
    if (app.wholesale_approved === false) {
      return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Pending Review</Badge>;
    }
    return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
  };

  const handleViewDetails = (app: TraderApplication) => {
    setSelectedApplication(app);
    setShowDetailDialog(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingCount}</p>
              <p className="text-sm text-muted-foreground">Pending Applications</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-green-100 text-green-600">
              <CheckCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-bold">{approvedCount}</p>
              <p className="text-sm text-muted-foreground">Approved Traders</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-blue-100 text-blue-600">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-bold">{applications?.length || 0}</p>
              <p className="text-sm text-muted-foreground">Total Applications</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Trader Applications
              </CardTitle>
              <CardDescription>
                Review and manage wholesale trader applications
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search and Tabs */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by company, email, or name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
              <TabsList>
                <TabsTrigger value="pending" className="gap-2">
                  <Clock className="h-4 w-4" />
                  Pending
                  {pendingCount > 0 && (
                    <Badge variant="destructive" className="ml-1 h-5 px-1.5">{pendingCount}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="approved" className="gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Approved
                </TabsTrigger>
                <TabsTrigger value="all" className="gap-2">
                  <Building2 className="h-4 w-4" />
                  All
                </TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-4">
                {applications && applications.length > 0 ? (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Company</TableHead>
                          <TableHead>Contact</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Applied</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {applications.map((app) => (
                          <TableRow key={app.id}>
                            <TableCell>
                              <div className="font-medium">{app.company_name || 'N/A'}</div>
                              {app.vat_number && (
                                <div className="text-xs text-muted-foreground">VAT: {app.vat_number}</div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {app.first_name && app.last_name
                                  ? `${app.first_name} ${app.last_name}`
                                  : 'No name'}
                              </div>
                              {app.phone && (
                                <div className="text-xs text-muted-foreground">{app.phone}</div>
                              )}
                            </TableCell>
                            <TableCell className="text-sm">{app.email}</TableCell>
                            <TableCell>{getStatusBadge(app)}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {format(new Date(app.created_at), 'MMM d, yyyy')}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewDetails(app)}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  View
                                </Button>
                                {!app.wholesale_approved && (
                                  <Button
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700"
                                    onClick={() => approveMutation.mutate(app.id)}
                                    disabled={approveMutation.isPending}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Approve
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Applications Found</h3>
                    <p className="text-muted-foreground">
                      {activeTab === "pending"
                        ? "No pending trader applications at the moment."
                        : "No trader applications match your criteria."}
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Application Details
            </DialogTitle>
            <DialogDescription>
              Review the trader application details below
            </DialogDescription>
          </DialogHeader>

          {selectedApplication && (
            <div className="space-y-6">
              {/* Company Info */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Company Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Company Name</p>
                    <p className="font-medium">{selectedApplication.company_name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">VAT Number</p>
                    <p className="font-medium">{selectedApplication.vat_number || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Contact Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Contact Person</p>
                      <p className="font-medium">
                        {selectedApplication.first_name && selectedApplication.last_name
                          ? `${selectedApplication.first_name} ${selectedApplication.last_name}`
                          : 'Not provided'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{selectedApplication.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-medium">{selectedApplication.phone || 'Not provided'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Applied On</p>
                      <p className="font-medium">{format(new Date(selectedApplication.created_at), 'MMMM d, yyyy')}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Address */}
              {selectedApplication.billing_address && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Business Address</h4>
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <p className="font-medium">{selectedApplication.billing_address}</p>
                  </div>
                </div>
              )}

              {/* Status */}
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <span className="text-sm text-muted-foreground">Current Status:</span>
                {getStatusBadge(selectedApplication)}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
              Close
            </Button>
            {selectedApplication && !selectedApplication.wholesale_approved && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => rejectMutation.mutate(selectedApplication.id)}
                  disabled={rejectMutation.isPending}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => approveMutation.mutate(selectedApplication.id)}
                  disabled={approveMutation.isPending}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

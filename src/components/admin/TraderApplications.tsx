import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  RefreshCw,
  FileText,
  Briefcase
} from "lucide-react";
import { format } from "date-fns";

interface TraderApplication {
  id: string;
  user_id: string | null;
  company_name: string;
  trading_name: string | null;
  vat_number: string | null;
  registration_number: string | null;
  business_type: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  province: string;
  postal_code: string;
  years_in_business: string | null;
  estimated_monthly_orders: string | null;
  additional_info: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
}

export const TraderApplications = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [selectedApplication, setSelectedApplication] = useState<TraderApplication | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");

  // Fetch trader applications from the new table
  const { data: applications, isLoading, refetch } = useQuery({
    queryKey: ['trader-applications', searchTerm, activeTab],
    queryFn: async () => {
      let query = supabase
        .from('trader_applications')
        .select('*');

      // Filter by status
      if (activeTab !== "all") {
        query = query.eq('status', activeTab);
      }

      // Search filter
      if (searchTerm) {
        query = query.or(`company_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,contact_person.ilike.%${searchTerm}%,trading_name.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return data as TraderApplication[];
    },
  });

  // Approve trader mutation using the database function
  const approveMutation = useMutation({
    mutationFn: async ({ applicationId, notes }: { applicationId: string; notes?: string }) => {
      const { data, error } = await supabase.rpc('approve_trader_application', {
        application_id: applicationId,
        admin_notes: notes || null
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trader-applications'] });
      toast.success('Trader application approved successfully!');
      setShowDetailDialog(false);
      setReviewNotes("");
    },
    onError: (error: Error) => {
      toast.error(`Failed to approve application: ${error.message}`);
      console.error(error);
    },
  });

  // Reject trader mutation using the database function
  const rejectMutation = useMutation({
    mutationFn: async ({ applicationId, notes }: { applicationId: string; notes?: string }) => {
      const { data, error } = await supabase.rpc('reject_trader_application', {
        application_id: applicationId,
        admin_notes: notes || null
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trader-applications'] });
      toast.success('Trader application rejected');
      setShowDetailDialog(false);
      setReviewNotes("");
    },
    onError: (error: Error) => {
      toast.error(`Failed to reject application: ${error.message}`);
      console.error(error);
    },
  });

  const pendingCount = applications?.filter(a => a.status === 'pending').length || 0;
  const approvedCount = applications?.filter(a => a.status === 'approved').length || 0;
  const rejectedCount = applications?.filter(a => a.status === 'rejected').length || 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  const handleViewDetails = (app: TraderApplication) => {
    setSelectedApplication(app);
    setReviewNotes(app.review_notes || "");
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingCount}</p>
              <p className="text-sm text-muted-foreground">Pending</p>
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
              <p className="text-sm text-muted-foreground">Approved</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-red-100 text-red-600">
              <XCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-bold">{rejectedCount}</p>
              <p className="text-sm text-muted-foreground">Rejected</p>
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
              <p className="text-sm text-muted-foreground">Total</p>
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
                  placeholder="Search by company, email, or contact..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="pending" className="gap-1 text-xs sm:text-sm">
                  <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Pending</span>
                  {pendingCount > 0 && (
                    <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">{pendingCount}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="approved" className="gap-1 text-xs sm:text-sm">
                  <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Approved</span>
                </TabsTrigger>
                <TabsTrigger value="rejected" className="gap-1 text-xs sm:text-sm">
                  <XCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Rejected</span>
                </TabsTrigger>
                <TabsTrigger value="all" className="gap-1 text-xs sm:text-sm">
                  <Building2 className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">All</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-4">
                {applications && applications.length > 0 ? (
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Company</TableHead>
                          <TableHead className="hidden md:table-cell">Contact</TableHead>
                          <TableHead className="hidden sm:table-cell">Business Type</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="hidden lg:table-cell">Applied</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {applications.map((app) => (
                          <TableRow key={app.id}>
                            <TableCell>
                              <div className="font-medium">{app.company_name}</div>
                              {app.trading_name && (
                                <div className="text-xs text-muted-foreground">Trading as: {app.trading_name}</div>
                              )}
                              {app.vat_number && (
                                <div className="text-xs text-muted-foreground">VAT: {app.vat_number}</div>
                              )}
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <div className="text-sm font-medium">{app.contact_person}</div>
                              <div className="text-xs text-muted-foreground">{app.email}</div>
                              <div className="text-xs text-muted-foreground">{app.phone}</div>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                              <Badge variant="outline">{app.business_type}</Badge>
                            </TableCell>
                            <TableCell>{getStatusBadge(app.status)}</TableCell>
                            <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                              {format(new Date(app.created_at), 'MMM d, yyyy')}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewDetails(app)}
                                >
                                  <Eye className="h-4 w-4" />
                                  <span className="hidden sm:inline ml-1">View</span>
                                </Button>
                                {app.status === 'pending' && (
                                  <Button
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700"
                                    onClick={() => approveMutation.mutate({ applicationId: app.id })}
                                    disabled={approveMutation.isPending}
                                  >
                                    <CheckCircle className="h-4 w-4" />
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
                        : `No ${activeTab} trader applications match your criteria.`}
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Application Details
            </DialogTitle>
            <DialogDescription>
              Review the complete trader application details
            </DialogDescription>
          </DialogHeader>

          {selectedApplication && (
            <div className="space-y-6">
              {/* Status Banner */}
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="text-sm text-muted-foreground">Status:</span>
                {getStatusBadge(selectedApplication.status)}
              </div>

              {/* Company Info */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Company Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-xs text-muted-foreground">Company Name</p>
                    <p className="font-medium">{selectedApplication.company_name}</p>
                  </div>
                  {selectedApplication.trading_name && (
                    <div>
                      <p className="text-xs text-muted-foreground">Trading Name</p>
                      <p className="font-medium">{selectedApplication.trading_name}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground">VAT Number</p>
                    <p className="font-medium">{selectedApplication.vat_number || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Registration Number</p>
                    <p className="font-medium">{selectedApplication.registration_number || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Business Type</p>
                    <p className="font-medium">{selectedApplication.business_type}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Years in Business</p>
                    <p className="font-medium">{selectedApplication.years_in_business || 'Not provided'}</p>
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Contact Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-start gap-2">
                    <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Contact Person</p>
                      <p className="font-medium">{selectedApplication.contact_person}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <a href={`mailto:${selectedApplication.email}`} className="font-medium text-primary hover:underline">
                        {selectedApplication.email}
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Phone</p>
                      <a href={`tel:${selectedApplication.phone}`} className="font-medium text-primary hover:underline">
                        {selectedApplication.phone}
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Applied On</p>
                      <p className="font-medium">{format(new Date(selectedApplication.created_at), 'MMMM d, yyyy')}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Business Address
                </h4>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="font-medium">
                    {selectedApplication.address}<br />
                    {selectedApplication.city}, {selectedApplication.province}<br />
                    {selectedApplication.postal_code}
                  </p>
                </div>
              </div>

              {/* Additional Info */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Additional Information
                </h4>
                <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Estimated Monthly Orders</p>
                    <p className="font-medium">{selectedApplication.estimated_monthly_orders || 'Not provided'}</p>
                  </div>
                  {selectedApplication.additional_info && (
                    <div>
                      <p className="text-xs text-muted-foreground">Additional Notes</p>
                      <p className="font-medium">{selectedApplication.additional_info}</p>
                    </div>
                  )}
                  {selectedApplication.user_id && (
                    <div>
                      <p className="text-xs text-muted-foreground">User ID</p>
                      <p className="font-medium text-xs font-mono">{selectedApplication.user_id}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Review Notes (for admins) */}
              {selectedApplication.status === 'pending' && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Admin Review Notes
                  </h4>
                  <Textarea
                    placeholder="Add notes about this application (optional)..."
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              )}

              {/* Show review info if already reviewed */}
              {selectedApplication.reviewed_at && (
                <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Reviewed on {format(new Date(selectedApplication.reviewed_at), 'MMMM d, yyyy')}
                  </p>
                  {selectedApplication.review_notes && (
                    <p className="text-sm"><strong>Notes:</strong> {selectedApplication.review_notes}</p>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 flex-col sm:flex-row">
            <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
              Close
            </Button>
            {selectedApplication && selectedApplication.status === 'pending' && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => rejectMutation.mutate({
                    applicationId: selectedApplication.id,
                    notes: reviewNotes
                  })}
                  disabled={rejectMutation.isPending}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => approveMutation.mutate({
                    applicationId: selectedApplication.id,
                    notes: reviewNotes
                  })}
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

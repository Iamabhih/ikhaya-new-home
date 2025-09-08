
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminProtectedRoute } from "@/components/admin/AdminProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RotateCcw, Eye, CheckCircle, XCircle, Package, Clock } from "lucide-react";
import { toast } from "sonner";

const AdminReturns = () => {
  const [selectedReturn, setSelectedReturn] = useState<any>(null);
  const [statusUpdate, setStatusUpdate] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const queryClient = useQueryClient();

  const { data: returnRequests = [], isLoading } = useQuery({
    queryKey: ['admin-returns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('return_requests')
        .select(`
          *,
          orders!inner(order_number, total_amount),
          return_items(
            id,
            quantity,
            condition,
            refund_amount,
            order_items(product_name, unit_price)
          )
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const updateReturnMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes: string }) => {
      const { error } = await supabase
        .from('return_requests')
        .update({
          status,
          admin_notes: notes,
          updated_at: new Date().toISOString(),
          ...(status === 'completed' && { processed_at: new Date().toISOString() })
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-returns'] });
      toast.success("Return request updated successfully");
      setSelectedReturn(null);
      setStatusUpdate("");
      setAdminNotes("");
    },
    onError: (error) => {
      console.error("Error updating return:", error);
      toast.error("Failed to update return request");
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'approved': return <CheckCircle className="h-4 w-4" />;
      case 'rejected': return <XCircle className="h-4 w-4" />;
      case 'processing': return <Package className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      case 'processing': return 'default';
      case 'completed': return 'default';
      default: return 'secondary';
    }
  };

  const handleUpdateReturn = () => {
    if (!selectedReturn || !statusUpdate) return;
    updateReturnMutation.mutate({
      id: selectedReturn.id,
      status: statusUpdate,
      notes: adminNotes
    });
  };

  const openReturnDetails = (returnRequest: any) => {
    setSelectedReturn(returnRequest);
    setStatusUpdate(returnRequest.status);
    setAdminNotes(returnRequest.admin_notes || "");
  };

  return (
    <AdminLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Return Management</h1>
            <p className="text-muted-foreground">
              Manage customer return requests and process refunds.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5" />
                Return Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-4">Loading return requests...</div>
              ) : returnRequests.length === 0 ? (
                <div className="text-center py-8">
                  <RotateCcw className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No return requests found.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Request ID</TableHead>
                      <TableHead>Order</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Refund Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {returnRequests.map((returnRequest) => (
                      <TableRow key={returnRequest.id}>
                        <TableCell className="font-mono">
                          #{returnRequest.id.slice(-8)}
                        </TableCell>
                        <TableCell>#{returnRequest.orders.order_number}</TableCell>
                        <TableCell>{returnRequest.email}</TableCell>
                        <TableCell>{returnRequest.return_reason}</TableCell>
                        <TableCell>
                          {returnRequest.refund_amount ? `R${returnRequest.refund_amount}` : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(returnRequest.status)} className="flex items-center gap-1 w-fit">
                            {getStatusIcon(returnRequest.status)}
                            {returnRequest.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(returnRequest.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openReturnDetails(returnRequest)}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>
                                  Return Request #{selectedReturn?.id.slice(-8)}
                                </DialogTitle>
                              </DialogHeader>
                              {selectedReturn && (
                                <div className="space-y-6">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <Label className="text-sm font-medium">Order Number</Label>
                                      <p>#{selectedReturn.orders.order_number}</p>
                                    </div>
                                    <div>
                                      <Label className="text-sm font-medium">Customer Email</Label>
                                      <p>{selectedReturn.email}</p>
                                    </div>
                                    <div>
                                      <Label className="text-sm font-medium">Return Reason</Label>
                                      <p>{selectedReturn.return_reason}</p>
                                    </div>
                                    <div>
                                      <Label className="text-sm font-medium">Request Date</Label>
                                      <p>{new Date(selectedReturn.created_at).toLocaleDateString()}</p>
                                    </div>
                                  </div>

                                  {selectedReturn.return_description && (
                                    <div>
                                      <Label className="text-sm font-medium">Description</Label>
                                      <p className="text-sm text-muted-foreground mt-1">
                                        {selectedReturn.return_description}
                                      </p>
                                    </div>
                                  )}

                                  <div>
                                    <Label className="text-sm font-medium">Items to Return</Label>
                                    <div className="space-y-2 mt-2">
                                      {selectedReturn.return_items?.map((item: any) => (
                                        <div key={item.id} className="flex justify-between items-center p-2 bg-muted rounded">
                                          <span>{item.order_items.product_name} x {item.quantity}</span>
                                          <span>R{item.refund_amount}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <Label htmlFor="status-update">Update Status</Label>
                                      <Select value={statusUpdate} onValueChange={setStatusUpdate}>
                                        <SelectTrigger>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="pending">Pending</SelectItem>
                                          <SelectItem value="approved">Approved</SelectItem>
                                          <SelectItem value="rejected">Rejected</SelectItem>
                                          <SelectItem value="processing">Processing</SelectItem>
                                          <SelectItem value="completed">Completed</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div>
                                      <Label className="text-sm font-medium">Total Refund</Label>
                                      <p className="text-lg font-semibold">
                                        R{selectedReturn.refund_amount || 0}
                                      </p>
                                    </div>
                                  </div>

                                  <div>
                                    <Label htmlFor="admin-notes">Admin Notes</Label>
                                    <Textarea
                                      id="admin-notes"
                                      value={adminNotes}
                                      onChange={(e) => setAdminNotes(e.target.value)}
                                      placeholder="Add notes about this return request..."
                                      rows={3}
                                    />
                                  </div>

                                  <div className="flex gap-4">
                                    <Button
                                      onClick={handleUpdateReturn}
                                      disabled={updateReturnMutation.isPending}
                                      className="flex-1"
                                    >
                                      {updateReturnMutation.isPending ? "Updating..." : "Update Return"}
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
    </AdminLayout>
  );
};

export default AdminReturns;

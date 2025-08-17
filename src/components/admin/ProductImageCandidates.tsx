import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Eye, Filter, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ImageCandidate {
  id: string;
  product_id: string;
  image_url: string;
  alt_text: string | null;
  match_confidence: number;
  match_metadata: any;
  extracted_sku: string | null;
  source_filename: string | null;
  created_at: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  products: {
    name: string;
    sku: string;
  };
}

export const ProductImageCandidates: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null);

  const { data: candidates, isLoading } = useQuery({
    queryKey: ['image-candidates', selectedProduct, statusFilter, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('product_image_candidates')
        .select(`
          *,
          products (
            name,
            sku
          )
        `)
        .order('match_confidence', { ascending: false });

      if (selectedProduct) {
        query = query.eq('product_id', selectedProduct);
      }

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (searchQuery) {
        query = query.or(`source_filename.ilike.%${searchQuery}%,extracted_sku.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ImageCandidate[];
    },
  });

  const { data: products } = useQuery({
    queryKey: ['products-for-candidates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, sku')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const promoteMutation = useMutation({
    mutationFn: async (candidateId: string) => {
      const { data, error } = await supabase.rpc('promote_image_candidate', {
        candidate_id: candidateId
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['image-candidates'] });
      queryClient.invalidateQueries({ queryKey: ['product-images'] });
      toast({
        title: "Success",
        description: "Image candidate promoted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ candidateId, reason }: { candidateId: string; reason?: string }) => {
      const { data, error } = await supabase.rpc('reject_image_candidate', {
        candidate_id: candidateId,
        reason: reason || null
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['image-candidates'] });
      toast({
        title: "Success",
        description: "Image candidate rejected",
      });
      setSelectedCandidate(null);
      setRejectionReason('');
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 80) return <Badge variant="default">High ({confidence}%)</Badge>;
    if (confidence >= 60) return <Badge variant="secondary">Medium ({confidence}%)</Badge>;
    return <Badge variant="outline">Low ({confidence}%)</Badge>;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="default">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Product Image Candidates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="text-sm font-medium mb-2 block">Filter by Product</label>
              <Select value={selectedProduct || "all"} onValueChange={(value) => setSelectedProduct(value === "all" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All products" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All products</SelectItem>
                  {products?.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} ({product.sku})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium mb-2 block">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by filename or SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-8">Loading candidates...</div>
          ) : candidates?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No image candidates found matching your criteria.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {candidates?.map((candidate) => (
                <Card key={candidate.id} className="overflow-hidden">
                  <div className="aspect-square bg-muted relative">
                    <img
                      src={candidate.image_url}
                      alt={candidate.alt_text || 'Product candidate'}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder.svg';
                      }}
                    />
                    <div className="absolute top-2 right-2">
                      {getConfidenceBadge(candidate.match_confidence)}
                    </div>
                    <div className="absolute top-2 left-2">
                      {getStatusBadge(candidate.status)}
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">{candidate.products.name}</h4>
                      <p className="text-xs text-muted-foreground">
                        SKU: {candidate.products.sku}
                      </p>
                      {candidate.extracted_sku && (
                        <p className="text-xs text-muted-foreground">
                          Extracted: {candidate.extracted_sku}
                        </p>
                      )}
                      {candidate.source_filename && (
                        <p className="text-xs text-muted-foreground truncate">
                          File: {candidate.source_filename}
                        </p>
                      )}
                      {candidate.rejection_reason && (
                        <p className="text-xs text-destructive">
                          Reason: {candidate.rejection_reason}
                        </p>
                      )}

                      {candidate.status === 'pending' && (
                        <div className="flex gap-2 mt-3">
                          <Button
                            size="sm"
                            onClick={() => promoteMutation.mutate(candidate.id)}
                            disabled={promoteMutation.isPending}
                            className="flex-1"
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Approve
                          </Button>

                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => setSelectedCandidate(candidate.id)}
                                className="flex-1"
                              >
                                <XCircle className="h-3 w-3 mr-1" />
                                Reject
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Reject Image Candidate</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <Textarea
                                  placeholder="Reason for rejection (optional)"
                                  value={rejectionReason}
                                  onChange={(e) => setRejectionReason(e.target.value)}
                                />
                                <div className="flex gap-2">
                                  <Button
                                    onClick={() => {
                                      if (selectedCandidate) {
                                        rejectMutation.mutate({
                                          candidateId: selectedCandidate,
                                          reason: rejectionReason
                                        });
                                      }
                                    }}
                                    disabled={rejectMutation.isPending}
                                    variant="destructive"
                                  >
                                    Confirm Rejection
                                  </Button>
                                  <Button
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedCandidate(null);
                                      setRejectionReason('');
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
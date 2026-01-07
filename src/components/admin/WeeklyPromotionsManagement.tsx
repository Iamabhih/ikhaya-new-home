import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar, Download, FileText, Plus, Settings, Trash2, Upload, Share2, Eye, Store, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { PDFPreview } from "@/components/common/PDFPreview";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface PromotionFormData {
  title: string;
  description: string;
  week_start_date: string;
  week_end_date: string;
  file: File | null;
  promotion_type: 'trader' | 'retail';
}

export const WeeklyPromotionsManagement = () => {
  const queryClient = useQueryClient();
  const { settings, updateSetting } = useSiteSettings();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewPromotion, setPreviewPromotion] = useState<any | null>(null);
  
  const [formData, setFormData] = useState<PromotionFormData>({
    title: "",
    description: "",
    week_start_date: "",
    week_end_date: "",
    file: null,
    promotion_type: 'retail'
  });

  const { data: promotions, isLoading } = useQuery({
    queryKey: ['admin-promotions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weekly_promotions')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const createPromotionMutation = useMutation({
    mutationFn: async (data: PromotionFormData) => {
      if (!data.file) throw new Error("File is required");
      
      // Validate file size (10MB limit)
      if (data.file.size > 10 * 1024 * 1024) {
        throw new Error("File size must be less than 10MB");
      }
      
      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/jpg', 
        'image/png',
        'image/gif',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      
      if (!allowedTypes.includes(data.file.type)) {
        throw new Error(`File type ${data.file.type} is not supported`);
      }
      
      setIsUploading(true);
      
      // Upload file to storage
      const fileExt = data.file.name.split('.').pop();
      const fileName = `${Date.now()}-${data.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.${fileExt}`;
      const filePath = `promotions/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('site-images')
        .upload(filePath, data.file);
      
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('site-images')
        .getPublicUrl(filePath);
      
      // Create promotion record with promotion_type
      const { error: insertError } = await supabase
        .from('weekly_promotions')
        .insert({
          title: data.title,
          description: data.description,
          file_url: publicUrlData.publicUrl,
          file_type: fileExt || 'pdf',
          file_size: data.file.size,
          week_start_date: data.week_start_date,
          week_end_date: data.week_end_date,
          promotion_type: data.promotion_type,
        });
      
      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-promotions'] });
      setIsCreateDialogOpen(false);
      setFormData({
        title: "",
        description: "",
        week_start_date: "",
        week_end_date: "",
        file: null,
        promotion_type: 'retail'
      });
      toast({
        title: "Success",
        description: "Promotion created successfully",
      });
    },
    onError: (error) => {
      console.error('Error creating promotion:', error);
      toast({
        title: "Error",
        description: "Failed to create promotion. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsUploading(false);
    }
  });

  const deletePromotionMutation = useMutation({
    mutationFn: async (promotionId: string) => {
      const { error } = await supabase
        .from('weekly_promotions')
        .delete()
        .eq('id', promotionId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-promotions'] });
      toast({
        title: "Success",
        description: "Promotion deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete promotion",
        variant: "destructive",
      });
    }
  });

  const togglePromotionStatus = async (promotionId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('weekly_promotions')
        .update({ is_active: !isActive })
        .eq('id', promotionId);
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['admin-promotions'] });
      toast({
        title: "Success",
        description: `Promotion ${!isActive ? 'activated' : 'deactivated'}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update promotion status",
        variant: "destructive",
      });
    }
  };

  const handleShare = async (promotion: any) => {
    const shareUrl = `${window.location.origin}/promotions`;
    const shareData = {
      title: promotion.title,
      text: promotion.description || `Check out this promotion: ${promotion.title}`,
      url: promotion.file_url,
    };

    try {
      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        toast({ title: "Shared!", description: "Promotion shared successfully" });
      } else {
        // Fallback: copy link to clipboard
        await navigator.clipboard.writeText(promotion.file_url);
        toast({ title: "Link Copied!", description: "Promotion link copied to clipboard" });
      }
    } catch (error) {
      // User cancelled or error
      if ((error as Error).name !== 'AbortError') {
        try {
          await navigator.clipboard.writeText(promotion.file_url);
          toast({ title: "Link Copied!", description: "Promotion link copied to clipboard" });
        } catch {
          toast({ title: "Error", description: "Failed to share promotion", variant: "destructive" });
        }
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.file) {
      toast({
        title: "Error",
        description: "Please select a file to upload",
        variant: "destructive",
      });
      return;
    }
    createPromotionMutation.mutate(formData);
  };

  const getTypeColor = (type: string) => {
    return type === 'trader' ? 'bg-amber-500/10 text-amber-600 border-amber-500/30' : 'bg-blue-500/10 text-blue-600 border-blue-500/30';
  };

  return (
    <div className="space-y-6">
      {/* Page Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            <CardTitle>Promotions Page Settings</CardTitle>
          </div>
          <CardDescription>
            Configure the promotions page display settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="promotions-enabled">Enable Promotions Page</Label>
              <p className="text-sm text-muted-foreground">Allow customers to view promotions</p>
            </div>
            <Switch
              id="promotions-enabled"
              checked={settings?.promotions_page_enabled || false}
              onCheckedChange={(checked) => updateSetting('promotions_page_enabled', checked)}
            />
          </div>
          <Separator />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="page-title">Page Title</Label>
              <Input
                id="page-title"
                value={settings?.promotions_page_title || "Weekly Promotions"}
                onChange={(e) => updateSetting('promotions_page_title', e.target.value)}
                placeholder="Weekly Promotions"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="page-description">Page Description</Label>
              <Textarea
                id="page-description"
                value={settings?.promotions_page_description || ""}
                onChange={(e) => updateSetting('promotions_page_description', e.target.value)}
                placeholder="Check out our latest weekly promotions..."
                className="min-h-[80px]"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Promotions Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Weekly Promotions</CardTitle>
              <CardDescription>
                Manage promotional materials and weekly specials
              </CardDescription>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Promotion
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <form onSubmit={handleSubmit}>
                  <DialogHeader>
                    <DialogTitle>Create New Promotion</DialogTitle>
                    <DialogDescription>
                      Upload a new promotional material for the week
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Weekly Special Offer"
                        required
                      />
                    </div>

                    {/* Promotion Type Toggle */}
                    <div className="space-y-2">
                      <Label>Promotion Type</Label>
                      <ToggleGroup 
                        type="single" 
                        value={formData.promotion_type}
                        onValueChange={(value) => {
                          if (value) setFormData(prev => ({ ...prev, promotion_type: value as 'trader' | 'retail' }));
                        }}
                        className="justify-start"
                      >
                        <ToggleGroupItem value="retail" aria-label="Retail" className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Retail
                        </ToggleGroupItem>
                        <ToggleGroupItem value="trader" aria-label="Trader" className="flex items-center gap-2">
                          <Store className="h-4 w-4" />
                          Trader
                        </ToggleGroupItem>
                      </ToggleGroup>
                      <p className="text-xs text-muted-foreground">
                        {formData.promotion_type === 'trader' 
                          ? 'This promotion will appear in the Trader tab' 
                          : 'This promotion will appear in the Retail tab'}
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Brief description of this promotion"
                        rows={3}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <Label htmlFor="start-date">Start Date</Label>
                        <Input
                          id="start-date"
                          type="date"
                          value={formData.week_start_date}
                          onChange={(e) => setFormData(prev => ({ ...prev, week_start_date: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="end-date">End Date</Label>
                        <Input
                          id="end-date"
                          type="date"
                          value={formData.week_end_date}
                          onChange={(e) => setFormData(prev => ({ ...prev, week_end_date: e.target.value }))}
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="file">Promotion File</Label>
                      <Input
                        id="file"
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx"
                        onChange={(e) => setFormData(prev => ({ ...prev, file: e.target.files?.[0] || null }))}
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        Supported formats: PDF, JPG, PNG, GIF, DOC, DOCX (Max 10MB)
                      </p>
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isUploading}>
                      {isUploading ? (
                        <>
                          <LoadingSpinner className="h-4 w-4 mr-2" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Create
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : !promotions || promotions.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No promotions created yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {promotions.map((promotion) => (
                <Card key={promotion.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-medium">{promotion.title}</h4>
                          <Badge variant={promotion.is_active ? "default" : "secondary"}>
                            {promotion.is_active ? "Active" : "Inactive"}
                          </Badge>
                          <Badge className={getTypeColor(promotion.promotion_type || 'retail')}>
                            {(promotion.promotion_type || 'retail').toUpperCase()}
                          </Badge>
                          <Badge variant="outline">
                            {promotion.file_type.toUpperCase()}
                          </Badge>
                        </div>
                        {promotion.description && (
                          <p className="text-sm text-muted-foreground">{promotion.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>
                              {format(new Date(promotion.week_start_date), 'MMM d')} - {format(new Date(promotion.week_end_date), 'MMM d, yyyy')}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Download className="h-4 w-4" />
                            <span>{promotion.download_count || 0} downloads</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPreviewPromotion(promotion)}
                          title="Preview"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleShare(promotion)}
                          title="Share"
                        >
                          <Share2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => togglePromotionStatus(promotion.id, promotion.is_active)}
                        >
                          {promotion.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Promotion</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this promotion? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deletePromotionMutation.mutate(promotion.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={!!previewPromotion} onOpenChange={(open) => !open && setPreviewPromotion(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewPromotion?.title}</DialogTitle>
            {previewPromotion?.description && (
              <DialogDescription>{previewPromotion.description}</DialogDescription>
            )}
          </DialogHeader>
          <div className="py-4">
            {previewPromotion?.file_type?.toLowerCase() === 'pdf' ? (
              <div className="flex justify-center">
                <PDFPreview
                  fileUrl={previewPromotion.file_url}
                  fileName={previewPromotion.title}
                  width={600}
                  height={800}
                  className="border border-border rounded-lg"
                />
              </div>
            ) : ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(previewPromotion?.file_type?.toLowerCase() || '') ? (
              <div className="flex justify-center">
                <img
                  src={previewPromotion?.file_url}
                  alt={previewPromotion?.title}
                  className="max-w-full max-h-[70vh] object-contain rounded-lg border border-border"
                />
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">Preview not available for this file type</p>
                <Button onClick={() => window.open(previewPromotion?.file_url, '_blank')}>
                  <Download className="h-4 w-4 mr-2" />
                  Download to View
                </Button>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleShare(previewPromotion)}>
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
            <Button onClick={() => window.open(previewPromotion?.file_url, '_blank')}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

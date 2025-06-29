
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Calendar, Clock, Plus, Trash2, Edit } from 'lucide-react';

interface ScheduledImport {
  id: string;
  name: string;
  schedule: string;
  source_url?: string;
  source_type: 'url' | 'ftp' | 'manual';
  is_active: boolean;
  last_run?: string;
  next_run?: string;
  settings: any;
}

export const ProductImportScheduler = () => {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    schedule: 'daily',
    source_type: 'manual' as 'url' | 'ftp' | 'manual',
    source_url: '',
    is_active: true,
    settings: {
      skipDuplicates: true,
      updateExisting: false,
      createMissingCategories: true,
      notifyOnCompletion: true
    }
  });

  // Fetch scheduled imports
  const { data: scheduledImports = [], isLoading } = useQuery({
    queryKey: ['scheduled-imports'],
    queryFn: async () => {
      // This would be a custom table for scheduled imports
      // For now, we'll use a mock implementation
      return [] as ScheduledImport[];
    },
  });

  const createScheduleMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      // This would create a scheduled import record
      // For now, we'll show a success message
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { id: Date.now().toString(), ...data };
    },
    onSuccess: () => {
      toast.success('Scheduled import created successfully');
      setIsCreating(false);
      setFormData({
        name: '',
        schedule: 'daily',
        source_type: 'manual',
        source_url: '',
        is_active: true,
        settings: {
          skipDuplicates: true,
          updateExisting: false,
          createMissingCategories: true,
          notifyOnCompletion: true
        }
      });
      queryClient.invalidateQueries({ queryKey: ['scheduled-imports'] });
    },
    onError: (error: any) => {
      toast.error(`Failed to create scheduled import: ${error.message}`);
    },
  });

  const updateScheduleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { id, ...data };
    },
    onSuccess: () => {
      toast.success('Scheduled import updated successfully');
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ['scheduled-imports'] });
    },
    onError: (error: any) => {
      toast.error(`Failed to update scheduled import: ${error.message}`);
    },
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: async (id: string) => {
      await new Promise(resolve => setTimeout(resolve, 500));
      return id;
    },
    onSuccess: () => {
      toast.success('Scheduled import deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['scheduled-imports'] });
    },
    onError: (error: any) => {
      toast.error(`Failed to delete scheduled import: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Please enter a name for the scheduled import');
      return;
    }

    if (editingId) {
      updateScheduleMutation.mutate({ id: editingId, data: formData });
    } else {
      createScheduleMutation.mutate(formData);
    }
  };

  const handleEdit = (scheduledImport: ScheduledImport) => {
    setFormData({
      name: scheduledImport.name,
      schedule: scheduledImport.schedule,
      source_type: scheduledImport.source_type,
      source_url: scheduledImport.source_url || '',
      is_active: scheduledImport.is_active,
      settings: scheduledImport.settings
    });
    setEditingId(scheduledImport.id);
    setIsCreating(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this scheduled import?')) {
      deleteScheduleMutation.mutate(id);
    }
  };

  const getScheduleLabel = (schedule: string) => {
    const labels: { [key: string]: string } = {
      'hourly': 'Every Hour',
      'daily': 'Daily',
      'weekly': 'Weekly',
      'monthly': 'Monthly',
      'custom': 'Custom'
    };
    return labels[schedule] || schedule;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Scheduled Imports</h2>
        <Button 
          onClick={() => setIsCreating(true)}
          disabled={isCreating}
        >
          <Plus className="h-4 w-4 mr-2" />
          Schedule Import
        </Button>
      </div>

      {/* Create/Edit Form */}
      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingId ? 'Edit Scheduled Import' : 'Create Scheduled Import'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Import Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Daily Product Sync"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="schedule">Schedule</Label>
                  <Select 
                    value={formData.schedule} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, schedule: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">Every Hour</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="source_type">Source Type</Label>
                  <Select 
                    value={formData.source_type} 
                    onValueChange={(value: 'url' | 'ftp' | 'manual') => 
                      setFormData(prev => ({ ...prev, source_type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual Upload</SelectItem>
                      <SelectItem value="url">URL Download</SelectItem>
                      <SelectItem value="ftp">FTP Download</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.source_type !== 'manual' && (
                  <div className="space-y-2">
                    <Label htmlFor="source_url">Source URL</Label>
                    <Input
                      id="source_url"
                      value={formData.source_url}
                      onChange={(e) => setFormData(prev => ({ ...prev, source_url: e.target.value }))}
                      placeholder="https://example.com/products.csv"
                      type="url"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Import Settings</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="skip-duplicates">Skip Duplicates</Label>
                    <Switch 
                      id="skip-duplicates"
                      checked={formData.settings.skipDuplicates}
                      onCheckedChange={(checked) => 
                        setFormData(prev => ({
                          ...prev,
                          settings: { ...prev.settings, skipDuplicates: checked }
                        }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="update-existing">Update Existing</Label>
                    <Switch 
                      id="update-existing"
                      checked={formData.settings.updateExisting}
                      onCheckedChange={(checked) => 
                        setFormData(prev => ({
                          ...prev,
                          settings: { ...prev.settings, updateExisting: checked }
                        }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="create-categories">Create Missing Categories</Label>
                    <Switch 
                      id="create-categories"
                      checked={formData.settings.createMissingCategories}
                      onCheckedChange={(checked) => 
                        setFormData(prev => ({
                          ...prev,
                          settings: { ...prev.settings, createMissingCategories: checked }
                        }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="notify-completion">Notify on Completion</Label>
                    <Switch 
                      id="notify-completion"
                      checked={formData.settings.notifyOnCompletion}
                      onCheckedChange={(checked) => 
                        setFormData(prev => ({
                          ...prev,
                          settings: { ...prev.settings, notifyOnCompletion: checked }
                        }))
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="is-active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ ...prev, is_active: checked }))
                    }
                  />
                  <Label htmlFor="is-active">Active</Label>
                </div>

                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => {
                      setIsCreating(false);
                      setEditingId(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    disabled={createScheduleMutation.isPending || updateScheduleMutation.isPending}
                  >
                    {editingId ? 'Update' : 'Create'} Schedule
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Scheduled Imports List */}
      <Card>
        <CardHeader>
          <CardTitle>Scheduled Imports</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">Loading...</div>
          ) : scheduledImports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No scheduled imports configured</p>
              <p className="text-sm">Create your first scheduled import to automate product updates</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Schedule</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Last Run</TableHead>
                    <TableHead>Next Run</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scheduledImports.map((scheduledImport) => (
                    <TableRow key={scheduledImport.id}>
                      <TableCell className="font-medium">
                        {scheduledImport.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant={scheduledImport.is_active ? 'default' : 'secondary'}>
                          {scheduledImport.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          {getScheduleLabel(scheduledImport.schedule)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {scheduledImport.source_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {scheduledImport.last_run ? 
                          new Date(scheduledImport.last_run).toLocaleDateString() : 
                          'Never'
                        }
                      </TableCell>
                      <TableCell>
                        {scheduledImport.next_run ? 
                          new Date(scheduledImport.next_run).toLocaleDateString() : 
                          'Not scheduled'
                        }
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleEdit(scheduledImport)}
                            variant="outline"
                            size="sm"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => handleDelete(scheduledImport.id)}
                            variant="outline"
                            size="sm"
                            disabled={deleteScheduleMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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

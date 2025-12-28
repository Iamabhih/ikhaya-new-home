import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { Plus, X, Tag } from "lucide-react";

interface OrderTagsManagerProps {
  orderId: string;
  tags: string[];
}

const PRESET_TAGS = [
  { label: 'VIP', color: 'bg-purple-100 text-purple-800 hover:bg-purple-200' },
  { label: 'Urgent', color: 'bg-red-100 text-red-800 hover:bg-red-200' },
  { label: 'Gift', color: 'bg-pink-100 text-pink-800 hover:bg-pink-200' },
  { label: 'Express', color: 'bg-blue-100 text-blue-800 hover:bg-blue-200' },
  { label: 'Fragile', color: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' },
  { label: 'Reviewed', color: 'bg-green-100 text-green-800 hover:bg-green-200' },
  { label: 'Hold', color: 'bg-orange-100 text-orange-800 hover:bg-orange-200' },
  { label: 'First Order', color: 'bg-cyan-100 text-cyan-800 hover:bg-cyan-200' },
];

const getTagColor = (tag: string) => {
  const preset = PRESET_TAGS.find(t => t.label.toLowerCase() === tag.toLowerCase());
  return preset?.color || 'bg-gray-100 text-gray-800 hover:bg-gray-200';
};

export const OrderTagsManager = ({ orderId, tags = [] }: OrderTagsManagerProps) => {
  const [newTag, setNewTag] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateTagsMutation = useMutation({
    mutationFn: async (newTags: string[]) => {
      const { error } = await supabase
        .from('orders')
        .update({ tags: newTags })
        .eq('id', orderId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update tags",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAddTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (!trimmedTag || tags.includes(trimmedTag)) return;

    updateTagsMutation.mutate([...tags, trimmedTag]);
    setNewTag("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    updateTagsMutation.mutate(tags.filter(t => t !== tagToRemove));
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {tags.map((tag) => (
        <Badge
          key={tag}
          variant="secondary"
          className={`${getTagColor(tag)} cursor-pointer group`}
        >
          {tag}
          <button
            onClick={() => handleRemoveTag(tag)}
            className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-6 px-2">
            <Plus className="h-3 w-3 mr-1" />
            <Tag className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3" align="start">
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Custom tag..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddTag(newTag);
                    setIsOpen(false);
                  }
                }}
                className="h-8"
              />
              <Button 
                size="sm" 
                className="h-8"
                onClick={() => {
                  handleAddTag(newTag);
                  setIsOpen(false);
                }}
              >
                Add
              </Button>
            </div>
            
            <div className="border-t pt-2">
              <p className="text-xs text-muted-foreground mb-2">Quick tags</p>
              <div className="flex flex-wrap gap-1">
                {PRESET_TAGS.filter(t => !tags.includes(t.label)).map((preset) => (
                  <Badge
                    key={preset.label}
                    variant="secondary"
                    className={`${preset.color} cursor-pointer`}
                    onClick={() => {
                      handleAddTag(preset.label);
                      setIsOpen(false);
                    }}
                  >
                    {preset.label}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

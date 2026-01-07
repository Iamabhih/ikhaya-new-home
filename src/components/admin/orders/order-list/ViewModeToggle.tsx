import { Button } from "@/components/ui/button";
import { List, LayoutGrid, BarChart3, Settings } from "lucide-react";

interface ViewModeToggleProps {
  viewMode: 'list' | 'kanban' | 'metrics';
  onViewModeChange: (mode: 'list' | 'kanban' | 'metrics') => void;
  showAutomation: boolean;
  onToggleAutomation: () => void;
}

export const ViewModeToggle = ({
  viewMode,
  onViewModeChange,
  showAutomation,
  onToggleAutomation
}: ViewModeToggleProps) => {
  return (
    <div className="flex items-center gap-2 pt-4 border-t">
      <span className="text-sm text-muted-foreground">View:</span>
      <Button
        variant={viewMode === 'list' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onViewModeChange('list')}
      >
        <List className="h-4 w-4 mr-1" />
        List
      </Button>
      <Button
        variant={viewMode === 'kanban' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onViewModeChange('kanban')}
      >
        <LayoutGrid className="h-4 w-4 mr-1" />
        Kanban
      </Button>
      <Button
        variant={viewMode === 'metrics' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onViewModeChange('metrics')}
      >
        <BarChart3 className="h-4 w-4 mr-1" />
        Metrics
      </Button>
      <div className="flex-1" />
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggleAutomation}
      >
        <Settings className="h-4 w-4 mr-1" />
        Automation
      </Button>
    </div>
  );
};

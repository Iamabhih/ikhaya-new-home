import { useBackgroundRemoval } from "@/contexts/BackgroundRemovalContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Play, Square, RotateCcw, Trash2 } from "lucide-react";

const BackgroundRemovalStatus = () => {
  const {
    isProcessing,
    currentBatch,
    totalBatches,
    stats,
    startProcessing,
    stopProcessing,
    retryFailedItems,
    clearItems
  } = useBackgroundRemoval();

  if (stats.total === 0) return null;

  return (
    <Card className="fixed bottom-4 right-4 w-80 z-50 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Background Removal</CardTitle>
          <Badge variant={isProcessing ? "default" : "secondary"}>
            {isProcessing ? "Processing" : "Idle"}
          </Badge>
        </div>
        <CardDescription className="text-xs">
          {isProcessing && `Batch ${currentBatch}/${totalBatches}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span>Progress</span>
            <span>{stats.progress}%</span>
          </div>
          <Progress value={stats.progress} className="h-2" />
        </div>
        
        <div className="grid grid-cols-4 gap-2 text-xs">
          <div className="text-center">
            <div className="font-medium text-primary">{stats.completed}</div>
            <div className="text-muted-foreground">Done</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-blue-600">{stats.processing}</div>
            <div className="text-muted-foreground">Active</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-yellow-600">{stats.pending}</div>
            <div className="text-muted-foreground">Queue</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-destructive">{stats.failed}</div>
            <div className="text-muted-foreground">Failed</div>
          </div>
        </div>

        <div className="flex gap-2">
          {!isProcessing ? (
            <Button 
              onClick={startProcessing}
              size="sm"
              disabled={stats.pending === 0 && stats.failed === 0}
              className="flex-1"
            >
              <Play className="w-3 h-3 mr-1" />
              Start
            </Button>
          ) : (
            <Button onClick={stopProcessing} size="sm" variant="destructive" className="flex-1">
              <Square className="w-3 h-3 mr-1" />
              Stop
            </Button>
          )}
          
          {stats.failed > 0 && (
            <Button onClick={retryFailedItems} size="sm" variant="outline">
              <RotateCcw className="w-3 h-3" />
            </Button>
          )}
          
          <Button onClick={clearItems} size="sm" variant="outline">
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default BackgroundRemovalStatus;
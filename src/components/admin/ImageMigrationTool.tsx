import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { Download, CheckCircle, AlertCircle, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MigrationResult {
  processed: number;
  successful: number;
  failed: number;
  errors: string[];
}

export const ImageMigrationTool = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<MigrationResult | null>(null);
  const { toast } = useToast();

  const handleMigration = async () => {
    setIsProcessing(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('migrate-drive-images');

      if (error) {
        throw new Error(error.message);
      }

      if (data?.success) {
        setResult(data.results);
        toast({
          title: "Migration Completed",
          description: `Successfully migrated ${data.results.successful} images`,
        });
      } else {
        throw new Error(data?.error || "Migration failed");
      }
    } catch (error) {
      console.error('Migration error:', error);
      toast({
        title: "Migration Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Google Drive Image Migration
        </CardTitle>
        <CardDescription>
          Automatically migrate product images from Google Drive to Supabase storage.
          Images should be named with SKU (e.g., "ABC123.jpg" or "ABC123.png").
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This will download images from your Google Drive folder and upload them to Supabase storage.
            Existing images will be replaced. Make sure your Google Drive folder is publicly accessible
            or your service account has proper permissions.
          </AlertDescription>
        </Alert>

        <div className="flex items-center gap-4">
          <Button 
            onClick={handleMigration} 
            disabled={isProcessing}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            {isProcessing ? "Migrating Images..." : "Start Migration"}
          </Button>
          
          <a
            href="https://drive.google.com/drive/u/1/folders/1tG66zQTXGR-BQwjYZheRHVQ7s4n6-Jan"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="h-3 w-3" />
            View Google Drive Folder
          </a>
        </div>

        {isProcessing && (
          <div className="space-y-2">
            <Progress value={undefined} className="w-full" />
            <p className="text-sm text-muted-foreground">
              Processing images... This may take a few minutes.
            </p>
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{result.processed}</div>
                <div className="text-sm text-muted-foreground">Processed</div>
              </div>
              <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{result.successful}</div>
                <div className="text-sm text-muted-foreground">Successful</div>
              </div>
              <div className="text-center p-4 bg-red-50 dark:bg-red-950 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{result.failed}</div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
            </div>

            {result.successful > 0 && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Successfully migrated {result.successful} product images to Supabase storage.
                </AlertDescription>
              </Alert>
            )}

            {result.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div>Migration errors:</div>
                  <ul className="mt-2 text-sm">
                    {result.errors.slice(0, 5).map((error, index) => (
                      <li key={index} className="list-disc list-inside">
                        {error}
                      </li>
                    ))}
                    {result.errors.length > 5 && (
                      <li className="text-muted-foreground">
                        ... and {result.errors.length - 5} more errors
                      </li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
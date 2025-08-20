import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, RefreshCw, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PromoteResult {
  promoted: number;
  errors: string[];
}

export const AutoPromoteCandidates = () => {
  const [isPromoting, setIsPromoting] = useState(false);
  const [result, setResult] = useState<PromoteResult | null>(null);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const { toast } = useToast();

  const checkPendingCandidates = async () => {
    try {
      const { data, error } = await supabase
        .from('product_image_candidates')
        .select('id, match_confidence')
        .eq('status', 'pending')
        .gte('match_confidence', 70);

      if (error) throw error;
      setPendingCount(data?.length || 0);
    } catch (error) {
      console.error('Error checking pending candidates:', error);
    }
  };

  const handleAutoPromote = async () => {
    setIsPromoting(true);
    setResult(null);

    try {
      // Get high-confidence pending candidates
      const { data: candidates, error: fetchError } = await supabase
        .from('product_image_candidates')
        .select('id, match_confidence')
        .eq('status', 'pending')
        .gte('match_confidence', 70)
        .order('match_confidence', { ascending: false });

      if (fetchError) throw fetchError;

      if (!candidates || candidates.length === 0) {
        toast({
          title: "No Candidates Found",
          description: "No high-confidence candidates (≥70%) available for promotion",
        });
        setResult({ promoted: 0, errors: [] });
        return;
      }

      console.log(`Found ${candidates.length} high-confidence candidates to promote`);

      let promoted = 0;
      const errors: string[] = [];

      // Promote each candidate
      for (const candidate of candidates) {
        try {
          const { error: promoteError } = await supabase.rpc('promote_image_candidate', {
            candidate_id: candidate.id
          });

          if (promoteError) {
            errors.push(`Failed to promote candidate ${candidate.id}: ${promoteError.message}`);
          } else {
            promoted++;
            console.log(`✅ Promoted candidate ${candidate.id} (${candidate.match_confidence}%)`);
          }
        } catch (error) {
          errors.push(`Error promoting candidate ${candidate.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      setResult({ promoted, errors });
      await checkPendingCandidates(); // Refresh count

      toast({
        title: "Auto-Promotion Complete",
        description: `Promoted ${promoted} high-confidence image candidates`,
      });

    } catch (error) {
      console.error('Auto-promotion error:', error);
      toast({
        title: "Auto-Promotion Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsPromoting(false);
    }
  };

  // Check pending candidates on component mount
  useState(() => {
    checkPendingCandidates();
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Auto-Promote Image Candidates
          {pendingCount > 0 && (
            <Badge variant="secondary">{pendingCount} pending</Badge>
          )}
        </CardTitle>
        <CardDescription>
          Automatically promote high-confidence image candidates (≥70%) to active product images.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            This tool automatically promotes image candidates with confidence scores of 70% or higher. 
            Candidates below this threshold remain pending for manual review.
          </AlertDescription>
        </Alert>

        {/* Control Buttons */}
        <div className="flex items-center gap-4">
          <Button 
            onClick={handleAutoPromote} 
            disabled={isPromoting || pendingCount === 0}
            className="flex items-center gap-2"
          >
            <TrendingUp className="h-4 w-4" />
            {isPromoting ? "Promoting..." : `Promote ${pendingCount} Candidates`}
          </Button>
          
          <Button 
            onClick={checkPendingCandidates}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh Count
          </Button>
        </div>

        {/* Progress Section */}
        {isPromoting && (
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span className="text-sm">Promoting high-confidence candidates...</span>
          </div>
        )}

        {/* Results Section */}
        {result && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                <div className="text-lg font-bold text-green-600">{result.promoted}</div>
                <div className="text-xs text-muted-foreground">Promoted</div>
              </div>
              <div className="text-center p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                <div className="text-lg font-bold text-red-600">{result.errors.length}</div>
                <div className="text-xs text-muted-foreground">Errors</div>
              </div>
            </div>

            {result.promoted > 0 && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription className="text-green-600">
                  Successfully promoted {result.promoted} high-confidence image candidates to active product images.
                </AlertDescription>
              </Alert>
            )}

            {result.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertDescription>
                  {result.errors.length} errors occurred during promotion. Check console for details.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
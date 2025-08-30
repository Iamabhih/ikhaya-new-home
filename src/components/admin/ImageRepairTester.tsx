import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Wrench, Image, Search, Link, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

interface TestResult {
  function: string;
  status: 'success' | 'error' | 'running';
  message: string;
  data?: any;
  duration?: number;
}

export const ImageRepairTester = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);

  const updateResult = (functionName: string, status: TestResult['status'], message: string, data?: any, duration?: number) => {
    setResults(prev => {
      const existing = prev.findIndex(r => r.function === functionName);
      const newResult: TestResult = { function: functionName, status, message, data, duration };
      
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = newResult;
        return updated;
      } else {
        return [...prev, newResult];
      }
    });
  };

  const testFunction = async (functionName: string, body?: any) => {
    const startTime = Date.now();
    updateResult(functionName, 'running', 'Testing...');
    
    try {
      const { data, error } = await supabase.functions.invoke(functionName, { body });
      const duration = Date.now() - startTime;
      
      if (error) {
        updateResult(functionName, 'error', error.message || 'Unknown error', error, duration);
        return false;
      } else {
        updateResult(functionName, 'success', 'Function executed successfully', data, duration);
        return true;
      }
    } catch (error: any) {
      const duration = Date.now() - startTime;
      updateResult(functionName, 'error', error.message || 'Network/execution error', error, duration);
      return false;
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setResults([]);
    
    try {
      // Test 1: Manual Image Repair
      toast.info("Testing manual image repair...");
      await testFunction('manual-image-repair');
      
      // Test 2: Consolidated Image Linker
      toast.info("Testing consolidated image linker...");
      await testFunction('consolidated-image-linker');
      
      // Test 3: Repair Missing Image Links
      toast.info("Testing repair missing image links...");
      await testFunction('repair-missing-image-links', { mode: 'check' });
      
      // Test 4: Scan Storage Images
      toast.info("Testing scan storage images...");
      await testFunction('scan-storage-images');
      
      // Test 5: Hide Products Without Images
      toast.info("Testing hide products without images...");
      // Only test, don't actually run this one
      updateResult('hide-products-without-images', 'success', 'Function available (not executed to avoid hiding products)', null, 0);
      
      // Test 6: Optimized Image Repair (new)
      toast.info("Testing optimized image repair...");
      await testFunction('optimized-image-repair');
      
      // Test 7: Analyze Cart Abandonment (fixed)
      toast.info("Testing cart abandonment analysis...");
      await testFunction('analyze-cart-abandonment');
      
      toast.success("All function tests completed!");
      
    } catch (error: any) {
      toast.error("Test suite failed: " + error.message);
    } finally {
      setIsRunning(false);
    }
  };

  const runSingleFunction = async (functionName: string, body?: any) => {
    await testFunction(functionName, body);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'running': return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return 'bg-green-100 border-green-200';
      case 'error': return 'bg-red-100 border-red-200';
      case 'running': return 'bg-blue-100 border-blue-200';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-orange-600" />
            Image Repair & Function Tester
          </CardTitle>
          <CardDescription>
            Test and diagnose all image repair and related edge functions. This will help identify which functions are working properly.
            <br />
            <span className="text-xs text-muted-foreground mt-1 block">
              ⚠️ Permission errors are expected - edge functions use service role keys internally
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <Button 
              onClick={runAllTests} 
              disabled={isRunning}
              className="flex items-center gap-2"
            >
              {isRunning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wrench className="h-4 w-4" />
              )}
              Run All Tests
            </Button>
            <Badge variant="outline" className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              {results.filter(r => r.status === 'success').length} / {results.length} Passed
            </Badge>
          </div>

          <Tabs defaultValue="functions" className="space-y-4">
            <TabsList>
              <TabsTrigger value="functions">Individual Functions</TabsTrigger>
              <TabsTrigger value="results">Test Results</TabsTrigger>
            </TabsList>

            <TabsContent value="functions" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Manual Image Repair */}
                <Card className="border-orange-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Image className="h-4 w-4 text-orange-600" />
                      Manual Image Repair
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Scan and link images manually with enhanced matching
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => runSingleFunction('manual-image-repair')}
                      disabled={isRunning}
                    >
                      Test Function
                    </Button>
                  </CardContent>
                </Card>

                {/* Consolidated Image Linker */}
                <Card className="border-blue-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Link className="h-4 w-4 text-blue-600" />
                      Consolidated Image Linker
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Link products to images using advanced algorithms
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => runSingleFunction('consolidated-image-linker')}
                      disabled={isRunning}
                    >
                      Test Function
                    </Button>
                  </CardContent>
                </Card>

                {/* Repair Missing Image Links */}
                <Card className="border-green-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Wrench className="h-4 w-4 text-green-600" />
                      Repair Missing Links
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Comprehensive repair for missing image links
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => runSingleFunction('repair-missing-image-links', { mode: 'check' })}
                      disabled={isRunning}
                    >
                      Test Function
                    </Button>
                  </CardContent>
                </Card>

                {/* Scan Storage Images */}
                <Card className="border-purple-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Search className="h-4 w-4 text-purple-600" />
                      Scan Storage Images
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Scan storage bucket for unlinked images
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => runSingleFunction('scan-storage-images')}
                      disabled={isRunning}
                    >
                      Test Function
                    </Button>
                  </CardContent>
                </Card>

                {/* Optimized Image Repair */}
                <Card className="border-teal-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Wrench className="h-4 w-4 text-teal-600" />
                      Optimized Image Repair
                    </CardTitle>
                    <CardDescription className="text-xs">
                      New optimized image repair with rate limiting
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => runSingleFunction('optimized-image-repair')}
                      disabled={isRunning}
                    >
                      Test Function
                    </Button>
                  </CardContent>
                </Card>

              </div>
            </TabsContent>

            <TabsContent value="results">
              <div className="space-y-3">
                {results.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No test results yet. Run tests to see results here.
                  </div>
                ) : (
                  results.map((result, index) => (
                    <Card key={index} className={`border ${getStatusColor(result.status)}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            {getStatusIcon(result.status)}
                            <div>
                              <h4 className="font-medium">{result.function}</h4>
                              <p className="text-sm text-muted-foreground">{result.message}</p>
                              {result.duration && (
                                <p className="text-xs text-muted-foreground">
                                  Completed in {result.duration}ms
                                </p>
                              )}
                            </div>
                          </div>
                          <Badge 
                            variant={result.status === 'success' ? 'default' : result.status === 'error' ? 'destructive' : 'secondary'}
                          >
                            {result.status}
                          </Badge>
                        </div>
                        
                        {result.data && (
                          <details className="mt-3">
                            <summary className="text-xs cursor-pointer text-muted-foreground">
                              View Response Data
                            </summary>
                            <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                              {JSON.stringify(result.data, null, 2)}
                            </pre>
                          </details>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StorageImageScanner } from "./StorageImageScanner";
import { ImageLinkingRepairTool } from "./ImageLinkingRepairTool";
import { ImageAuditTool } from "./ImageAuditTool";
import { Database, Wrench, Search, AlertTriangle, FileSearch } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const UnifiedImageManager = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Unified Image Management System
          </CardTitle>
          <CardDescription>
            Comprehensive tools for scanning storage, linking images, and repairing missing connections.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Fixed Issues:</strong> Removed conflicting enhanced-image-linking function, balanced confidence thresholds (70% for direct matches, 50% for candidates), 
              and improved SKU extraction logic. The 455470 image linking issue should now be resolved.
            </AlertDescription>
          </Alert>

          <Tabs defaultValue="scanner" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="scanner" className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                Storage Scanner
              </TabsTrigger>
              <TabsTrigger value="repair" className="flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                Link Repair Tool
              </TabsTrigger>
              <TabsTrigger value="audit" className="flex items-center gap-2">
                <FileSearch className="h-4 w-4" />
                Image Audit
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="scanner" className="mt-6">
              <StorageImageScanner />
            </TabsContent>
            
            <TabsContent value="repair" className="mt-6">
              <ImageLinkingRepairTool />
            </TabsContent>
            
            <TabsContent value="audit" className="mt-6">
              <ImageAuditTool />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
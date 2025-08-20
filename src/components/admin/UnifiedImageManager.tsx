import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { BatchImageLinker } from "./BatchImageLinker";
import { ImageLinkingRepairTool } from "./ImageLinkingRepairTool";
import { ImageAuditTool } from "./ImageAuditTool";
import { MissingImageReportTool } from "./MissingImageReportTool";
import { AutoPromoteCandidates } from "./AutoPromoteCandidates";
import { Database, Wrench, Search, AlertTriangle, FileSearch, TrendingUp, Zap } from "lucide-react";
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
              <strong>Enhanced System:</strong> Fixed scanning limits (increased to 1000+ per batch), removed redundant StorageImageScanner, 
              added auto-promotion for high-confidence candidates, and streamlined the workflow. Now targeting 535 products without images.
            </AlertDescription>
          </Alert>

          <Tabs defaultValue="batch" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="batch" className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Batch Linker
              </TabsTrigger>
              <TabsTrigger value="repair" className="flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                Link Repair
              </TabsTrigger>
              <TabsTrigger value="promote" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Auto-Promote
              </TabsTrigger>
              <TabsTrigger value="report" className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                Missing Report
              </TabsTrigger>
              <TabsTrigger value="audit" className="flex items-center gap-2">
                <FileSearch className="h-4 w-4" />
                Image Audit
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="batch" className="mt-6">
              <BatchImageLinker />
            </TabsContent>
            
            <TabsContent value="repair" className="mt-6">
              <ImageLinkingRepairTool />
            </TabsContent>
            
            <TabsContent value="promote" className="mt-6">
              <AutoPromoteCandidates />
            </TabsContent>
            
            <TabsContent value="report" className="mt-6">
              <MissingImageReportTool />
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
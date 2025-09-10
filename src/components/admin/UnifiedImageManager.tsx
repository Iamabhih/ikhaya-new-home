import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { MasterImageLinker } from "./MasterImageLinker";
import { ImageAuditTool } from "./ImageAuditTool";
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
            Consolidated Image Management System
          </CardTitle>
          <CardDescription>
            Unified system for comprehensive image linking with step-by-step processing and complete coverage.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Complete Solution:</strong> This consolidated system replaces all fragmented image linking tools. 
              It processes ALL storage images against ALL products in a single comprehensive workflow without limitations.
            </AlertDescription>
          </Alert>

          <Tabs defaultValue="master" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="master" className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                Master Linker
              </TabsTrigger>
              <TabsTrigger value="promote" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Auto-Promote
              </TabsTrigger>
              <TabsTrigger value="audit" className="flex items-center gap-2">
                <FileSearch className="h-4 w-4" />
                Image Audit
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="master" className="mt-6">
              <MasterImageLinker />
            </TabsContent>
            
            <TabsContent value="promote" className="mt-6">
              <AutoPromoteCandidates />
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
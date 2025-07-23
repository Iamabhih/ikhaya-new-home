import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Info, Download, Image as ImageIcon, Palette, FileImage } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const BannerDesignGuide = () => {
  const bannerSpecs = [
    {
      type: "Hero Banner (Desktop)",
      dimensions: "1920 × 600px",
      aspectRatio: "16:5",
      description: "Main promotional banner for desktop displays",
      fileSize: "< 500KB",
      format: "JPG, PNG, WebP"
    },
    {
      type: "Hero Banner (Mobile)",
      dimensions: "750 × 500px",
      aspectRatio: "3:2",
      description: "Mobile-optimized version of hero banner",
      fileSize: "< 300KB",
      format: "JPG, PNG, WebP"
    },
    {
      type: "Strip Banner",
      dimensions: "1920 × 120px",
      aspectRatio: "16:1",
      description: "Thin promotional strip for announcements",
      fileSize: "< 150KB",
      format: "JPG, PNG, WebP"
    },
    {
      type: "Square Banner",
      dimensions: "800 × 800px",
      aspectRatio: "1:1",
      description: "Social media style square banners",
      fileSize: "< 400KB",
      format: "JPG, PNG, WebP"
    }
  ];

  const designTips = [
    {
      title: "Text Contrast",
      description: "Ensure text has sufficient contrast against the background. Use dark text on light backgrounds or light text on dark backgrounds.",
      icon: <Palette className="h-4 w-4" />
    },
    {
      title: "Safe Zone",
      description: "Keep important text and elements at least 60px from the edges to ensure visibility across all devices.",
      icon: <ImageIcon className="h-4 w-4" />
    },
    {
      title: "File Optimization",
      description: "Compress images without losing quality. Use WebP format when possible for better compression.",
      icon: <FileImage className="h-4 w-4" />
    },
    {
      title: "Mobile First",
      description: "Design for mobile screens first, then scale up. Important elements should be visible on small screens.",
      icon: <Download className="h-4 w-4" />
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Banner Design Guide</h2>
        <p className="text-muted-foreground">
          Guidelines and specifications for creating promotional banners
        </p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Follow these specifications to ensure your banners display correctly across all devices and platforms.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 md:grid-cols-2">
        {bannerSpecs.map((spec, index) => (
          <Card key={index} className="overflow-hidden">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{spec.type}</CardTitle>
                <Badge variant="secondary">{spec.aspectRatio}</Badge>
              </div>
              <CardDescription>{spec.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <AspectRatio ratio={spec.type.includes("Strip") ? 16/1 : spec.type.includes("Square") ? 1 : 16/5}>
                  <div className="w-full h-full bg-gradient-to-r from-primary/20 to-primary/30 rounded border-2 border-dashed border-primary/30 flex items-center justify-center">
                    <div className="text-center space-y-1">
                      <ImageIcon className="h-8 w-8 mx-auto text-primary/60" />
                      <div className="text-sm font-medium text-primary/80">{spec.dimensions}</div>
                    </div>
                  </div>
                </AspectRatio>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="font-medium text-muted-foreground">Dimensions</div>
                  <div className="font-mono">{spec.dimensions}</div>
                </div>
                <div>
                  <div className="font-medium text-muted-foreground">Max File Size</div>
                  <div>{spec.fileSize}</div>
                </div>
                <div className="col-span-2">
                  <div className="font-medium text-muted-foreground">Supported Formats</div>
                  <div>{spec.format}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Design Best Practices
          </CardTitle>
          <CardDescription>
            Tips to create effective and professional-looking banners
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {designTips.map((tip, index) => (
              <div key={index} className="flex gap-3 p-4 rounded-lg border bg-card">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  {tip.icon}
                </div>
                <div className="space-y-1">
                  <div className="font-medium">{tip.title}</div>
                  <div className="text-sm text-muted-foreground">{tip.description}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Color Guidelines</CardTitle>
          <CardDescription>
            Use these brand colors for consistent banner design
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="h-16 bg-primary rounded-lg border"></div>
              <div className="text-sm">
                <div className="font-medium">Primary</div>
                <div className="text-muted-foreground font-mono text-xs">hsl(var(--primary))</div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-16 bg-secondary rounded-lg border"></div>
              <div className="text-sm">
                <div className="font-medium">Secondary</div>
                <div className="text-muted-foreground font-mono text-xs">hsl(var(--secondary))</div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-16 bg-accent rounded-lg border"></div>
              <div className="text-sm">
                <div className="font-medium">Accent</div>
                <div className="text-muted-foreground font-mono text-xs">hsl(var(--accent))</div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-16 bg-muted rounded-lg border"></div>
              <div className="text-sm">
                <div className="font-medium">Muted</div>
                <div className="text-muted-foreground font-mono text-xs">hsl(var(--muted))</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
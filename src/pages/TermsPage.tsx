
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { FileText, ShoppingCart, Shield, AlertTriangle, Scale, Globe } from "lucide-react";

const TermsPage = () => {
  const lastUpdated = "March 1, 2024";

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem>
              <BreadcrumbPage>Terms of Service</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="space-y-8 max-w-4xl mx-auto">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">Terms of Service</h1>
            <p className="text-xl text-muted-foreground">
              Please read these terms carefully before using our services.
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              Last updated: {lastUpdated}
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Agreement to Terms
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                By accessing and using OZZ Cash & Carry's website and services, you accept and agree 
                to be bound by the terms and provision of this agreement. If you do not agree to 
                these terms, you should not use this website.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Use of the Website
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Permitted Use</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  You may use our website for:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                  <li>• Browsing and purchasing our products</li>
                  <li>• Creating and managing your account</li>
                  <li>• Accessing customer support</li>
                  <li>• Subscribing to our newsletter</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Prohibited Use</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  You may not use our website to:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                  <li>• Violate any applicable laws or regulations</li>
                  <li>• Transmit harmful or malicious code</li>
                  <li>• Attempt to gain unauthorized access</li>
                  <li>• Interfere with website functionality</li>
                  <li>• Use automated systems to scrape content</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5" />
                Orders and Payments
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Order Acceptance</h4>
                <p className="text-sm text-muted-foreground">
                  All orders are subject to acceptance and availability. We reserve the right 
                  to refuse or cancel any order for any reason at any time.
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Pricing</h4>
                <p className="text-sm text-muted-foreground">
                  All prices are in South African Rand (ZAR) and include VAT where applicable. 
                  Prices are subject to change without notice.
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Payment</h4>
                <p className="text-sm text-muted-foreground">
                  Payment must be made at the time of ordering. We accept credit cards, 
                  debit cards, and bank transfers.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Product Information and Warranties
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Product Descriptions</h4>
                <p className="text-sm text-muted-foreground">
                  We strive to provide accurate product descriptions and images. However, 
                  we do not warrant that descriptions are accurate, complete, or error-free.
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Warranties</h4>
                <p className="text-sm text-muted-foreground">
                  Products come with manufacturer warranties where applicable. Additional 
                  warranty information is provided on individual product pages.
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Returns</h4>
                <p className="text-sm text-muted-foreground">
                  Returns are subject to our return policy. Items must be returned within 
                  30 days in original condition.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Limitation of Liability
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Disclaimer</h4>
                <p className="text-sm text-muted-foreground">
                  Our website and services are provided "as is" without any representations 
                  or warranties, express or implied.
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Limitation</h4>
                <p className="text-sm text-muted-foreground">
                  In no event shall OZZ Cash & Carry be liable for any indirect, incidental, 
                  special, consequential, or punitive damages.
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Maximum Liability</h4>
                <p className="text-sm text-muted-foreground">
                  Our total liability to you for any claim shall not exceed the amount 
                  you paid for the specific product or service.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Intellectual Property
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Ownership</h4>
                <p className="text-sm text-muted-foreground">
                  All content on this website, including text, graphics, logos, images, 
                  and software, is owned by OZZ Cash & Carry or its content suppliers.
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Usage Rights</h4>
                <p className="text-sm text-muted-foreground">
                  You may not reproduce, distribute, modify, or create derivative works 
                  of our content without express written permission.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Governing Law and Disputes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Applicable Law</h4>
                <p className="text-sm text-muted-foreground">
                  These terms are governed by the laws of South Africa, without regard 
                  to conflict of law principles.
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Dispute Resolution</h4>
                <p className="text-sm text-muted-foreground">
                  Any disputes arising from these terms or your use of our services 
                  shall be resolved through binding arbitration in Cape Town, South Africa.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Changes to Terms</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                We reserve the right to modify these terms at any time. Changes will be 
                effective immediately upon posting. Your continued use of the website 
                constitutes acceptance of the modified terms.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="text-center py-8">
              <h3 className="font-medium mb-2">Questions About These Terms?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                If you have any questions about these Terms of Service, please contact us:
              </p>
              <div className="space-y-1 text-sm">
                <p><strong>Email:</strong> info@ozzgroup.co.za</p>
                <p><strong>Phone:</strong> +27 31 332 7192</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TermsPage;

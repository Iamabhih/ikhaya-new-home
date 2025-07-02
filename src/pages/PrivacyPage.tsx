
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { Shield, Eye, Lock, UserCheck, Mail, Database } from "lucide-react";

const PrivacyPage = () => {
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
              <BreadcrumbPage>Privacy Policy</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="space-y-8 max-w-4xl mx-auto">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
            <p className="text-xl text-muted-foreground">
              Your privacy is important to us. This policy explains how we collect, use, and protect your information.
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              Last updated: {lastUpdated}
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Our Commitment to Privacy
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <p>
                Ikhaya Homeware ("we," "our," or "us") is committed to protecting your privacy. 
                This Privacy Policy explains how we collect, use, disclose, and safeguard your 
                information when you visit our website or make a purchase from us.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Information We Collect
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Personal Information</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  We collect information you provide directly to us, such as:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                  <li>• Name, email address, and phone number</li>
                  <li>• Billing and shipping addresses</li>
                  <li>• Payment information (processed securely by third parties)</li>
                  <li>• Account preferences and order history</li>
                  <li>• Communication preferences</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Automatically Collected Information</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  We automatically collect certain information about your visit:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                  <li>• IP address and browser information</li>
                  <li>• Pages visited and time spent on our site</li>
                  <li>• Referring websites and search terms</li>
                  <li>• Device type and operating system</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                How We Use Your Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Order Processing</h4>
                  <p className="text-sm text-muted-foreground">
                    To process and fulfill your orders, communicate about your purchases, 
                    and provide customer support.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Account Management</h4>
                  <p className="text-sm text-muted-foreground">
                    To create and manage your account, track your order history, 
                    and customize your shopping experience.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Communication</h4>
                  <p className="text-sm text-muted-foreground">
                    To send order confirmations, shipping updates, and marketing 
                    communications (with your consent).
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Improvement</h4>
                  <p className="text-sm text-muted-foreground">
                    To analyze website usage, improve our services, and develop 
                    new features and products.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Information Security
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Data Protection</h4>
                  <p className="text-sm text-muted-foreground">
                    We implement appropriate security measures to protect your personal 
                    information against unauthorized access, alteration, disclosure, or destruction.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Secure Transactions</h4>
                  <p className="text-sm text-muted-foreground">
                    All payment information is encrypted and processed through secure, 
                    PCI-compliant payment processors. We do not store credit card information.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Data Retention</h4>
                  <p className="text-sm text-muted-foreground">
                    We retain your information only as long as necessary to fulfill the 
                    purposes for which it was collected or as required by law.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                Your Rights and Choices
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Access and Update</h4>
                  <p className="text-sm text-muted-foreground">
                    You can access and update your personal information through your account 
                    settings or by contacting us directly.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Marketing Communications</h4>
                  <p className="text-sm text-muted-foreground">
                    You can opt out of marketing emails at any time by clicking the unsubscribe 
                    link or updating your communication preferences.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Data Deletion</h4>
                  <p className="text-sm text-muted-foreground">
                    You can request deletion of your personal information, subject to certain 
                    legal and business requirements.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                If you have questions about this Privacy Policy or our data practices, 
                please contact us:
              </p>
              <div className="space-y-2 text-sm">
                <p><strong>Email:</strong> privacy@ikhaya.shop</p>
                <p><strong>Phone:</strong> +27 31 332 7192</p>
                <p><strong>Address:</strong>40 Mazeppa & Gull Street, Durban, Kwa-Zulu Natal, 4001, South Africa</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="text-center py-8">
              <p className="text-sm text-muted-foreground">
                This Privacy Policy may be updated from time to time. We will notify you of 
                any material changes by posting the new policy on this page and updating the 
                "Last updated" date.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PrivacyPage;

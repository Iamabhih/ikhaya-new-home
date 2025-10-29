import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HelpCircle, ShoppingCart, Truck, RotateCcw, CreditCard, Shield } from "lucide-react";
const FAQPage = () => {
  const faqCategories = [{
    title: "Orders & Shopping",
    icon: ShoppingCart,
    items: [{
      question: "How do I place an order?",
      answer: "You can place an order by browsing our products, adding items to your cart, and proceeding to checkout. You'll need to create an account or sign in to complete your purchase."
    }, {
      question: "Can I modify or cancel my order?",
      answer: "You can modify or cancel your order within 1 hour of placing it. After this time, your order will be processed and cannot be changed. Contact us immediately if you need to make changes."
    }, {
      question: "Do you offer wholesale pricing?",
      answer: "Yes, we offer wholesale pricing for bulk orders. Please contact us with your requirements, and we'll provide a custom quote for wholesale purchases."
    }, {
      question: "What payment methods do you accept?",
      answer: "We accept all major credit cards, debit cards, and bank transfers. All payments are processed securely through our encrypted payment system."
    }]
  }, {
    title: "Shipping & Delivery",
    icon: Truck,
    items: [{
      question: "What are your shipping costs and delivery times?",
      answer: "Shipping costs vary by location and order size. Standard delivery takes 3-5 business days within South Africa. Free shipping is available on orders over R1000."
    }, {
      question: "Do you ship internationally?",
      answer: "Currently, we only ship within South Africa. We're working on expanding our shipping options to include international delivery in the future."
    }, {
      question: "How can I track my order?",
      answer: "Once your order ships, you'll receive a tracking number via email. You can also track your order status by logging into your account and viewing your order history."
    }, {
      question: "What if my item arrives damaged?",
      answer: "If your item arrives damaged, please contact us within 48 hours with photos of the damage. We'll arrange for a replacement or full refund at no cost to you."
    }]
  }, {
    title: "Returns & Refunds",
    icon: RotateCcw,
    items: [{
      question: "What is your return policy?",
      answer: "You can return items within 30 days of delivery in their original condition. Items must be unused, in original packaging with all tags attached."
    }, {
      question: "How do I return an item?",
      answer: "To return an item, go to your order history and click 'Request Return' on eligible orders. Follow the instructions to print a return label and ship the item back to us."
    }, {
      question: "When will I receive my refund?",
      answer: "Refunds are processed within 5-7 business days after we receive your returned item. The refund will be credited to your original payment method."
    }, {
      question: "Do I have to pay for return shipping?",
      answer: "Return shipping is free for defective or damaged items. For other returns, customers are responsible for return shipping costs unless the item was purchased with a premium protection plan."
    }]
  }, {
    title: "Account & Security",
    icon: Shield,
    items: [{
      question: "How do I create an account?",
      answer: "Click 'Sign In' in the top navigation and select 'Create Account'. You'll need to provide your email address and create a password. We'll send you a confirmation email to verify your account."
    }, {
      question: "I forgot my password. How do I reset it?",
      answer: "On the sign-in page, click 'Forgot Password' and enter your email address. We'll send you a link to reset your password. The link expires after 24 hours for security."
    }, {
      question: "Is my personal information secure?",
      answer: "Yes, we use industry-standard encryption to protect your personal and payment information. We never store your credit card details, and all transactions are processed through secure payment gateways."
    }, {
      question: "How do I update my account information?",
      answer: "Log into your account and go to 'Account Settings' to update your personal information, shipping addresses, and communication preferences."
    }]
  }, {
    title: "Products & Quality",
    icon: HelpCircle,
    items: [{
      question: "Are your products authentic?",
      answer: "Yes, all our products are 100% authentic and sourced directly from manufacturers or authorized distributors. We guarantee the quality and authenticity of every item we sell."
    }, {
      question: "Do you offer product warranties?",
      answer: "Many of our products come with manufacturer warranties. Warranty information is provided on individual product pages. We also offer extended protection plans for select items."
    }, {
      question: "Can I see products in person before buying?",
      answer: "We're an online-only retailer, but we provide detailed product descriptions, multiple photos, and customer reviews to help you make informed decisions. Our return policy allows you to return items that don't meet your expectations."
    }, {
      question: "How often do you add new products?",
      answer: "We regularly update our inventory with new products. Sign up for our newsletter to be notified about new arrivals, special offers, and seasonal collections."
    }]
  }];
  return <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem>
              <BreadcrumbPage>FAQ</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">Frequently Asked Questions</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Find answers to common questions about shopping with OZZ Cash & Carry. 
              Can't find what you're looking for? Contact our customer service team.
            </p>
          </div>

          <div className="grid gap-8">
            {faqCategories.map((category, categoryIndex) => <Card key={categoryIndex}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <category.icon className="h-6 w-6 text-primary" />
                    {category.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="space-y-2">
                    {category.items.map((item, itemIndex) => <AccordionItem key={itemIndex} value={`${categoryIndex}-${itemIndex}`}>
                        <AccordionTrigger className="text-left">
                          {item.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">
                          {item.answer}
                        </AccordionContent>
                      </AccordionItem>)}
                  </Accordion>
                </CardContent>
              </Card>)}
          </div>

          <Card>
            <CardContent className="text-center py-12">
              <HelpCircle className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
              <h2 className="text-2xl font-semibold mb-2">Still Need Help?</h2>
              <p className="text-muted-foreground mb-6">
                Our customer service team is here to help you with any questions or concerns.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <div className="text-center">
                  <p className="font-medium">Email Support</p>
                  <p className="text-muted-foreground">support@ozzgroup.co.za</p>
                  <p className="text-sm text-muted-foreground">Response within 24 hours</p>
                </div>
                <div className="text-center">
                  <p className="font-medium">Phone Support</p>
                  <p className="text-muted-foreground">+27 31 332 7192</p>
                  <p className="text-sm text-muted-foreground">Mon-Fri 9AM-5PM</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>;
};
export default FAQPage;
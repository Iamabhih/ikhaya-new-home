import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Building2, Loader2, CheckCircle } from "lucide-react";

const traderFormSchema = z.object({
  companyName: z.string().min(2, "Company name is required"),
  tradingName: z.string().optional(),
  vatNumber: z.string().optional(),
  registrationNumber: z.string().optional(),
  contactPerson: z.string().min(2, "Contact person name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(10, "Valid phone number is required"),
  address: z.string().min(10, "Business address is required"),
  city: z.string().min(2, "City is required"),
  province: z.string().min(2, "Province is required"),
  postalCode: z.string().min(4, "Postal code is required"),
  businessType: z.string().min(2, "Business type is required"),
  yearsInBusiness: z.string().optional(),
  estimatedMonthlyOrders: z.string().optional(),
  additionalInfo: z.string().optional(),
});

type TraderFormData = z.infer<typeof traderFormSchema>;

interface TraderApplicationFormProps {
  trigger?: React.ReactNode;
}

export const TraderApplicationForm = ({ trigger }: TraderApplicationFormProps) => {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { user } = useAuth();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TraderFormData>({
    resolver: zodResolver(traderFormSchema),
    defaultValues: {
      email: user?.email || "",
    },
  });

  const onSubmit = async (data: TraderFormData) => {
    setIsSubmitting(true);

    try {
      // Insert into trader_applications table
      const { error: insertError } = await supabase
        .from("trader_applications")
        .insert({
          user_id: user?.id || null,
          company_name: data.companyName,
          trading_name: data.tradingName || null,
          vat_number: data.vatNumber || null,
          registration_number: data.registrationNumber || null,
          business_type: data.businessType,
          contact_person: data.contactPerson,
          email: data.email,
          phone: data.phone,
          address: data.address,
          city: data.city,
          province: data.province,
          postal_code: data.postalCode,
          years_in_business: data.yearsInBusiness || null,
          estimated_monthly_orders: data.estimatedMonthlyOrders || null,
          additional_info: data.additionalInfo || null,
          status: 'pending',
        });

      if (insertError) {
        console.error("Insert error:", insertError);
        throw insertError;
      }

      // Send notification email to admin
      const { error: emailError } = await supabase.functions.invoke("send-email", {
        body: {
          type: "admin-notification",
          to: "queries@ozzsa.com",
          data: {
            type: "trader-application",
            subject: `New Trader Application - ${data.companyName}`,
            message: `A new trader application has been submitted.`,
            applicationDetails: {
              companyName: data.companyName,
              tradingName: data.tradingName || "N/A",
              vatNumber: data.vatNumber || "N/A",
              registrationNumber: data.registrationNumber || "N/A",
              contactPerson: data.contactPerson,
              email: data.email,
              phone: data.phone,
              address: `${data.address}, ${data.city}, ${data.province}, ${data.postalCode}`,
              businessType: data.businessType,
              yearsInBusiness: data.yearsInBusiness || "N/A",
              estimatedMonthlyOrders: data.estimatedMonthlyOrders || "N/A",
              additionalInfo: data.additionalInfo || "N/A",
              userId: user?.id || "Guest Application",
              submittedAt: new Date().toISOString(),
            },
            actionUrl: "/admin/users",
            actionText: "Review Application",
          },
        },
      });

      if (emailError) {
        console.error("Email error:", emailError);
        // Still show success even if email fails - application data is stored
      }

      setSubmitted(true);
      toast.success("Application submitted successfully! We'll be in touch soon.");

      // Reset form after delay
      setTimeout(() => {
        reset();
        setSubmitted(false);
        setOpen(false);
      }, 3000);

    } catch (error) {
      console.error("Submission error:", error);
      toast.error("Failed to submit application. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const defaultTrigger = (
    <Button className="bg-[#DC3545] hover:bg-[#BB2D3B] text-white font-semibold">
      <Building2 className="h-4 w-4 mr-2" />
      Become a Trader
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            Trader Application
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Apply for a wholesale trading account to access bulk pricing and exclusive offers.
          </p>
        </DialogHeader>

        {submitted ? (
          <div className="py-12 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Application Submitted!</h3>
            <p className="text-muted-foreground">
              Thank you for your application. Our team will review your details and contact you within 2-3 business days.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-4">
            {/* Company Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">Company Information</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name *</Label>
                  <Input
                    id="companyName"
                    {...register("companyName")}
                    placeholder="Enter company name"
                  />
                  {errors.companyName && (
                    <p className="text-xs text-red-500">{errors.companyName.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tradingName">Trading Name</Label>
                  <Input
                    id="tradingName"
                    {...register("tradingName")}
                    placeholder="If different from company name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vatNumber">VAT Number</Label>
                  <Input
                    id="vatNumber"
                    {...register("vatNumber")}
                    placeholder="e.g., 4123456789"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="registrationNumber">Company Registration Number</Label>
                  <Input
                    id="registrationNumber"
                    {...register("registrationNumber")}
                    placeholder="e.g., 2023/123456/07"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="businessType">Type of Business *</Label>
                <Input
                  id="businessType"
                  {...register("businessType")}
                  placeholder="e.g., Retailer, Wholesaler, Restaurant, etc."
                />
                {errors.businessType && (
                  <p className="text-xs text-red-500">{errors.businessType.message}</p>
                )}
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">Contact Information</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactPerson">Contact Person *</Label>
                  <Input
                    id="contactPerson"
                    {...register("contactPerson")}
                    placeholder="Full name"
                  />
                  {errors.contactPerson && (
                    <p className="text-xs text-red-500">{errors.contactPerson.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    {...register("phone")}
                    placeholder="+27 XX XXX XXXX"
                  />
                  {errors.phone && (
                    <p className="text-xs text-red-500">{errors.phone.message}</p>
                  )}
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    {...register("email")}
                    placeholder="business@example.com"
                  />
                  {errors.email && (
                    <p className="text-xs text-red-500">{errors.email.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Business Address */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">Business Address</h3>

              <div className="space-y-2">
                <Label htmlFor="address">Street Address *</Label>
                <Input
                  id="address"
                  {...register("address")}
                  placeholder="Street address"
                />
                {errors.address && (
                  <p className="text-xs text-red-500">{errors.address.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    {...register("city")}
                    placeholder="City"
                  />
                  {errors.city && (
                    <p className="text-xs text-red-500">{errors.city.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="province">Province *</Label>
                  <Input
                    id="province"
                    {...register("province")}
                    placeholder="Province"
                  />
                  {errors.province && (
                    <p className="text-xs text-red-500">{errors.province.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="postalCode">Postal Code *</Label>
                  <Input
                    id="postalCode"
                    {...register("postalCode")}
                    placeholder="Postal code"
                  />
                  {errors.postalCode && (
                    <p className="text-xs text-red-500">{errors.postalCode.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">Additional Information</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="yearsInBusiness">Years in Business</Label>
                  <Input
                    id="yearsInBusiness"
                    {...register("yearsInBusiness")}
                    placeholder="e.g., 5 years"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estimatedMonthlyOrders">Estimated Monthly Order Value</Label>
                  <Input
                    id="estimatedMonthlyOrders"
                    {...register("estimatedMonthlyOrders")}
                    placeholder="e.g., R10,000 - R50,000"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="additionalInfo">Additional Information</Label>
                <Textarea
                  id="additionalInfo"
                  {...register("additionalInfo")}
                  placeholder="Tell us more about your business and what products you're interested in..."
                  rows={3}
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[#DC3545] hover:bg-[#BB2D3B]"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Building2 className="h-4 w-4 mr-2" />
                    Submit Application
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

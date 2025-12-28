import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, CheckCircle, XCircle, Clock } from "lucide-react";

interface CommunicationLogProps {
  orderId: string;
  customerEmail: string;
}

export const CommunicationLog = ({ orderId, customerEmail }: CommunicationLogProps) => {
  const { data: emails, isLoading } = useQuery({
    queryKey: ['email-logs', customerEmail, orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_logs')
        .select('*')
        .eq('email_address', customerEmail)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    },
    enabled: !!customerEmail,
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Mail className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Sent</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Communication History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : emails?.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No emails sent to this customer yet
          </p>
        ) : (
          <div className="space-y-3">
            {emails?.map((email) => (
              <div 
                key={email.id}
                className="flex items-start gap-3 p-3 border rounded-lg"
              >
                {getStatusIcon(email.status)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-sm truncate">{email.subject}</p>
                    {getStatusBadge(email.status)}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {email.template_name}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(email.created_at).toLocaleString()}
                    </span>
                  </div>
                  {email.error_message && (
                    <p className="text-xs text-destructive mt-1">{email.error_message}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

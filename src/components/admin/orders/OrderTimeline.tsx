import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  Package,
  Truck,
  CheckCircle,
  AlertCircle,
  User,
  MessageSquare,
  CreditCard
} from "lucide-react";

interface TimelineItem {
  id: string;
  event_type: string;
  event_title: string;
  event_description: string;
  previous_value?: string;
  new_value?: string;
  metadata?: any;
  created_at: string;
  profiles?: {
    first_name: string;
    last_name: string;
  };
}

interface OrderTimelineProps {
  timeline: TimelineItem[];
}

export const OrderTimeline = ({ timeline }: OrderTimelineProps) => {
  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'status_change':
        return <Package className="h-4 w-4" />;
      case 'fulfillment_change':
        return <Truck className="h-4 w-4" />;
      case 'shipped':
        return <Truck className="h-4 w-4" />;
      case 'delivered':
        return <CheckCircle className="h-4 w-4" />;
      case 'payment':
        return <CreditCard className="h-4 w-4" />;
      case 'note':
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'status_change':
        return 'bg-blue-100 text-blue-800';
      case 'fulfillment_change':
        return 'bg-orange-100 text-orange-800';
      case 'shipped':
        return 'bg-green-100 text-green-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'payment':
        return 'bg-purple-100 text-purple-800';
      case 'note':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Order Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        {timeline.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No timeline events yet
          </p>
        ) : (
          <div className="space-y-4">
            {timeline.map((event) => (
              <div key={event.id} className="flex gap-4 p-4 border rounded-lg">
                <div className={`flex-shrink-0 p-2 rounded-full ${getEventColor(event.event_type)}`}>
                  {getEventIcon(event.event_type)}
                </div>
                
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{event.event_title}</h4>
                    <span className="text-sm text-muted-foreground">
                      {new Date(event.created_at).toLocaleString()}
                    </span>
                  </div>
                  
                  {event.event_description && (
                    <p className="text-sm text-muted-foreground">
                      {event.event_description}
                    </p>
                  )}
                  
                  {event.previous_value && event.new_value && (
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="outline">{event.previous_value}</Badge>
                      <span>→</span>
                      <Badge variant="outline">{event.new_value}</Badge>
                    </div>
                  )}
                  
                  {event.profiles && (
                    <p className="text-xs text-muted-foreground">
                      by {event.profiles.first_name} {event.profiles.last_name}
                    </p>
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
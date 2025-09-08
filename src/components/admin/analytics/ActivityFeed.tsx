import { useRealTimeAnalytics } from "@/hooks/useRealTimeAnalytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity, Eye, ShoppingCart, User, CreditCard, Package, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const getEventIcon = (eventType: string) => {
  switch (eventType) {
    case 'page_view':
      return <Eye className="h-3 w-3" />;
    case 'product_view':
      return <Eye className="h-3 w-3" />;
    case 'cart':
      return <ShoppingCart className="h-3 w-3" />;
    case 'purchase':
      return <CreditCard className="h-3 w-3" />;
    case 'user_signup':
      return <User className="h-3 w-3" />;
    default:
      return <Activity className="h-3 w-3" />;
  }
};

const getEventColor = (eventType: string) => {
  switch (eventType) {
    case 'page_view':
      return 'bg-blue-100 text-blue-800';
    case 'product_view':
      return 'bg-green-100 text-green-800';
    case 'cart':
      return 'bg-yellow-100 text-yellow-800';
    case 'purchase':
      return 'bg-purple-100 text-purple-800';
    case 'user_signup':
      return 'bg-pink-100 text-pink-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const formatEventMessage = (event: any) => {
  switch (event.type) {
    case 'page_view':
      return `Visited ${event.page_path || 'unknown page'}`;
    case 'product_view':
      return `Viewed product ${event.product_id ? `(ID: ${event.product_id.slice(0, 8)}...)` : ''}`;
    case 'cart':
      return event.action === 'item_added_to_cart' ? 'Added item to cart' : 'Cart interaction';
    case 'purchase':
      return `Completed order ${event.metadata?.order_id ? `(${event.metadata.order_id.slice(0, 8)}...)` : ''}`;
    case 'user_signup':
      return 'New user registered';
    default:
      return event.action || 'Unknown activity';
  }
};

export const ActivityFeed = () => {
  const { getActivityFeed, getMetricsSummary, isLoading } = useRealTimeAnalytics();
  
  const activityFeed = getActivityFeed();
  const metrics = getMetricsSummary();

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-muted rounded w-32"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-muted rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-muted rounded w-full mb-1"></div>
                  <div className="h-3 bg-muted rounded w-24"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            Live Activity Feed
          </span>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-muted-foreground">
              {metrics.totalEvents} events in last hour
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Metrics Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Active Users</p>
            <p className="text-lg font-semibold">{metrics.uniqueUsers}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Page Views</p>
            <p className="text-lg font-semibold">{metrics.pageViews}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Cart Events</p>
            <p className="text-lg font-semibold">{metrics.cartEvents}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Conversions</p>
            <p className="text-lg font-semibold">{metrics.conversions}</p>
          </div>
        </div>

        {/* Activity Stream */}
        <ScrollArea className="h-[400px]">
          {activityFeed.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              <div className="text-center">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No recent activity</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {activityFeed.map((event) => (
                <div key={event.id} className="flex items-start gap-3 p-3 rounded-lg bg-card border">
                  <div className="flex-shrink-0">
                    <div className={`p-2 rounded-full ${getEventColor(event.type)}`}>
                      {getEventIcon(event.type)}
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium truncate">
                        {formatEventMessage(event)}
                      </p>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant="outline" className="text-xs">
                          {event.type.replace('_', ' ')}
                        </Badge>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      {event.user_id && (
                        <span>User: {event.user_id.slice(0, 8)}...</span>
                      )}
                      {event.session_id && (
                        <span>Session: {event.session_id.slice(0, 8)}...</span>
                      )}
                      {event.metadata && Object.keys(event.metadata).length > 0 && (
                        <span>+ metadata</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
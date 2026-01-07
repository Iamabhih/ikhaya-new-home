import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, ShoppingCart, Users, DollarSign, Package } from 'lucide-react';

interface StatItem {
  label: string;
  value: string | number;
  change?: number;
  trend?: 'up' | 'down' | 'neutral';
  icon?: React.ReactNode;
}

interface AnalyticsOverviewProps {
  stats?: StatItem[];
  className?: string;
}

/**
 * Analytics Overview Component
 * Displays key metrics in card format
 */
export const AnalyticsOverview: React.FC<AnalyticsOverviewProps> = ({ 
  stats = [],
  className 
}) => {
  const defaultStats: StatItem[] = [
    { label: 'Total Revenue', value: 'R0.00', icon: <DollarSign className="h-5 w-5" /> },
    { label: 'Total Orders', value: 0, icon: <ShoppingCart className="h-5 w-5" /> },
    { label: 'Total Customers', value: 0, icon: <Users className="h-5 w-5" /> },
    { label: 'Total Products', value: 0, icon: <Package className="h-5 w-5" /> },
  ];

  const displayStats = stats.length > 0 ? stats : defaultStats;

  const getTrendIcon = (trend?: 'up' | 'down' | 'neutral') => {
    if (trend === 'up') return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend === 'down') return <TrendingDown className="h-4 w-4 text-red-500" />;
    return null;
  };

  const getTrendColor = (trend?: 'up' | 'down' | 'neutral') => {
    if (trend === 'up') return 'text-green-500';
    if (trend === 'down') return 'text-red-500';
    return 'text-muted-foreground';
  };

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${className || ''}`}>
      {displayStats.map((stat, index) => (
        <Card key={index} className="bg-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.label}
            </CardTitle>
            {stat.icon && (
              <div className="text-muted-foreground">
                {stat.icon}
              </div>
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {stat.value}
            </div>
            {stat.change !== undefined && (
              <div className={`flex items-center gap-1 text-xs ${getTrendColor(stat.trend)}`}>
                {getTrendIcon(stat.trend)}
                <span>{stat.change > 0 ? '+' : ''}{stat.change}% from last period</span>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default AnalyticsOverview;

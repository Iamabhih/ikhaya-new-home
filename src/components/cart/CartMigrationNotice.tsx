import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, ArrowRight, CheckCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCartMigration } from '@/hooks/useCartMigration';
import { useCart } from '@/hooks/useCart';

/**
 * Component that shows when session cart items need to be migrated to user account
 */
export const CartMigrationNotice = () => {
  const { user } = useAuth();
  const { items } = useCart();
  const { migrateCart, isMigrating } = useCartMigration();
  const [showNotice, setShowNotice] = useState(false);
  const [sessionItemCount, setSessionItemCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setShowNotice(false);
      return;
    }

    // Check if there are session cart items that haven't been migrated yet
    const sessionId = localStorage.getItem('cart_session_id');
    if (sessionId && items.length === 0) {
      // There might be session items that need migration
      // This will be handled automatically by useCartMigration
      // but we can show a notice for user awareness
      const storedCount = localStorage.getItem('session_cart_count');
      if (storedCount && parseInt(storedCount) > 0) {
        setSessionItemCount(parseInt(storedCount));
        setShowNotice(true);
      }
    }
  }, [user, items.length]);

  // Hide notice when migration completes
  useEffect(() => {
    if (!isMigrating && showNotice) {
      // Small delay to show success state
      const timer = setTimeout(() => {
        setShowNotice(false);
        localStorage.removeItem('session_cart_count');
      }, 2000);
      
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isMigrating, showNotice]);

  if (!showNotice || !user) {
    return null;
  }

  const handleManualMigration = () => {
    migrateCart();
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5 mb-4">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <ShoppingCart className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h4 className="font-medium text-sm">
                {isMigrating ? 'Syncing Your Cart...' : 'Welcome back!'}
              </h4>
              <p className="text-xs text-muted-foreground">
                {isMigrating 
                  ? 'Merging your previous cart items with your account'
                  : `You have ${sessionItemCount} item${sessionItemCount > 1 ? 's' : ''} from your previous session`
                }
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {sessionItemCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {sessionItemCount} item{sessionItemCount > 1 ? 's' : ''}
              </Badge>
            )}
            
            {isMigrating ? (
              <div className="flex items-center gap-2 text-primary">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Syncing...</span>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleManualMigration}
                className="gap-1 text-xs"
              >
                Sync Cart
                <ArrowRight className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
        
        {/* Success indicator */}
        {!isMigrating && items.length > 0 && (
          <div className="flex items-center gap-2 mt-3 text-green-600">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm">Cart successfully synced!</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
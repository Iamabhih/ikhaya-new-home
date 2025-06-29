
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface TopProduct {
  id: string;
  name: string;
  category_name?: string;
  total_revenue?: number;
  total_sold?: number;
}

interface TopProductsListProps {
  products?: TopProduct[];
}

export const TopProductsList = ({ products }: TopProductsListProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Performing Products</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {products?.map((product, index) => (
            <div key={product.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Badge variant="secondary">#{index + 1}</Badge>
                <div>
                  <h4 className="font-medium">{product.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {product.category_name || 'Uncategorized'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium">R{Number(product.total_revenue || 0).toFixed(2)}</div>
                <p className="text-sm text-muted-foreground">
                  {product.total_sold || 0} sold
                </p>
              </div>
            </div>
          ))}
          {(!products || products.length === 0) && (
            <div className="text-center text-muted-foreground py-8">
              No product performance data available
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

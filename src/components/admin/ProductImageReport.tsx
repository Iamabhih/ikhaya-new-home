import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Search, Image, ImageOff, ExternalLink } from "lucide-react";

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock_quantity: number;
  category_name: string;
}

interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  is_primary: boolean;
  alt_text: string;
}

interface ProductWithImages extends Product {
  images: ProductImage[];
}

export const ProductImageReport = () => {
  const [products, setProducts] = useState<ProductWithImages[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const fetchProductsWithImages = async () => {
    setLoading(true);
    try {
      // Fetch all products with their categories
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select(`
          id,
          name,
          sku,
          price,
          stock_quantity,
          categories!inner(name)
        `)
        .order("name");

      if (productsError) throw productsError;

      // Fetch all product images
      const { data: imagesData, error: imagesError } = await supabase
        .from("product_images")
        .select("id, product_id, image_url, is_primary, alt_text")
        .order("is_primary", { ascending: false });

      if (imagesError) throw imagesError;

      // Combine products with their images
      const productsWithImages = productsData.map(product => ({
        id: product.id,
        name: product.name,
        sku: product.sku || "No SKU",
        price: product.price,
        stock_quantity: product.stock_quantity,
        category_name: product.categories?.name || "Uncategorized",
        images: imagesData.filter(img => img.product_id === product.id)
      }));

      setProducts(productsWithImages);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast({
        title: "Error",
        description: "Failed to fetch products and images",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductsWithImages();
  }, []);

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const productsWithImages = filteredProducts.filter(p => p.images.length > 0);
  const productsWithoutImages = filteredProducts.filter(p => p.images.length === 0);

  const stats = {
    total: filteredProducts.length,
    withImages: productsWithImages.length,
    withoutImages: productsWithoutImages.length,
    totalImages: filteredProducts.reduce((sum, p) => sum + p.images.length, 0)
  };

  const ProductTable = ({ products, showImages = true }: { products: ProductWithImages[], showImages?: boolean }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Product Name</TableHead>
          <TableHead>SKU</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Price</TableHead>
          <TableHead>Stock</TableHead>
          {showImages && <TableHead>Images</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.map((product) => (
          <TableRow key={product.id}>
            <TableCell className="font-medium">{product.name}</TableCell>
            <TableCell>{product.sku}</TableCell>
            <TableCell>{product.category_name}</TableCell>
            <TableCell>R {product.price.toFixed(2)}</TableCell>
            <TableCell>{product.stock_quantity}</TableCell>
            {showImages && (
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {product.images.map((image, index) => (
                    <div key={image.id} className="flex items-center gap-1">
                      <Badge variant={image.is_primary ? "default" : "secondary"}>
                        {image.is_primary ? "Primary" : `Image ${index + 1}`}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(image.image_url, '_blank')}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Product Image Report</h2>
          <p className="text-muted-foreground">
            Comprehensive view of all products and their linked images
          </p>
        </div>
        <Button onClick={fetchProductsWithImages} disabled={loading}>
          {loading ? "Loading..." : "Refresh"}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-sm text-muted-foreground">Total Products</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats.withImages}</div>
            <p className="text-sm text-muted-foreground">With Images</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{stats.withoutImages}</div>
            <p className="text-sm text-muted-foreground">Without Images</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.totalImages}</div>
            <p className="text-sm text-muted-foreground">Total Images</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products by name, SKU, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Product Tables */}
      <Tabs defaultValue="with-images" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="with-images" className="flex items-center gap-2">
            <Image className="h-4 w-4" />
            With Images ({stats.withImages})
          </TabsTrigger>
          <TabsTrigger value="without-images" className="flex items-center gap-2">
            <ImageOff className="h-4 w-4" />
            Without Images ({stats.withoutImages})
          </TabsTrigger>
          <TabsTrigger value="all">
            All Products ({stats.total})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="with-images">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5 text-green-600" />
                Products With Images
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p>Loading...</p>
              ) : (
                <ProductTable products={productsWithImages} showImages={true} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="without-images">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageOff className="h-5 w-5 text-red-600" />
                Products Without Images
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p>Loading...</p>
              ) : (
                <ProductTable products={productsWithoutImages} showImages={false} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>All Products</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p>Loading...</p>
              ) : (
                <ProductTable products={filteredProducts} showImages={true} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
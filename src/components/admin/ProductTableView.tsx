
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Edit, Eye, ChevronUp, ChevronDown, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock_quantity: number;
  is_active: boolean;
  is_featured: boolean;
  category_id: string;
  categories?: { name: string };
  created_at: string;
}

interface ProductTableViewProps {
  products: Product[];
  selectedProducts: string[];
  onSelectProduct: (productId: string, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
  onEditProduct: (productId: string) => void;
  onQuickEdit: (productId: string, field: string, value: any) => void;
}

type SortField = 'name' | 'price' | 'stock_quantity' | 'created_at';
type SortOrder = 'asc' | 'desc';

export const ProductTableView = ({
  products,
  selectedProducts,
  onSelectProduct,
  onSelectAll,
  onEditProduct,
  onQuickEdit
}: ProductTableViewProps) => {
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [editingCell, setEditingCell] = useState<{ productId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const sortedProducts = [...products].sort((a, b) => {
    let aValue: any = a[sortField];
    let bValue: any = b[sortField];

    if (sortField === 'created_at') {
      aValue = new Date(aValue).getTime();
      bValue = new Date(bValue).getTime();
    }

    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const isAllSelected = selectedProducts.length === products.length && products.length > 0;
  const isPartiallySelected = selectedProducts.length > 0 && selectedProducts.length < products.length;

  const startEdit = (productId: string, field: string, currentValue: any) => {
    setEditingCell({ productId, field });
    setEditValue(currentValue.toString());
  };

  const saveEdit = () => {
    if (editingCell) {
      let value: any = editValue;
      
      // Convert value based on field type
      if (editingCell.field === 'price' || editingCell.field === 'stock_quantity') {
        value = Number(editValue);
      }
      
      onQuickEdit(editingCell.productId, editingCell.field, value);
      setEditingCell(null);
      setEditValue('');
    }
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronUp className="h-4 w-4 opacity-0" />;
    return sortOrder === 'asc' ? 
      <ChevronUp className="h-4 w-4" /> : 
      <ChevronDown className="h-4 w-4" />;
  };

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={isAllSelected}
                onCheckedChange={onSelectAll}
                className={isPartiallySelected ? "data-[state=checked]:bg-primary/50" : ""}
              />
            </TableHead>
            <TableHead>
              <Button variant="ghost" className="h-auto p-0 font-medium" onClick={() => handleSort('name')}>
                Product
                <SortIcon field="name" />
              </Button>
            </TableHead>
            <TableHead>SKU</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">
              <Button variant="ghost" className="h-auto p-0 font-medium" onClick={() => handleSort('price')}>
                Price
                <SortIcon field="price" />
              </Button>
            </TableHead>
            <TableHead className="text-right">
              <Button variant="ghost" className="h-auto p-0 font-medium" onClick={() => handleSort('stock_quantity')}>
                Stock
                <SortIcon field="stock_quantity" />
              </Button>
            </TableHead>
            <TableHead>Status</TableHead>
            <TableHead>
              <Button variant="ghost" className="h-auto p-0 font-medium" onClick={() => handleSort('created_at')}>
                Created
                <SortIcon field="created_at" />
              </Button>
            </TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedProducts.map((product) => (
            <TableRow key={product.id}>
              <TableCell>
                <Checkbox
                  checked={selectedProducts.includes(product.id)}
                  onCheckedChange={(checked) => onSelectProduct(product.id, checked as boolean)}
                />
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  {editingCell?.productId === product.id && editingCell?.field === 'name' ? (
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={saveEdit}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit();
                        if (e.key === 'Escape') cancelEdit();
                      }}
                      className="h-8"
                      autoFocus
                    />
                  ) : (
                    <div 
                      className="font-medium cursor-pointer hover:bg-muted px-2 py-1 rounded"
                      onDoubleClick={() => startEdit(product.id, 'name', product.name)}
                    >
                      {product.name}
                    </div>
                  )}
                  <div className="flex gap-2">
                    {product.is_featured && (
                      <Badge variant="secondary" className="text-xs">Featured</Badge>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell className="font-mono text-sm">{product.sku || "—"}</TableCell>
              <TableCell>{product.categories?.name || "Uncategorized"}</TableCell>
              <TableCell className="text-right">
                {editingCell?.productId === product.id && editingCell?.field === 'price' ? (
                  <Input
                    type="number"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={saveEdit}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEdit();
                      if (e.key === 'Escape') cancelEdit();
                    }}
                    className="h-8 w-20 text-right"
                    autoFocus
                  />
                ) : (
                  <div 
                    className="cursor-pointer hover:bg-muted px-2 py-1 rounded"
                    onDoubleClick={() => startEdit(product.id, 'price', product.price)}
                  >
                    R{product.price.toFixed(2)}
                  </div>
                )}
              </TableCell>
              <TableCell className="text-right">
                {editingCell?.productId === product.id && editingCell?.field === 'stock_quantity' ? (
                  <Input
                    type="number"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={saveEdit}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEdit();
                      if (e.key === 'Escape') cancelEdit();
                    }}
                    className="h-8 w-16 text-right"
                    autoFocus
                  />
                ) : (
                  <div 
                    className={`cursor-pointer hover:bg-muted px-2 py-1 rounded ${
                      product.stock_quantity <= 5 ? 'text-orange-500 font-medium' : ''
                    }`}
                    onDoubleClick={() => startEdit(product.id, 'stock_quantity', product.stock_quantity)}
                  >
                    {product.stock_quantity}
                  </div>
                )}
              </TableCell>
              <TableCell>
                <Badge variant={product.is_active ? "default" : "secondary"}>
                  {product.is_active ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {new Date(product.created_at).toLocaleDateString()}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEditProduct(product.id)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Product
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

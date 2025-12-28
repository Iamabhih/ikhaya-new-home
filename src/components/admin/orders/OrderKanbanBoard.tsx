import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DragDropContext, Droppable, Draggable, DropResult } from "react-beautiful-dnd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Clock, Package, Truck, CheckCircle, XCircle } from "lucide-react";

const COLUMNS = [
  { id: 'pending', title: 'Pending', icon: Clock, color: 'bg-yellow-100 text-yellow-800' },
  { id: 'processing', title: 'Processing', icon: Package, color: 'bg-blue-100 text-blue-800' },
  { id: 'shipped', title: 'Shipped', icon: Truck, color: 'bg-purple-100 text-purple-800' },
  { id: 'delivered', title: 'Delivered', icon: CheckCircle, color: 'bg-green-100 text-green-800' },
];

interface Order {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  email: string;
  created_at: string;
  priority?: string;
}

export const OrderKanbanBoard = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: orders, isLoading } = useQuery({
    queryKey: ['kanban-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, status, total_amount, email, created_at, priority')
        .in('status', ['pending', 'processing', 'shipped', 'delivered'])
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as Order[];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, newStatus }: { orderId: string; newStatus: string }) => {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus as any })
        .eq('id', orderId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban-orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order-stats'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update order",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const { draggableId, destination } = result;
    const newStatus = destination.droppableId;

    updateStatusMutation.mutate({ orderId: draggableId, newStatus });
    toast({
      title: "Order Updated",
      description: `Order moved to ${newStatus}`,
    });
  };

  const getOrdersByStatus = (status: string) => {
    return orders?.filter(order => order.status === status) || [];
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {COLUMNS.map(col => (
          <div key={col.id} className="bg-muted rounded-lg p-4 h-96 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {COLUMNS.map((column) => (
          <div key={column.id} className="flex flex-col">
            <div className={`flex items-center gap-2 p-3 rounded-t-lg ${column.color}`}>
              <column.icon className="h-4 w-4" />
              <span className="font-medium">{column.title}</span>
              <Badge variant="secondary" className="ml-auto">
                {getOrdersByStatus(column.id).length}
              </Badge>
            </div>
            <Droppable droppableId={column.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`flex-1 min-h-[400px] bg-muted/30 rounded-b-lg p-2 space-y-2 transition-colors ${
                    snapshot.isDraggingOver ? 'bg-primary/10' : ''
                  }`}
                >
                  {getOrdersByStatus(column.id).map((order, index) => (
                    <Draggable key={order.id} draggableId={order.id} index={index}>
                      {(provided, snapshot) => (
                        <Card
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`cursor-grab active:cursor-grabbing ${
                            snapshot.isDragging ? 'shadow-lg ring-2 ring-primary' : ''
                          }`}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-sm">#{order.order_number}</span>
                              {order.priority === 'urgent' && (
                                <Badge variant="destructive" className="text-xs">Urgent</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{order.email}</p>
                            <div className="flex items-center justify-between mt-2">
                              <span className="font-semibold text-sm">R{order.total_amount}</span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(order.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
};

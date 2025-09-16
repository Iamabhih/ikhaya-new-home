import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Keep track of connected clients
const clients = new Set<WebSocket>();

serve(async (req) => {
  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { status: 400 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  
  console.log('New analytics WebSocket connection');
  
  socket.onopen = () => {
    clients.add(socket);
    console.log(`Analytics client connected. Total clients: ${clients.size}`);
    
    // Send initial connection message
    socket.send(JSON.stringify({
      type: 'connection_established',
      timestamp: new Date().toISOString(),
      message: 'Real-time analytics stream connected'
    }));
  };

  socket.onclose = () => {
    clients.delete(socket);
    console.log(`Analytics client disconnected. Total clients: ${clients.size}`);
  };

  socket.onerror = (error) => {
    console.error('Analytics WebSocket error:', error);
    clients.delete(socket);
  };

  socket.onmessage = async (event) => {
    try {
      const message = JSON.parse(event.data);
      console.log('Received message:', message);
      
      // Handle different message types
      switch (message.type) {
        case 'subscribe_metrics':
          // Client wants to subscribe to real-time metrics
          socket.send(JSON.stringify({
            type: 'subscription_confirmed',
            subscription: 'metrics',
            timestamp: new Date().toISOString()
          }));
          break;
          
        case 'request_metrics':
          // Client requesting immediate metrics update
          try {
            const { data: metrics } = await supabase.rpc('get_realtime_metrics', { 
              hours_back: message.hours_back || 1 
            });
            
            socket.send(JSON.stringify({
              type: 'metrics_data',
              data: metrics,
              timestamp: new Date().toISOString()
            }));
          } catch (error) {
            console.error('Error fetching metrics:', error);
            socket.send(JSON.stringify({
              type: 'error',
              message: 'Failed to fetch metrics',
              timestamp: new Date().toISOString()
            }));
          }
          break;
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
    }
  };

  return response;
});

// Set up real-time database listeners for broadcasting updates
const setupRealtimeListeners = async () => {
  console.log('Setting up real-time database listeners...');
  
  // Listen for analytics events
  supabase
    .channel('analytics_events_changes')
    .on('postgres_changes', 
      { event: 'INSERT', schema: 'public', table: 'analytics_events' },
      (payload) => {
        console.log('New analytics event:', payload);
        
        // Broadcast to all connected clients
        clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'metrics_update',
              trigger: 'analytics_event',
              timestamp: new Date().toISOString()
            }));
          }
        });
      }
    )
    .subscribe();

  // Listen for new orders
  supabase
    .channel('orders_changes')
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'orders' },
      (payload) => {
        console.log('New order:', payload);
        
        clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'metrics_update',
              trigger: 'new_order',
              data: {
                order_id: payload.new.id,
                total_amount: payload.new.total_amount
              },
              timestamp: new Date().toISOString()
            }));
          }
        });
      }
    )
    .subscribe();

  console.log('Real-time listeners established');
};

// Initialize real-time listeners
setupRealtimeListeners().catch(console.error);

// Periodic metrics broadcast (every 30 seconds)
setInterval(async () => {
  if (clients.size > 0) {
    try {
      const { data: metrics } = await supabase.rpc('get_realtime_metrics', { hours_back: 1 });
      
      clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'periodic_metrics',
            data: metrics,
            timestamp: new Date().toISOString()
          }));
        }
      });
      
      console.log(`Broadcasted periodic metrics to ${clients.size} clients`);
    } catch (error) {
      console.error('Error broadcasting periodic metrics:', error);
    }
  }
}, 30000);

console.log('Analytics WebSocket server started');

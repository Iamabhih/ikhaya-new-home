import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Keep track of connected clients with metadata
interface ClientInfo {
  socket: WebSocket;
  lastPing: number;
  reconnectAttempts: number;
}

const clients = new Map<WebSocket, ClientInfo>();
const PING_INTERVAL = 30000; // 30 seconds
const CLIENT_TIMEOUT = 90000; // 90 seconds
const MAX_RECONNECT_ATTEMPTS = 5;

serve(async (req) => {
  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { status: 400 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  
  console.log('New analytics WebSocket connection');
  
  socket.onopen = () => {
    clients.set(socket, {
      socket,
      lastPing: Date.now(),
      reconnectAttempts: 0
    });
    console.log(`Analytics client connected. Total clients: ${clients.size}`);
    
    // Send initial connection message
    try {
      socket.send(JSON.stringify({
        type: 'connection_established',
        timestamp: new Date().toISOString(),
        message: 'Real-time analytics stream connected',
        pingInterval: PING_INTERVAL
      }));
    } catch (error) {
      console.error('Error sending connection message:', error);
    }
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
      
      // Update last ping time
      const clientInfo = clients.get(socket);
      if (clientInfo) {
        clientInfo.lastPing = Date.now();
        clientInfo.reconnectAttempts = 0;
      }
      
      // Handle different message types
      switch (message.type) {
        case 'ping':
          // Respond to ping with pong
          socket.send(JSON.stringify({
            type: 'pong',
            timestamp: new Date().toISOString()
          }));
          break;
          
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
              error: error.message,
              timestamp: new Date().toISOString()
            }));
          }
          break;
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
      try {
        socket.send(JSON.stringify({
          type: 'error',
          message: 'Failed to process message',
          error: error.message,
          timestamp: new Date().toISOString()
        }));
      } catch (sendError) {
        console.error('Error sending error message:', sendError);
      }
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
        broadcastToClients({
          type: 'metrics_update',
          trigger: 'analytics_event',
          timestamp: new Date().toISOString()
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
        
        broadcastToClients({
          type: 'metrics_update',
          trigger: 'new_order',
          data: {
            order_id: payload.new.id,
            total_amount: payload.new.total_amount
          },
          timestamp: new Date().toISOString()
        });
      }
    )
    .subscribe();

  console.log('Real-time listeners established');
};

// Broadcast message to all connected clients with error handling
const broadcastToClients = (message: any) => {
  const deadClients: WebSocket[] = [];
  
  clients.forEach((clientInfo, socket) => {
    if (socket.readyState === WebSocket.OPEN) {
      try {
        socket.send(JSON.stringify(message));
      } catch (error) {
        console.error('Error broadcasting to client:', error);
        deadClients.push(socket);
      }
    } else {
      deadClients.push(socket);
    }
  });
  
  // Clean up dead connections
  deadClients.forEach(socket => {
    clients.delete(socket);
    try {
      socket.close();
    } catch (error) {
      console.error('Error closing dead socket:', error);
    }
  });
};

// Keep-alive ping mechanism
setInterval(() => {
  const now = Date.now();
  const deadClients: WebSocket[] = [];
  
  clients.forEach((clientInfo, socket) => {
    // Check if client has timed out
    if (now - clientInfo.lastPing > CLIENT_TIMEOUT) {
      console.log('Client timeout detected, removing...');
      deadClients.push(socket);
      return;
    }
    
    // Send ping to active clients
    if (socket.readyState === WebSocket.OPEN) {
      try {
        socket.send(JSON.stringify({
          type: 'ping',
          timestamp: new Date().toISOString()
        }));
      } catch (error) {
        console.error('Error sending ping:', error);
        deadClients.push(socket);
      }
    } else {
      deadClients.push(socket);
    }
  });
  
  // Clean up dead connections
  deadClients.forEach(socket => {
    clients.delete(socket);
    try {
      socket.close();
    } catch (error) {
      console.error('Error closing socket:', error);
    }
  });
  
  if (clients.size > 0) {
    console.log(`Keep-alive ping sent to ${clients.size} clients`);
  }
}, PING_INTERVAL);

// Initialize real-time listeners
setupRealtimeListeners().catch(console.error);

// Periodic metrics broadcast (every 30 seconds)
setInterval(async () => {
  if (clients.size > 0) {
    try {
      const { data: metrics } = await supabase.rpc('get_realtime_metrics', { hours_back: 1 });
      
      broadcastToClients({
        type: 'periodic_metrics',
        data: metrics,
        timestamp: new Date().toISOString()
      });
      
      console.log(`Broadcasted periodic metrics to ${clients.size} clients`);
    } catch (error) {
      console.error('Error broadcasting periodic metrics:', error);
    }
  }
}, 30000);

console.log('Analytics WebSocket server started');

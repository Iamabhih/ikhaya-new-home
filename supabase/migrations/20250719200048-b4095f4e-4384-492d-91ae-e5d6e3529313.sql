-- Enhanced order management system - Phase 1: Core Infrastructure

-- Update order status enum with more granular statuses
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'awaiting_payment';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'payment_failed';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'processing';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'partially_fulfilled';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'fulfilled';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'shipped';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'out_for_delivery';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'delivered';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'completed';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'returned';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'refunded';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'disputed';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'cancelled';

-- Create fulfillment status enum
CREATE TYPE fulfillment_status AS ENUM (
  'unfulfilled',
  'partially_fulfilled', 
  'fulfilled',
  'shipped',
  'delivered',
  'returned'
);

-- Create priority enum for orders
CREATE TYPE order_priority AS ENUM (
  'low',
  'normal',
  'high',
  'urgent'
);

-- Add new columns to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS fulfillment_status fulfillment_status DEFAULT 'unfulfilled',
ADD COLUMN IF NOT EXISTS priority order_priority DEFAULT 'normal',
ADD COLUMN IF NOT EXISTS tags TEXT[],
ADD COLUMN IF NOT EXISTS internal_notes TEXT,
ADD COLUMN IF NOT EXISTS customer_notes TEXT,
ADD COLUMN IF NOT EXISTS expected_delivery_date DATE,
ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS fulfillment_location TEXT,
ADD COLUMN IF NOT EXISTS source_channel TEXT DEFAULT 'website';

-- Create fulfillments table for tracking partial shipments
CREATE TABLE IF NOT EXISTS fulfillments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  fulfillment_number TEXT NOT NULL,
  status fulfillment_status NOT NULL DEFAULT 'unfulfilled',
  tracking_number TEXT,
  tracking_company TEXT,
  tracking_url TEXT,
  shipped_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  estimated_delivery_date DATE,
  fulfillment_location TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create fulfillment_items table to track which items are in each fulfillment
CREATE TABLE IF NOT EXISTS fulfillment_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fulfillment_id UUID NOT NULL REFERENCES fulfillments(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create order_notes table for internal communication
CREATE TABLE IF NOT EXISTS order_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id),
  note_type TEXT NOT NULL DEFAULT 'internal', -- 'internal', 'customer', 'system'
  content TEXT NOT NULL,
  is_important BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create order_timeline table for detailed tracking
CREATE TABLE IF NOT EXISTS order_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'status_change', 'payment', 'fulfillment', 'note', 'refund', etc.
  event_title TEXT NOT NULL,
  event_description TEXT,
  previous_value TEXT,
  new_value TEXT,
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_fulfillment_status ON orders(fulfillment_status);
CREATE INDEX IF NOT EXISTS idx_orders_priority ON orders(priority);
CREATE INDEX IF NOT EXISTS idx_orders_tags ON orders USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_orders_shipped_at ON orders(shipped_at);
CREATE INDEX IF NOT EXISTS idx_orders_delivered_at ON orders(delivered_at);
CREATE INDEX IF NOT EXISTS idx_fulfillments_order_id ON fulfillments(order_id);
CREATE INDEX IF NOT EXISTS idx_fulfillments_status ON fulfillments(status);
CREATE INDEX IF NOT EXISTS idx_fulfillment_items_fulfillment_id ON fulfillment_items(fulfillment_id);
CREATE INDEX IF NOT EXISTS idx_fulfillment_items_order_item_id ON fulfillment_items(order_item_id);
CREATE INDEX IF NOT EXISTS idx_order_notes_order_id ON order_notes(order_id);
CREATE INDEX IF NOT EXISTS idx_order_timeline_order_id ON order_timeline(order_id);
CREATE INDEX IF NOT EXISTS idx_order_timeline_event_type ON order_timeline(event_type);

-- Create triggers for updated_at
CREATE TRIGGER update_fulfillments_updated_at
  BEFORE UPDATE ON fulfillments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_order_notes_updated_at
  BEFORE UPDATE ON order_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create order timeline entries
CREATE OR REPLACE FUNCTION create_order_timeline_entry()
RETURNS TRIGGER AS $$
BEGIN
  -- Track order status changes
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO order_timeline (
      order_id, event_type, event_title, event_description, 
      previous_value, new_value, created_by
    ) VALUES (
      NEW.id, 
      'status_change', 
      'Order status updated',
      'Order status changed from ' || OLD.status || ' to ' || NEW.status,
      OLD.status::TEXT,
      NEW.status::TEXT,
      auth.uid()
    );
  END IF;

  -- Track fulfillment status changes
  IF TG_OP = 'UPDATE' AND OLD.fulfillment_status IS DISTINCT FROM NEW.fulfillment_status THEN
    INSERT INTO order_timeline (
      order_id, event_type, event_title, event_description,
      previous_value, new_value, created_by
    ) VALUES (
      NEW.id,
      'fulfillment_change',
      'Fulfillment status updated',
      'Fulfillment status changed from ' || OLD.fulfillment_status || ' to ' || NEW.fulfillment_status,
      OLD.fulfillment_status::TEXT,
      NEW.fulfillment_status::TEXT,
      auth.uid()
    );
  END IF;

  -- Track when order is shipped
  IF TG_OP = 'UPDATE' AND OLD.shipped_at IS NULL AND NEW.shipped_at IS NOT NULL THEN
    INSERT INTO order_timeline (
      order_id, event_type, event_title, event_description, created_by
    ) VALUES (
      NEW.id,
      'shipped',
      'Order shipped',
      'Order has been shipped with tracking number: ' || COALESCE(NEW.tracking_number, 'N/A'),
      auth.uid()
    );
  END IF;

  -- Track when order is delivered
  IF TG_OP = 'UPDATE' AND OLD.delivered_at IS NULL AND NEW.delivered_at IS NOT NULL THEN
    INSERT INTO order_timeline (
      order_id, event_type, event_title, event_description, created_by
    ) VALUES (
      NEW.id,
      'delivered',
      'Order delivered',
      'Order has been successfully delivered',
      auth.uid()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for order timeline
CREATE TRIGGER create_order_timeline_trigger
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION create_order_timeline_entry();

-- Function to automatically update order fulfillment status based on fulfillments
CREATE OR REPLACE FUNCTION update_order_fulfillment_status()
RETURNS TRIGGER AS $$
DECLARE
  total_items INTEGER;
  fulfilled_items INTEGER;
  order_record RECORD;
BEGIN
  -- Get the order this fulfillment belongs to
  SELECT INTO order_record * FROM orders WHERE id = COALESCE(NEW.order_id, OLD.order_id);
  
  -- Calculate total items in order
  SELECT COALESCE(SUM(quantity), 0) INTO total_items
  FROM order_items 
  WHERE order_id = order_record.id;
  
  -- Calculate fulfilled items
  SELECT COALESCE(SUM(fi.quantity), 0) INTO fulfilled_items
  FROM fulfillment_items fi
  JOIN fulfillments f ON fi.fulfillment_id = f.id
  WHERE f.order_id = order_record.id;
  
  -- Update order fulfillment status
  IF fulfilled_items = 0 THEN
    UPDATE orders SET fulfillment_status = 'unfulfilled' WHERE id = order_record.id;
  ELSIF fulfilled_items < total_items THEN
    UPDATE orders SET fulfillment_status = 'partially_fulfilled' WHERE id = order_record.id;
  ELSIF fulfilled_items >= total_items THEN
    UPDATE orders SET fulfillment_status = 'fulfilled' WHERE id = order_record.id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic fulfillment status updates
CREATE TRIGGER update_order_fulfillment_on_fulfillment_items
  AFTER INSERT OR UPDATE OR DELETE ON fulfillment_items
  FOR EACH ROW
  EXECUTE FUNCTION update_order_fulfillment_status();

-- Enable RLS on new tables
ALTER TABLE fulfillments ENABLE ROW LEVEL SECURITY;
ALTER TABLE fulfillment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_timeline ENABLE ROW LEVEL SECURITY;

-- RLS policies for fulfillments
CREATE POLICY "Admins can manage all fulfillments"
ON fulfillments FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Users can view fulfillments for their orders"
ON fulfillments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = fulfillments.order_id 
    AND orders.user_id = auth.uid()
  )
);

-- RLS policies for fulfillment_items
CREATE POLICY "Admins can manage all fulfillment items"
ON fulfillment_items FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Users can view fulfillment items for their orders"
ON fulfillment_items FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM fulfillments f
    JOIN orders o ON f.order_id = o.id
    WHERE f.id = fulfillment_items.fulfillment_id 
    AND o.user_id = auth.uid()
  )
);

-- RLS policies for order_notes
CREATE POLICY "Admins can manage all order notes"
ON order_notes FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Users can view customer notes for their orders"
ON order_notes FOR SELECT
TO authenticated
USING (
  note_type = 'customer' AND 
  EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = order_notes.order_id 
    AND orders.user_id = auth.uid()
  )
);

-- RLS policies for order_timeline
CREATE POLICY "Admins can view all order timeline"
ON order_timeline FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Users can view timeline for their orders"
ON order_timeline FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = order_timeline.order_id 
    AND orders.user_id = auth.uid()
  )
);

-- Function for bulk order status updates
CREATE OR REPLACE FUNCTION bulk_update_order_status(
  order_ids UUID[],
  new_status order_status,
  notes TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count INTEGER := 0;
  order_id UUID;
BEGIN
  -- Check if user has admin role
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)) THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  -- Update each order
  FOREACH order_id IN ARRAY order_ids
  LOOP
    UPDATE orders 
    SET status = new_status, updated_at = now()
    WHERE id = order_id;
    
    IF FOUND THEN
      updated_count := updated_count + 1;
      
      -- Add note if provided
      IF notes IS NOT NULL THEN
        INSERT INTO order_notes (order_id, author_id, note_type, content)
        VALUES (order_id, auth.uid(), 'internal', notes);
      END IF;
    END IF;
  END LOOP;

  RETURN updated_count;
END;
$$;
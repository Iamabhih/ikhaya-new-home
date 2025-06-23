export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      analytics_events: {
        Row: {
          category_id: string | null
          created_at: string
          event_name: string
          event_type: string
          id: string
          metadata: Json | null
          order_id: string | null
          page_path: string | null
          product_id: string | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          event_name: string
          event_type: string
          id?: string
          metadata?: Json | null
          order_id?: string | null
          page_path?: string | null
          product_id?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string
          event_name?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          order_id?: string | null
          page_path?: string | null
          product_id?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "category_product_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_performance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_metrics: {
        Row: {
          created_at: string
          date: string
          id: string
          metadata: Json | null
          metric_name: string
          metric_type: string
          updated_at: string
          value: number
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          metadata?: Json | null
          metric_name: string
          metric_type: string
          updated_at?: string
          value: number
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          metadata?: Json | null
          metric_name?: string
          metric_type?: string
          updated_at?: string
          value?: number
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          quantity: number
          session_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          quantity?: number
          session_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          session_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_performance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          parent_id: string | null
          slug: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "category_product_counts"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          created_at: string
          email_address: string
          error_message: string | null
          external_id: string | null
          id: string
          metadata: Json | null
          sent_at: string | null
          status: string
          subject: string
          template_name: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email_address: string
          error_message?: string | null
          external_id?: string | null
          id?: string
          metadata?: Json | null
          sent_at?: string | null
          status?: string
          subject: string
          template_name: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email_address?: string
          error_message?: string | null
          external_id?: string | null
          id?: string
          metadata?: Json | null
          sent_at?: string | null
          status?: string
          subject?: string
          template_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      email_preferences: {
        Row: {
          created_at: string
          id: string
          marketing_emails: boolean | null
          newsletter: boolean | null
          order_confirmations: boolean | null
          order_updates: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          marketing_emails?: boolean | null
          newsletter?: boolean | null
          order_confirmations?: boolean | null
          order_updates?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          marketing_emails?: boolean | null
          newsletter?: boolean | null
          order_confirmations?: boolean | null
          order_updates?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_id: string | null
          product_name: string
          product_sku: string | null
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_id?: string | null
          product_name: string
          product_sku?: string | null
          quantity: number
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string | null
          product_name?: string
          product_sku?: string | null
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_performance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          order_id: string
          status: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          order_id: string
          status: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          order_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          billing_address: Json
          created_at: string
          currency: string | null
          discount_amount: number | null
          email: string
          estimated_delivery_date: string | null
          id: string
          notes: string | null
          order_number: string
          payment_method: string | null
          shipping_address: Json | null
          shipping_amount: number | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          tax_amount: number | null
          total_amount: number
          tracking_number: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          billing_address: Json
          created_at?: string
          currency?: string | null
          discount_amount?: number | null
          email: string
          estimated_delivery_date?: string | null
          id?: string
          notes?: string | null
          order_number: string
          payment_method?: string | null
          shipping_address?: Json | null
          shipping_amount?: number | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal: number
          tax_amount?: number | null
          total_amount: number
          tracking_number?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          billing_address?: Json
          created_at?: string
          currency?: string | null
          discount_amount?: number | null
          email?: string
          estimated_delivery_date?: string | null
          id?: string
          notes?: string | null
          order_number?: string
          payment_method?: string | null
          shipping_address?: Json | null
          shipping_amount?: number | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          tax_amount?: number | null
          total_amount?: number
          tracking_number?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      payment_integrations: {
        Row: {
          config: Json
          created_at: string
          id: string
          is_healthy: boolean | null
          is_test_mode: boolean | null
          last_health_check: string | null
          payment_method_type: Database["public"]["Enums"]["payment_method_type"]
          updated_at: string
          webhook_url: string | null
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          is_healthy?: boolean | null
          is_test_mode?: boolean | null
          last_health_check?: string | null
          payment_method_type: Database["public"]["Enums"]["payment_method_type"]
          updated_at?: string
          webhook_url?: string | null
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          is_healthy?: boolean | null
          is_test_mode?: boolean | null
          last_health_check?: string | null
          payment_method_type?: Database["public"]["Enums"]["payment_method_type"]
          updated_at?: string
          webhook_url?: string | null
        }
        Relationships: []
      }
      payment_logs: {
        Row: {
          created_at: string
          event_type: string
          id: string
          message: string
          metadata: Json | null
          transaction_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          message: string
          metadata?: Json | null
          transaction_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          message?: string
          metadata?: Json | null
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_logs_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "payment_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          available_for_wholesale: boolean | null
          created_at: string
          description: string | null
          fee_fixed: number | null
          fee_percentage: number | null
          id: string
          is_active: boolean | null
          max_amount: number | null
          min_amount: number | null
          name: string
          sort_order: number | null
          type: Database["public"]["Enums"]["payment_method_type"]
          updated_at: string
        }
        Insert: {
          available_for_wholesale?: boolean | null
          created_at?: string
          description?: string | null
          fee_fixed?: number | null
          fee_percentage?: number | null
          id?: string
          is_active?: boolean | null
          max_amount?: number | null
          min_amount?: number | null
          name: string
          sort_order?: number | null
          type: Database["public"]["Enums"]["payment_method_type"]
          updated_at?: string
        }
        Update: {
          available_for_wholesale?: boolean | null
          created_at?: string
          description?: string | null
          fee_fixed?: number | null
          fee_percentage?: number | null
          id?: string
          is_active?: boolean | null
          max_amount?: number | null
          min_amount?: number | null
          name?: string
          sort_order?: number | null
          type?: Database["public"]["Enums"]["payment_method_type"]
          updated_at?: string
        }
        Relationships: []
      }
      payment_transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string | null
          external_transaction_id: string | null
          failure_reason: string | null
          fee_amount: number | null
          gateway_response: Json | null
          id: string
          order_id: string | null
          payment_method_type: Database["public"]["Enums"]["payment_method_type"]
          processed_at: string | null
          status: Database["public"]["Enums"]["payment_status"]
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string | null
          external_transaction_id?: string | null
          failure_reason?: string | null
          fee_amount?: number | null
          gateway_response?: Json | null
          id?: string
          order_id?: string | null
          payment_method_type: Database["public"]["Enums"]["payment_method_type"]
          processed_at?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string | null
          external_transaction_id?: string | null
          failure_reason?: string | null
          fee_amount?: number | null
          gateway_response?: Json | null
          id?: string
          order_id?: string | null
          payment_method_type?: Database["public"]["Enums"]["payment_method_type"]
          processed_at?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt_text: string | null
          created_at: string
          id: string
          image_url: string
          is_primary: boolean | null
          product_id: string
          sort_order: number | null
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          id?: string
          image_url: string
          is_primary?: boolean | null
          product_id: string
          sort_order?: number | null
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          id?: string
          image_url?: string
          is_primary?: boolean | null
          product_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_performance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_import_errors: {
        Row: {
          created_at: string
          error_message: string
          id: string
          import_id: string | null
          row_data: Json
          row_number: number
        }
        Insert: {
          created_at?: string
          error_message: string
          id?: string
          import_id?: string | null
          row_data: Json
          row_number: number
        }
        Update: {
          created_at?: string
          error_message?: string
          id?: string
          import_id?: string | null
          row_data?: Json
          row_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_import_errors_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "product_imports"
            referencedColumns: ["id"]
          },
        ]
      }
      product_imports: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          failed_rows: number
          filename: string
          id: string
          import_data: Json | null
          processed_rows: number
          status: string
          successful_rows: number
          total_rows: number
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          failed_rows?: number
          filename: string
          id?: string
          import_data?: Json | null
          processed_rows?: number
          status?: string
          successful_rows?: number
          total_rows?: number
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          failed_rows?: number
          filename?: string
          id?: string
          import_data?: Json | null
          processed_rows?: number
          status?: string
          successful_rows?: number
          total_rows?: number
          user_id?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          average_rating: number | null
          category_id: string | null
          compare_at_price: number | null
          cost_price: number | null
          created_at: string
          description: string | null
          dimensions: string | null
          id: string
          is_active: boolean | null
          is_featured: boolean | null
          min_stock_level: number | null
          name: string
          price: number
          review_count: number | null
          seo_description: string | null
          seo_title: string | null
          short_description: string | null
          sku: string | null
          slug: string
          stock_quantity: number | null
          updated_at: string
          weight: number | null
          wholesale_price: number | null
        }
        Insert: {
          average_rating?: number | null
          category_id?: string | null
          compare_at_price?: number | null
          cost_price?: number | null
          created_at?: string
          description?: string | null
          dimensions?: string | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          min_stock_level?: number | null
          name: string
          price: number
          review_count?: number | null
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string | null
          sku?: string | null
          slug: string
          stock_quantity?: number | null
          updated_at?: string
          weight?: number | null
          wholesale_price?: number | null
        }
        Update: {
          average_rating?: number | null
          category_id?: string | null
          compare_at_price?: number | null
          cost_price?: number | null
          created_at?: string
          description?: string | null
          dimensions?: string | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          min_stock_level?: number | null
          name?: string
          price?: number
          review_count?: number | null
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string | null
          sku?: string | null
          slug?: string
          stock_quantity?: number | null
          updated_at?: string
          weight?: number | null
          wholesale_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "category_product_counts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          billing_address: string | null
          company_name: string | null
          created_at: string
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          shipping_address: string | null
          updated_at: string
          vat_number: string | null
          wholesale_approved: boolean | null
        }
        Insert: {
          billing_address?: string | null
          company_name?: string | null
          created_at?: string
          email: string
          first_name?: string | null
          id: string
          last_name?: string | null
          phone?: string | null
          shipping_address?: string | null
          updated_at?: string
          vat_number?: string | null
          wholesale_approved?: boolean | null
        }
        Update: {
          billing_address?: string | null
          company_name?: string | null
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          shipping_address?: string | null
          updated_at?: string
          vat_number?: string | null
          wholesale_approved?: boolean | null
        }
        Relationships: []
      }
      report_configurations: {
        Row: {
          created_at: string
          filters: Json | null
          id: string
          is_active: boolean | null
          last_generated_at: string | null
          name: string
          report_type: string
          schedule: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          filters?: Json | null
          id?: string
          is_active?: boolean | null
          last_generated_at?: string | null
          name: string
          report_type: string
          schedule?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          filters?: Json | null
          id?: string
          is_active?: boolean | null
          last_generated_at?: string | null
          name?: string
          report_type?: string
          schedule?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      return_items: {
        Row: {
          condition: string | null
          created_at: string
          id: string
          order_item_id: string
          quantity: number
          refund_amount: number
          return_request_id: string
        }
        Insert: {
          condition?: string | null
          created_at?: string
          id?: string
          order_item_id: string
          quantity?: number
          refund_amount: number
          return_request_id: string
        }
        Update: {
          condition?: string | null
          created_at?: string
          id?: string
          order_item_id?: string
          quantity?: number
          refund_amount?: number
          return_request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "return_items_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_items_return_request_id_fkey"
            columns: ["return_request_id"]
            isOneToOne: false
            referencedRelation: "return_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      return_requests: {
        Row: {
          admin_notes: string | null
          created_at: string
          email: string
          id: string
          order_id: string
          processed_at: string | null
          refund_amount: number | null
          requested_items: Json
          return_description: string | null
          return_reason: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          email: string
          id?: string
          order_id: string
          processed_at?: string | null
          refund_amount?: number | null
          requested_items?: Json
          return_description?: string | null
          return_reason: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          email?: string
          id?: string
          order_id?: string
          processed_at?: string | null
          refund_amount?: number | null
          requested_items?: Json
          return_description?: string | null
          return_reason?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "return_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          is_approved: boolean | null
          is_verified_purchase: boolean | null
          product_id: string
          rating: number
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          is_approved?: boolean | null
          is_verified_purchase?: boolean | null
          product_id: string
          rating: number
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          is_approved?: boolean | null
          is_verified_purchase?: boolean | null
          product_id?: string
          rating?: number
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_performance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          movement_type: string
          new_quantity: number
          notes: string | null
          order_id: string | null
          previous_quantity: number
          product_id: string
          quantity_change: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          movement_type: string
          new_quantity: number
          notes?: string | null
          order_id?: string | null
          previous_quantity: number
          product_id: string
          quantity_change: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          movement_type?: string
          new_quantity?: number
          notes?: string | null
          order_id?: string | null
          previous_quantity?: number
          product_id?: string
          quantity_change?: number
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_performance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wishlists: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlists_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_performance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlists_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      category_product_counts: {
        Row: {
          id: string | null
          in_stock_count: number | null
          name: string | null
          product_count: number | null
          slug: string | null
        }
        Relationships: []
      }
      customer_analytics: {
        Row: {
          avg_order_value: number | null
          days_since_last_order: number | null
          email: string | null
          first_name: string | null
          id: string | null
          last_name: string | null
          last_order_date: string | null
          registration_date: string | null
          total_orders: number | null
          total_spent: number | null
        }
        Relationships: []
      }
      product_performance: {
        Row: {
          avg_rating: number | null
          category_id: string | null
          category_name: string | null
          id: string | null
          name: string | null
          order_count: number | null
          price: number | null
          review_count: number | null
          stock_quantity: number | null
          total_revenue: number | null
          total_sold: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "category_product_counts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      aggregate_daily_metrics: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      bulk_insert_products: {
        Args: { products_data: Json; import_id_param: string }
        Returns: Json
      }
      create_admin_user: {
        Args: { user_email: string }
        Returns: boolean
      }
      create_superadmin_user: {
        Args: { user_email: string }
        Returns: boolean
      }
      generate_unique_sku: {
        Args: { base_name: string }
        Returns: string
      }
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      refresh_category_counts: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      search_products: {
        Args: {
          search_query: string
          category_filter?: string
          min_price?: number
          max_price?: number
          in_stock_only?: boolean
          limit_count?: number
          offset_count?: number
        }
        Returns: {
          id: string
          name: string
          slug: string
          price: number
          compare_at_price: number
          stock_quantity: number
          is_active: boolean
          is_featured: boolean
          category_id: string
          created_at: string
          category_name: string
          image_url: string
          search_rank: number
        }[]
      }
      update_product_stock: {
        Args: {
          p_product_id: string
          p_quantity_change: number
          p_movement_type: string
          p_order_id?: string
          p_notes?: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "customer" | "wholesale" | "admin" | "superadmin"
      order_status:
        | "pending"
        | "confirmed"
        | "processing"
        | "shipped"
        | "delivered"
        | "cancelled"
      payment_method_type: "stripe" | "payfast" | "payflex" | "eft" | "cod"
      payment_status:
        | "pending"
        | "processing"
        | "completed"
        | "failed"
        | "refunded"
        | "cancelled"
      transaction_type: "purchase" | "refund" | "partial_refund" | "chargeback"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["customer", "wholesale", "admin", "superadmin"],
      order_status: [
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
      ],
      payment_method_type: ["stripe", "payfast", "payflex", "eft", "cod"],
      payment_status: [
        "pending",
        "processing",
        "completed",
        "failed",
        "refunded",
        "cancelled",
      ],
      transaction_type: ["purchase", "refund", "partial_refund", "chargeback"],
    },
  },
} as const

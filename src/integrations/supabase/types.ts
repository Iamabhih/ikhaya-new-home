export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
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
            referencedRelation: "clean_product_performance"
            referencedColumns: ["product_id"]
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
      attribute_values: {
        Row: {
          attribute_id: string
          created_at: string
          id: string
          slug: string
          sort_order: number | null
          value: string
        }
        Insert: {
          attribute_id: string
          created_at?: string
          id?: string
          slug: string
          sort_order?: number | null
          value: string
        }
        Update: {
          attribute_id?: string
          created_at?: string
          id?: string
          slug?: string
          sort_order?: number | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "attribute_values_attribute_id_fkey"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "product_attributes"
            referencedColumns: ["id"]
          },
        ]
      }
      auth_rate_limits: {
        Row: {
          attempt_count: number
          blocked_until: string | null
          created_at: string
          id: string
          identifier: string
          window_start: string
        }
        Insert: {
          attempt_count?: number
          blocked_until?: string | null
          created_at?: string
          id?: string
          identifier: string
          window_start?: string
        }
        Update: {
          attempt_count?: number
          blocked_until?: string | null
          created_at?: string
          id?: string
          identifier?: string
          window_start?: string
        }
        Relationships: []
      }
      batch_progress: {
        Row: {
          candidates_created: number
          completed_at: string | null
          current_batch: number
          errors: Json | null
          id: string
          links_created: number
          progress: number
          session_id: string
          started_at: string
          status: string
          total_batches: number
          updated_at: string
        }
        Insert: {
          candidates_created?: number
          completed_at?: string | null
          current_batch?: number
          errors?: Json | null
          id?: string
          links_created?: number
          progress?: number
          session_id: string
          started_at?: string
          status?: string
          total_batches?: number
          updated_at?: string
        }
        Update: {
          candidates_created?: number
          completed_at?: string | null
          current_batch?: number
          errors?: Json | null
          id?: string
          links_created?: number
          progress?: number
          session_id?: string
          started_at?: string
          status?: string
          total_batches?: number
          updated_at?: string
        }
        Relationships: []
      }
      brands: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
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
          slug?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      cached_drive_images: {
        Row: {
          created_at: string
          direct_url: string
          drive_id: string
          file_size: number | null
          filename: string
          id: string
          is_linked: boolean | null
          linked_at: string | null
          linked_by: string | null
          linked_product_id: string | null
          metadata: Json | null
          mime_type: string | null
          scan_session_id: string | null
          sku: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          direct_url: string
          drive_id: string
          file_size?: number | null
          filename: string
          id?: string
          is_linked?: boolean | null
          linked_at?: string | null
          linked_by?: string | null
          linked_product_id?: string | null
          metadata?: Json | null
          mime_type?: string | null
          scan_session_id?: string | null
          sku?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          direct_url?: string
          drive_id?: string
          file_size?: number | null
          filename?: string
          id?: string
          is_linked?: boolean | null
          linked_at?: string | null
          linked_by?: string | null
          linked_product_id?: string | null
          metadata?: Json | null
          mime_type?: string | null
          scan_session_id?: string | null
          sku?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cached_drive_images_linked_product_id_fkey"
            columns: ["linked_product_id"]
            isOneToOne: false
            referencedRelation: "clean_product_performance"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "cached_drive_images_linked_product_id_fkey"
            columns: ["linked_product_id"]
            isOneToOne: false
            referencedRelation: "product_performance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cached_drive_images_linked_product_id_fkey"
            columns: ["linked_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_abandonment_campaigns: {
        Row: {
          campaign_type: string
          cart_session_id: string | null
          clicked_at: string | null
          converted_at: string | null
          discount_code: string | null
          discount_percentage: number | null
          email_address: string | null
          id: string
          message_content: string | null
          metadata: Json | null
          opened_at: string | null
          phone_number: string | null
          sent_at: string
          status: string | null
          subject_line: string | null
        }
        Insert: {
          campaign_type: string
          cart_session_id?: string | null
          clicked_at?: string | null
          converted_at?: string | null
          discount_code?: string | null
          discount_percentage?: number | null
          email_address?: string | null
          id?: string
          message_content?: string | null
          metadata?: Json | null
          opened_at?: string | null
          phone_number?: string | null
          sent_at?: string
          status?: string | null
          subject_line?: string | null
        }
        Update: {
          campaign_type?: string
          cart_session_id?: string | null
          clicked_at?: string | null
          converted_at?: string | null
          discount_code?: string | null
          discount_percentage?: number | null
          email_address?: string | null
          id?: string
          message_content?: string | null
          metadata?: Json | null
          opened_at?: string | null
          phone_number?: string | null
          sent_at?: string
          status?: string | null
          subject_line?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_abandonment_campaigns_cart_session_id_fkey"
            columns: ["cart_session_id"]
            isOneToOne: false
            referencedRelation: "cart_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_analytics_snapshots: {
        Row: {
          abandonment_rate: number | null
          avg_cart_value: number | null
          avg_session_duration: number | null
          conversion_rate: number | null
          created_at: string
          customer_segments: Json | null
          id: string
          recovery_conversions: number | null
          recovery_emails_sent: number | null
          recovery_rate: number | null
          revenue_recovered: number | null
          snapshot_date: string
          top_abandoned_products: Json | null
          total_carts_abandoned: number | null
          total_carts_converted: number | null
          total_carts_created: number | null
        }
        Insert: {
          abandonment_rate?: number | null
          avg_cart_value?: number | null
          avg_session_duration?: number | null
          conversion_rate?: number | null
          created_at?: string
          customer_segments?: Json | null
          id?: string
          recovery_conversions?: number | null
          recovery_emails_sent?: number | null
          recovery_rate?: number | null
          revenue_recovered?: number | null
          snapshot_date: string
          top_abandoned_products?: Json | null
          total_carts_abandoned?: number | null
          total_carts_converted?: number | null
          total_carts_created?: number | null
        }
        Update: {
          abandonment_rate?: number | null
          avg_cart_value?: number | null
          avg_session_duration?: number | null
          conversion_rate?: number | null
          created_at?: string
          customer_segments?: Json | null
          id?: string
          recovery_conversions?: number | null
          recovery_emails_sent?: number | null
          recovery_rate?: number | null
          revenue_recovered?: number | null
          snapshot_date?: string
          top_abandoned_products?: Json | null
          total_carts_abandoned?: number | null
          total_carts_converted?: number | null
          total_carts_created?: number | null
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
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          quantity?: number
          session_id?: string | null
          updated_at?: string
          user_id?: string | null
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          session_id?: string | null
          updated_at?: string
          user_id?: string | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "clean_product_performance"
            referencedColumns: ["product_id"]
          },
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
          {
            foreignKeyName: "cart_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_sessions: {
        Row: {
          abandoned_at: string | null
          abandonment_stage: string | null
          checkout_initiated_at: string | null
          converted_at: string | null
          created_at: string
          device_info: Json | null
          email: string | null
          id: string
          is_recovered: boolean | null
          item_count: number | null
          page_views: number | null
          payment_attempted_at: string | null
          phone: string | null
          recovery_campaign_id: string | null
          session_duration: number | null
          session_id: string
          total_value: number | null
          updated_at: string
          user_id: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          abandoned_at?: string | null
          abandonment_stage?: string | null
          checkout_initiated_at?: string | null
          converted_at?: string | null
          created_at?: string
          device_info?: Json | null
          email?: string | null
          id?: string
          is_recovered?: boolean | null
          item_count?: number | null
          page_views?: number | null
          payment_attempted_at?: string | null
          phone?: string | null
          recovery_campaign_id?: string | null
          session_duration?: number | null
          session_id: string
          total_value?: number | null
          updated_at?: string
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          abandoned_at?: string | null
          abandonment_stage?: string | null
          checkout_initiated_at?: string | null
          converted_at?: string | null
          created_at?: string
          device_info?: Json | null
          email?: string | null
          id?: string
          is_recovered?: boolean | null
          item_count?: number | null
          page_views?: number | null
          payment_attempted_at?: string | null
          phone?: string | null
          recovery_campaign_id?: string | null
          session_duration?: number | null
          session_id?: string
          total_value?: number | null
          updated_at?: string
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "clean_customer_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "customer_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      customer_engagement_metrics: {
        Row: {
          avg_order_value: number | null
          created_at: string
          customer_segment: string | null
          days_since_last_order: number | null
          days_since_last_visit: number | null
          email: string | null
          email_engagement_score: number | null
          id: string
          last_cart_abandonment_at: string | null
          lifetime_value: number | null
          preferred_contact_day: string | null
          preferred_contact_time: string | null
          recovery_success_rate: number | null
          total_abandoned_carts: number | null
          total_orders: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          avg_order_value?: number | null
          created_at?: string
          customer_segment?: string | null
          days_since_last_order?: number | null
          days_since_last_visit?: number | null
          email?: string | null
          email_engagement_score?: number | null
          id?: string
          last_cart_abandonment_at?: string | null
          lifetime_value?: number | null
          preferred_contact_day?: string | null
          preferred_contact_time?: string | null
          recovery_success_rate?: number | null
          total_abandoned_carts?: number | null
          total_orders?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          avg_order_value?: number | null
          created_at?: string
          customer_segment?: string | null
          days_since_last_order?: number | null
          days_since_last_visit?: number | null
          email?: string | null
          email_engagement_score?: number | null
          id?: string
          last_cart_abandonment_at?: string | null
          lifetime_value?: number | null
          preferred_contact_day?: string | null
          preferred_contact_time?: string | null
          recovery_success_rate?: number | null
          total_abandoned_carts?: number | null
          total_orders?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_engagement_metrics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "clean_customer_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_engagement_metrics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "customer_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_engagement_metrics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_zones: {
        Row: {
          created_at: string
          delivery_fee: number
          description: string | null
          estimated_days_max: number | null
          estimated_days_min: number | null
          free_delivery_threshold: number | null
          id: string
          is_active: boolean
          min_order_value: number | null
          name: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivery_fee?: number
          description?: string | null
          estimated_days_max?: number | null
          estimated_days_min?: number | null
          free_delivery_threshold?: number | null
          id?: string
          is_active?: boolean
          min_order_value?: number | null
          name: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivery_fee?: number
          description?: string | null
          estimated_days_max?: number | null
          estimated_days_min?: number | null
          free_delivery_threshold?: number | null
          id?: string
          is_active?: boolean
          min_order_value?: number | null
          name?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
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
      enhanced_cart_tracking: {
        Row: {
          abandonment_reason: string | null
          added_at: string
          cart_session_id: string | null
          checkout_reached: boolean | null
          id: string
          payment_attempted: boolean | null
          product_category: string | null
          product_id: string | null
          product_name: string
          product_price: number
          product_sku: string | null
          purchased: boolean | null
          quantity: number
          removed_at: string | null
          time_in_cart: number | null
        }
        Insert: {
          abandonment_reason?: string | null
          added_at?: string
          cart_session_id?: string | null
          checkout_reached?: boolean | null
          id?: string
          payment_attempted?: boolean | null
          product_category?: string | null
          product_id?: string | null
          product_name: string
          product_price: number
          product_sku?: string | null
          purchased?: boolean | null
          quantity?: number
          removed_at?: string | null
          time_in_cart?: number | null
        }
        Update: {
          abandonment_reason?: string | null
          added_at?: string
          cart_session_id?: string | null
          checkout_reached?: boolean | null
          id?: string
          payment_attempted?: boolean | null
          product_category?: string | null
          product_id?: string | null
          product_name?: string
          product_price?: number
          product_sku?: string | null
          purchased?: boolean | null
          quantity?: number
          removed_at?: string | null
          time_in_cart?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "enhanced_cart_tracking_cart_session_id_fkey"
            columns: ["cart_session_id"]
            isOneToOne: false
            referencedRelation: "cart_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enhanced_cart_tracking_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "clean_product_performance"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "enhanced_cart_tracking_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_performance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enhanced_cart_tracking_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      fulfillment_items: {
        Row: {
          created_at: string
          fulfillment_id: string
          id: string
          order_item_id: string
          quantity: number
        }
        Insert: {
          created_at?: string
          fulfillment_id: string
          id?: string
          order_item_id: string
          quantity: number
        }
        Update: {
          created_at?: string
          fulfillment_id?: string
          id?: string
          order_item_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "fulfillment_items_fulfillment_id_fkey"
            columns: ["fulfillment_id"]
            isOneToOne: false
            referencedRelation: "fulfillments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fulfillment_items_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      fulfillments: {
        Row: {
          created_at: string
          created_by: string | null
          delivered_at: string | null
          estimated_delivery_date: string | null
          fulfillment_location: string | null
          fulfillment_number: string
          id: string
          notes: string | null
          order_id: string
          shipped_at: string | null
          status: Database["public"]["Enums"]["fulfillment_status"]
          tracking_company: string | null
          tracking_number: string | null
          tracking_url: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          delivered_at?: string | null
          estimated_delivery_date?: string | null
          fulfillment_location?: string | null
          fulfillment_number: string
          id?: string
          notes?: string | null
          order_id: string
          shipped_at?: string | null
          status?: Database["public"]["Enums"]["fulfillment_status"]
          tracking_company?: string | null
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          delivered_at?: string | null
          estimated_delivery_date?: string | null
          fulfillment_location?: string | null
          fulfillment_number?: string
          id?: string
          notes?: string | null
          order_id?: string
          shipped_at?: string | null
          status?: Database["public"]["Enums"]["fulfillment_status"]
          tracking_company?: string | null
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fulfillments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      homepage_featured_categories: {
        Row: {
          category_id: string
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "homepage_featured_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: true
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homepage_featured_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: true
            referencedRelation: "category_product_counts"
            referencedColumns: ["id"]
          },
        ]
      }
      homepage_featured_products: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          product_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          product_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "homepage_featured_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "clean_product_performance"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "homepage_featured_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "product_performance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homepage_featured_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_subscriptions: {
        Row: {
          created_at: string
          email: string
          first_name: string | null
          id: string
          ip_address: unknown | null
          is_active: boolean
          last_name: string | null
          metadata: Json | null
          mobile_number: string | null
          referrer: string | null
          source: string | null
          subscribed_at: string
          unsubscribed_at: string | null
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          email: string
          first_name?: string | null
          id?: string
          ip_address?: unknown | null
          is_active?: boolean
          last_name?: string | null
          metadata?: Json | null
          mobile_number?: string | null
          referrer?: string | null
          source?: string | null
          subscribed_at?: string
          unsubscribed_at?: string | null
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          ip_address?: unknown | null
          is_active?: boolean
          last_name?: string | null
          metadata?: Json | null
          mobile_number?: string | null
          referrer?: string | null
          source?: string | null
          subscribed_at?: string
          unsubscribed_at?: string | null
          updated_at?: string
          user_agent?: string | null
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
          variant_attributes: Json | null
          variant_id: string | null
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
          variant_attributes?: Json | null
          variant_id?: string | null
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
          variant_attributes?: Json | null
          variant_id?: string | null
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
            referencedRelation: "clean_product_performance"
            referencedColumns: ["product_id"]
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
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_notes: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          is_important: boolean | null
          note_type: string
          order_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          is_important?: boolean | null
          note_type?: string
          order_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          is_important?: boolean | null
          note_type?: string
          order_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_notes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
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
      order_timeline: {
        Row: {
          created_at: string
          created_by: string | null
          event_description: string | null
          event_title: string
          event_type: string
          id: string
          metadata: Json | null
          new_value: string | null
          order_id: string
          previous_value: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          event_description?: string | null
          event_title: string
          event_type: string
          id?: string
          metadata?: Json | null
          new_value?: string | null
          order_id: string
          previous_value?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          event_description?: string | null
          event_title?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          new_value?: string | null
          order_id?: string
          previous_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_timeline_order_id_fkey"
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
          cancellation_reason: string | null
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          currency: string | null
          customer_notes: string | null
          delivered_at: string | null
          discount_amount: number | null
          email: string
          estimated_delivery_date: string | null
          expected_delivery_date: string | null
          fulfillment_location: string | null
          fulfillment_status:
            | Database["public"]["Enums"]["fulfillment_status"]
            | null
          id: string
          internal_notes: string | null
          notes: string | null
          order_number: string
          payment_gateway: string | null
          payment_gateway_response: Json | null
          payment_method: string | null
          payment_reference: string | null
          payment_status: string | null
          priority: Database["public"]["Enums"]["order_priority"] | null
          shipped_at: string | null
          shipping_address: Json | null
          shipping_amount: number | null
          source_channel: string | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          tags: string[] | null
          tax_amount: number | null
          total_amount: number
          tracking_number: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          billing_address: Json
          cancellation_reason?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          currency?: string | null
          customer_notes?: string | null
          delivered_at?: string | null
          discount_amount?: number | null
          email: string
          estimated_delivery_date?: string | null
          expected_delivery_date?: string | null
          fulfillment_location?: string | null
          fulfillment_status?:
            | Database["public"]["Enums"]["fulfillment_status"]
            | null
          id?: string
          internal_notes?: string | null
          notes?: string | null
          order_number: string
          payment_gateway?: string | null
          payment_gateway_response?: Json | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          priority?: Database["public"]["Enums"]["order_priority"] | null
          shipped_at?: string | null
          shipping_address?: Json | null
          shipping_amount?: number | null
          source_channel?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal: number
          tags?: string[] | null
          tax_amount?: number | null
          total_amount: number
          tracking_number?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          billing_address?: Json
          cancellation_reason?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          currency?: string | null
          customer_notes?: string | null
          delivered_at?: string | null
          discount_amount?: number | null
          email?: string
          estimated_delivery_date?: string | null
          expected_delivery_date?: string | null
          fulfillment_location?: string | null
          fulfillment_status?:
            | Database["public"]["Enums"]["fulfillment_status"]
            | null
          id?: string
          internal_notes?: string | null
          notes?: string | null
          order_number?: string
          payment_gateway?: string | null
          payment_gateway_response?: Json | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          priority?: Database["public"]["Enums"]["order_priority"] | null
          shipped_at?: string | null
          shipping_address?: Json | null
          shipping_amount?: number | null
          source_channel?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          tags?: string[] | null
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
      payment_settings: {
        Row: {
          created_at: string | null
          gateway_name: string
          id: string
          is_enabled: boolean | null
          is_test_mode: boolean | null
          settings: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          gateway_name: string
          id?: string
          is_enabled?: boolean | null
          is_test_mode?: boolean | null
          settings?: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          gateway_name?: string
          id?: string
          is_enabled?: boolean | null
          is_test_mode?: boolean | null
          settings?: Json
          updated_at?: string | null
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
      processing_sessions: {
        Row: {
          candidates_created: number
          completed_at: string | null
          created_by: string | null
          current_batch: number
          errors: Json | null
          id: string
          images_scanned: number
          links_created: number
          matching_stats: Json | null
          options: Json | null
          processing_stats: Json | null
          products_scanned: number
          progress: number
          session_type: string
          started_at: string
          status: string
          total_batches: number
          updated_at: string
          warnings: Json | null
        }
        Insert: {
          candidates_created?: number
          completed_at?: string | null
          created_by?: string | null
          current_batch?: number
          errors?: Json | null
          id: string
          images_scanned?: number
          links_created?: number
          matching_stats?: Json | null
          options?: Json | null
          processing_stats?: Json | null
          products_scanned?: number
          progress?: number
          session_type?: string
          started_at?: string
          status?: string
          total_batches?: number
          updated_at?: string
          warnings?: Json | null
        }
        Update: {
          candidates_created?: number
          completed_at?: string | null
          created_by?: string | null
          current_batch?: number
          errors?: Json | null
          id?: string
          images_scanned?: number
          links_created?: number
          matching_stats?: Json | null
          options?: Json | null
          processing_stats?: Json | null
          products_scanned?: number
          progress?: number
          session_type?: string
          started_at?: string
          status?: string
          total_batches?: number
          updated_at?: string
          warnings?: Json | null
        }
        Relationships: []
      }
      product_attributes: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          sort_order: number | null
          type: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          sort_order?: number | null
          type?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          sort_order?: number | null
          type?: string | null
        }
        Relationships: []
      }
      product_image_candidates: {
        Row: {
          alt_text: string | null
          created_at: string | null
          extracted_sku: string | null
          id: string
          image_url: string
          match_confidence: number
          match_metadata: Json | null
          product_id: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source_filename: string | null
          status: string | null
        }
        Insert: {
          alt_text?: string | null
          created_at?: string | null
          extracted_sku?: string | null
          id?: string
          image_url: string
          match_confidence?: number
          match_metadata?: Json | null
          product_id: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_filename?: string | null
          status?: string | null
        }
        Update: {
          alt_text?: string | null
          created_at?: string | null
          extracted_sku?: string | null
          id?: string
          image_url?: string
          match_confidence?: number
          match_metadata?: Json | null
          product_id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_filename?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_image_candidates_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "clean_product_performance"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_image_candidates_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_performance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_image_candidates_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt_text: string | null
          auto_matched: boolean | null
          created_at: string
          id: string
          image_status: string | null
          image_url: string
          is_primary: boolean | null
          match_confidence: number | null
          match_metadata: Json | null
          product_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          alt_text?: string | null
          auto_matched?: boolean | null
          created_at?: string
          id?: string
          image_status?: string | null
          image_url: string
          is_primary?: boolean | null
          match_confidence?: number | null
          match_metadata?: Json | null
          product_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          alt_text?: string | null
          auto_matched?: boolean | null
          created_at?: string
          id?: string
          image_status?: string | null
          image_url?: string
          is_primary?: boolean | null
          match_confidence?: number | null
          match_metadata?: Json | null
          product_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "clean_product_performance"
            referencedColumns: ["product_id"]
          },
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
      product_variants: {
        Row: {
          compare_at_price: number | null
          cost_price: number | null
          created_at: string
          dimensions: string | null
          id: string
          is_active: boolean | null
          parent_product_id: string
          price: number
          sku: string | null
          sort_order: number | null
          stock_quantity: number | null
          updated_at: string
          weight: number | null
          wholesale_price: number | null
        }
        Insert: {
          compare_at_price?: number | null
          cost_price?: number | null
          created_at?: string
          dimensions?: string | null
          id?: string
          is_active?: boolean | null
          parent_product_id: string
          price: number
          sku?: string | null
          sort_order?: number | null
          stock_quantity?: number | null
          updated_at?: string
          weight?: number | null
          wholesale_price?: number | null
        }
        Update: {
          compare_at_price?: number | null
          cost_price?: number | null
          created_at?: string
          dimensions?: string | null
          id?: string
          is_active?: boolean | null
          parent_product_id?: string
          price?: number
          sku?: string | null
          sort_order?: number | null
          stock_quantity?: number | null
          updated_at?: string
          weight?: number | null
          wholesale_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_parent_product_id_fkey"
            columns: ["parent_product_id"]
            isOneToOne: false
            referencedRelation: "clean_product_performance"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_variants_parent_product_id_fkey"
            columns: ["parent_product_id"]
            isOneToOne: false
            referencedRelation: "product_performance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_parent_product_id_fkey"
            columns: ["parent_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          average_rating: number | null
          brand_id: string | null
          category_id: string | null
          compare_at_price: number | null
          cost_price: number | null
          created_at: string
          description: string | null
          dimensions: string | null
          has_variants: boolean | null
          id: string
          is_active: boolean | null
          is_featured: boolean | null
          min_stock_level: number | null
          name: string
          price: number
          product_type: string | null
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
          brand_id?: string | null
          category_id?: string | null
          compare_at_price?: number | null
          cost_price?: number | null
          created_at?: string
          description?: string | null
          dimensions?: string | null
          has_variants?: boolean | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          min_stock_level?: number | null
          name: string
          price: number
          product_type?: string | null
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
          brand_id?: string | null
          category_id?: string | null
          compare_at_price?: number | null
          cost_price?: number | null
          created_at?: string
          description?: string | null
          dimensions?: string | null
          has_variants?: boolean | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          min_stock_level?: number | null
          name?: string
          price?: number
          product_type?: string | null
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
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
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
      promotional_banners: {
        Row: {
          background_color: string | null
          button_text: string | null
          button_url: string | null
          content_shadow: string | null
          created_at: string
          description: string | null
          description_font_family: string | null
          description_font_weight: string | null
          end_date: string | null
          id: string
          image_url: string | null
          is_active: boolean
          overlay_opacity: number | null
          position: number
          start_date: string | null
          subtitle: string | null
          subtitle_font_family: string | null
          subtitle_font_weight: string | null
          text_color: string | null
          text_shadow: string | null
          title: string | null
          title_font_family: string | null
          title_font_weight: string | null
          title_shadow: string | null
          updated_at: string
        }
        Insert: {
          background_color?: string | null
          button_text?: string | null
          button_url?: string | null
          content_shadow?: string | null
          created_at?: string
          description?: string | null
          description_font_family?: string | null
          description_font_weight?: string | null
          end_date?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          overlay_opacity?: number | null
          position?: number
          start_date?: string | null
          subtitle?: string | null
          subtitle_font_family?: string | null
          subtitle_font_weight?: string | null
          text_color?: string | null
          text_shadow?: string | null
          title?: string | null
          title_font_family?: string | null
          title_font_weight?: string | null
          title_shadow?: string | null
          updated_at?: string
        }
        Update: {
          background_color?: string | null
          button_text?: string | null
          button_url?: string | null
          content_shadow?: string | null
          created_at?: string
          description?: string | null
          description_font_family?: string | null
          description_font_weight?: string | null
          end_date?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          overlay_opacity?: number | null
          position?: number
          start_date?: string | null
          subtitle?: string | null
          subtitle_font_family?: string | null
          subtitle_font_weight?: string | null
          text_color?: string | null
          text_shadow?: string | null
          title?: string | null
          title_font_family?: string | null
          title_font_weight?: string | null
          title_shadow?: string | null
          updated_at?: string
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
          user_id: string | null
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
          user_id?: string | null
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
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "clean_product_performance"
            referencedColumns: ["product_id"]
          },
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
      security_audit_log: {
        Row: {
          created_at: string
          event_description: string
          event_type: string
          id: string
          ip_address: unknown | null
          metadata: Json | null
          risk_level: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_description: string
          event_type: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          risk_level?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_description?: string
          event_type?: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          risk_level?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
        }
        Relationships: []
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
          variant_id: string | null
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
          variant_id?: string | null
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
          variant_id?: string | null
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
            referencedRelation: "clean_product_performance"
            referencedColumns: ["product_id"]
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
          {
            foreignKeyName: "stock_movements_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
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
      variant_attribute_values: {
        Row: {
          attribute_id: string
          attribute_value_id: string
          created_at: string
          id: string
          variant_id: string
        }
        Insert: {
          attribute_id: string
          attribute_value_id: string
          created_at?: string
          id?: string
          variant_id: string
        }
        Update: {
          attribute_id?: string
          attribute_value_id?: string
          created_at?: string
          id?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "variant_attribute_values_attribute_id_fkey"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "product_attributes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variant_attribute_values_attribute_value_id_fkey"
            columns: ["attribute_value_id"]
            isOneToOne: false
            referencedRelation: "attribute_values"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variant_attribute_values_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_promotions: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          download_count: number | null
          file_size: number | null
          file_type: string
          file_url: string
          id: string
          is_active: boolean
          sort_order: number | null
          title: string
          updated_at: string
          week_end_date: string
          week_start_date: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          download_count?: number | null
          file_size?: number | null
          file_type: string
          file_url: string
          id?: string
          is_active?: boolean
          sort_order?: number | null
          title: string
          updated_at?: string
          week_end_date: string
          week_start_date: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          download_count?: number | null
          file_size?: number | null
          file_type?: string
          file_url?: string
          id?: string
          is_active?: boolean
          sort_order?: number | null
          title?: string
          updated_at?: string
          week_end_date?: string
          week_start_date?: string
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
            referencedRelation: "clean_product_performance"
            referencedColumns: ["product_id"]
          },
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
      clean_customer_analytics: {
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
      clean_product_performance: {
        Row: {
          category_id: string | null
          category_name: string | null
          conversion_rate: number | null
          price: number | null
          product_id: string | null
          product_name: string | null
          sku: string | null
          total_cart_adds: number | null
          total_revenue: number | null
          total_sold: number | null
          total_views: number | null
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
      assign_user_role: {
        Args: {
          target_role: Database["public"]["Enums"]["app_role"]
          target_user_id: string
        }
        Returns: boolean
      }
      bulk_insert_products: {
        Args:
          | { import_id_param: string; products_data: Json }
          | {
              import_id_param: string
              products_data: Json
              update_duplicates?: boolean
            }
        Returns: Json
      }
      bulk_update_order_status: {
        Args: {
          new_status: Database["public"]["Enums"]["order_status"]
          notes?: string
          order_ids: string[]
        }
        Returns: number
      }
      cleanup_old_batch_progress: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_old_processing_sessions: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_admin_user: {
        Args: { user_email: string }
        Returns: boolean
      }
      create_manager_user: {
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
      get_realtime_metrics: {
        Args: { hours_back?: number }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_authentic_user: {
        Args: { user_id_param: string }
        Returns: boolean
      }
      promote_image_candidate: {
        Args: { candidate_id: string }
        Returns: string
      }
      refresh_analytics_views: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      refresh_category_counts: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      reject_image_candidate: {
        Args: { candidate_id: string; reason?: string }
        Returns: boolean
      }
      remove_user_role: {
        Args: {
          target_role: Database["public"]["Enums"]["app_role"]
          target_user_id: string
        }
        Returns: boolean
      }
      search_products: {
        Args: {
          category_filter?: string
          in_stock_only?: boolean
          limit_count?: number
          max_price?: number
          min_price?: number
          offset_count?: number
          search_query: string
        }
        Returns: {
          category_id: string
          category_name: string
          compare_at_price: number
          created_at: string
          id: string
          image_url: string
          is_active: boolean
          is_featured: boolean
          name: string
          price: number
          search_rank: number
          slug: string
          stock_quantity: number
        }[]
      }
      update_product_stock: {
        Args: {
          p_movement_type: string
          p_notes?: string
          p_order_id?: string
          p_product_id: string
          p_quantity_change: number
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "customer" | "wholesale" | "admin" | "superadmin" | "manager"
      fulfillment_status:
        | "unfulfilled"
        | "partially_fulfilled"
        | "fulfilled"
        | "shipped"
        | "delivered"
        | "returned"
      order_priority: "low" | "normal" | "high" | "urgent"
      order_status:
        | "pending"
        | "confirmed"
        | "processing"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "awaiting_payment"
        | "payment_failed"
        | "partially_fulfilled"
        | "fulfilled"
        | "out_for_delivery"
        | "completed"
        | "returned"
        | "refunded"
        | "disputed"
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["customer", "wholesale", "admin", "superadmin", "manager"],
      fulfillment_status: [
        "unfulfilled",
        "partially_fulfilled",
        "fulfilled",
        "shipped",
        "delivered",
        "returned",
      ],
      order_priority: ["low", "normal", "high", "urgent"],
      order_status: [
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "awaiting_payment",
        "payment_failed",
        "partially_fulfilled",
        "fulfilled",
        "out_for_delivery",
        "completed",
        "returned",
        "refunded",
        "disputed",
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

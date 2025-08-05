import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExportRequest {
  format: 'csv' | 'json';
  filters: {
    searchTerm?: string;
    statusFilter?: string;
    sourceFilter?: string;
    dateFrom?: string;
    dateTo?: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { format, filters }: ExportRequest = await req.json();

    // Build the query
    let query = supabaseClient
      .from('newsletter_subscriptions')
      .select('*');

    // Apply filters
    if (filters.searchTerm) {
      query = query.or(`email.ilike.%${filters.searchTerm}%,first_name.ilike.%${filters.searchTerm}%,last_name.ilike.%${filters.searchTerm}%`);
    }

    if (filters.statusFilter && filters.statusFilter !== 'all') {
      query = query.eq('is_active', filters.statusFilter === 'active');
    }

    if (filters.sourceFilter && filters.sourceFilter !== 'all') {
      query = query.eq('source', filters.sourceFilter);
    }

    if (filters.dateFrom) {
      query = query.gte('subscribed_at', filters.dateFrom);
    }

    if (filters.dateTo) {
      query = query.lte('subscribed_at', filters.dateTo);
    }

    // Order by subscription date
    query = query.order('subscribed_at', { ascending: false });

    const { data: subscriptions, error } = await query;

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    let content: string;

    if (format === 'csv') {
      // Generate CSV
      const headers = [
        'Email',
        'First Name',
        'Last Name',
        'Source',
        'Status',
        'Subscribed At',
        'Unsubscribed At',
        'IP Address',
        'User Agent',
        'Referrer'
      ];

      const csvRows = [
        headers.join(','),
        ...subscriptions.map(sub => [
          `"${sub.email}"`,
          `"${sub.first_name || ''}"`,
          `"${sub.last_name || ''}"`,
          `"${sub.source}"`,
          `"${sub.is_active ? 'Active' : 'Unsubscribed'}"`,
          `"${sub.subscribed_at}"`,
          `"${sub.unsubscribed_at || ''}"`,
          `"${sub.ip_address || ''}"`,
          `"${(sub.user_agent || '').replace(/"/g, '""')}"`,
          `"${sub.referrer || ''}"`
        ].join(','))
      ];

      content = csvRows.join('\n');
    } else {
      // Generate JSON
      content = JSON.stringify(subscriptions, null, 2);
    }

    console.log(`Exported ${subscriptions.length} subscriptions in ${format} format`);

    return new Response(
      JSON.stringify({ 
        content,
        count: subscriptions.length,
        format 
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );

  } catch (error: any) {
    console.error('Error in export-subscriptions function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An unexpected error occurred',
        details: error.toString()
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
};

serve(handler);
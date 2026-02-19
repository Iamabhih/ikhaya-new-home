import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Use service role to allow admin operations
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify the calling user is a superadmin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user: caller }, error: authError } = await callerClient.auth.getUser();
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check caller has superadmin role
    const { data: callerRoles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id);

    const isSuperAdmin = callerRoles?.some((r: any) => r.role === "superadmin");
    if (!isSuperAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: superadmin required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { userId } = await req.json();
    if (!userId) {
      return new Response(JSON.stringify({ error: "userId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prevent self-deletion
    if (userId === caller.id) {
      return new Response(JSON.stringify({ error: "Cannot delete your own account" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[delete-user] Deleting user ${userId} requested by ${caller.id}`);

    // 1. Nullify user_id on orders (preserve orders, remove user link)
    await supabase.from("orders").update({ user_id: null }).eq("user_id", userId);

    // 2. Delete user_roles
    await supabase.from("user_roles").delete().eq("user_id", userId);

    // 3. Delete cart sessions and items
    const { data: cartSessions } = await supabase
      .from("cart_sessions")
      .select("id")
      .eq("user_id", userId);
    if (cartSessions?.length) {
      const sessionIds = cartSessions.map((s: any) => s.id);
      await supabase.from("cart_items").delete().in("cart_session_id", sessionIds);
    }
    await supabase.from("cart_sessions").delete().eq("user_id", userId);

    // 4. Delete loyalty points and transactions
    await supabase.from("loyalty_transactions").delete().eq("user_id", userId);
    await supabase.from("loyalty_points").delete().eq("user_id", userId);

    // 5. Delete wishlist items
    await supabase.from("wishlist_items").delete().eq("user_id", userId);

    // 6. Unlink pending orders
    await supabase.from("pending_orders").update({ user_id: null }).eq("user_id", userId);

    // 7. Delete product_imports — this table had no ON DELETE rule (defaults to
    //    RESTRICT) so it blocked auth.admin.deleteUser() when a user had import
    //    records.  Explicitly remove them here; the migration also adds ON DELETE
    //    CASCADE as a database-level safety net.
    await supabase.from("product_imports").delete().eq("user_id", userId);

    // 8. Nullify security_audit_log user references — preserve compliance logs
    //    but remove the FK reference so deleteUser() is not blocked.
    await supabase
      .from("security_audit_log")
      .update({ user_id: null })
      .eq("user_id", userId);

    // 9. Delete the profile
    await supabase.from("profiles").delete().eq("id", userId);

    // 10. Delete auth user (requires service role)
    const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(userId);
    if (deleteAuthError) {
      console.error("[delete-user] auth.admin.deleteUser error:", deleteAuthError);
      return new Response(
        JSON.stringify({ error: `Failed to delete auth user: ${deleteAuthError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[delete-user] User ${userId} deleted successfully`);
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[delete-user] Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

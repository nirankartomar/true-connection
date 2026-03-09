import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" });

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
    } = await supabaseUser.auth.getUser();
    if (!user) return json({ error: "Unauthorized" });

    const { action, token } = await req.json();

    if (action === "validate") {
      const { data: tokenOnly } = await supabaseAdmin
        .from("connection_tokens")
        .select("*")
        .eq("token", token)
        .eq("status", "active")
        .single();

      if (!tokenOnly) {
        return json({ error: "Token is invalid, expired, or already used." });
      }

      if (tokenOnly.owner_user_id === user.id) {
        return json({ error: "You cannot use your own token." });
      }

      if (tokenOnly.expires_at && new Date(tokenOnly.expires_at) < new Date()) {
        await supabaseAdmin
          .from("connection_tokens")
          .update({ status: "expired" })
          .eq("id", tokenOnly.id);
        return json({ error: "This token has expired." });
      }

      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("full_name, avatar_url, city, state, gender, bio_who_i_am, bio_who_was_i, bio_who_will_i_be, bio_what_i_am_doing")
        .eq("user_id", tokenOnly.owner_user_id)
        .single();

      // Fetch active connections of the token owner
      const { data: activeConns } = await supabaseAdmin
        .from("connections")
        .select("id, category, connected_at, connected_user_id, user_id")
        .or(`user_id.eq.${tokenOnly.owner_user_id},connected_user_id.eq.${tokenOnly.owner_user_id}`)
        .eq("is_active", true)
        .eq("status", "accepted");

      // Fetch history (inactive) connections
      const { data: historyConns } = await supabaseAdmin
        .from("connections")
        .select("id, category, connected_at, removed_at, connected_user_id, user_id")
        .or(`user_id.eq.${tokenOnly.owner_user_id},connected_user_id.eq.${tokenOnly.owner_user_id}`)
        .eq("is_active", false);

      // Get profile info for connected users
      const allConnUserIds = new Set<string>();
      for (const c of [...(activeConns || []), ...(historyConns || [])]) {
        const otherId = c.user_id === tokenOnly.owner_user_id ? c.connected_user_id : c.user_id;
        allConnUserIds.add(otherId);
      }

      let connProfiles: Record<string, { full_name: string; avatar_url: string | null }> = {};
      if (allConnUserIds.size > 0) {
        const { data: profiles } = await supabaseAdmin
          .from("profiles")
          .select("user_id, full_name, avatar_url")
          .in("user_id", Array.from(allConnUserIds));
        for (const p of profiles || []) {
          connProfiles[p.user_id] = { full_name: p.full_name, avatar_url: p.avatar_url };
        }
      }

      const mapConn = (c: any) => {
        const otherId = c.user_id === tokenOnly.owner_user_id ? c.connected_user_id : c.user_id;
        const p = connProfiles[otherId];
        return {
          id: c.id,
          category: c.category,
          connected_at: c.connected_at,
          removed_at: c.removed_at || null,
          name: p?.full_name || "Unknown",
          avatar_url: p?.avatar_url || null,
        };
      };

      return json({
        token_id: tokenOnly.id,
        owner_user_id: tokenOnly.owner_user_id,
        relationship_type: tokenOnly.relationship_type,
        intent_message: tokenOnly.intent_message,
        profile: profile || null,
        active_connections: (activeConns || []).map(mapConn),
        history_connections: (historyConns || []).map(mapConn),
      });
    }

    if (action === "redeem") {
      const { data: tokenData } = await supabaseAdmin
        .from("connection_tokens")
        .select("*")
        .eq("token", token)
        .eq("status", "active")
        .single();

      if (!tokenData) return json({ error: "Token is invalid or already used." });
      if (tokenData.owner_user_id === user.id) return json({ error: "You cannot use your own token." });
      if (tokenData.relationship_type === "view_only") return json({ error: "This is a view-only token. No connection can be created." });

      if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
        await supabaseAdmin
          .from("connection_tokens")
          .update({ status: "expired" })
          .eq("id", tokenData.id);
        return json({ error: "This token has expired." });
      }

      // Check for existing ACTIVE connection only
      const { data: existing } = await supabaseAdmin
        .from("connections")
        .select("id")
        .or(
          `and(user_id.eq.${tokenData.owner_user_id},connected_user_id.eq.${user.id}),and(user_id.eq.${user.id},connected_user_id.eq.${tokenData.owner_user_id})`
        )
        .eq("is_active", true)
        .limit(1);

      if (existing && existing.length > 0) {
        return json({ error: "You already have an active connection with this person." });
      }

      // Check 5-connection limit
      const { count: userCount } = await supabaseAdmin
        .from("connections")
        .select("id", { count: "exact", head: true })
        .or(`user_id.eq.${user.id},connected_user_id.eq.${user.id}`)
        .eq("is_active", true)
        .eq("status", "accepted");

      if ((userCount ?? 0) >= 5) {
        return json({ error: "You have reached the maximum of 5 connections." });
      }

      const { count: ownerCount } = await supabaseAdmin
        .from("connections")
        .select("id", { count: "exact", head: true })
        .or(`user_id.eq.${tokenData.owner_user_id},connected_user_id.eq.${tokenData.owner_user_id}`)
        .eq("is_active", true)
        .eq("status", "accepted");

      if ((ownerCount ?? 0) >= 5) {
        return json({ error: "The token owner has reached their connection limit." });
      }

      // ATOMIC CLAIM: mark token as used only if still active — prevents race conditions
      const { data: claimed, error: claimError } = await supabaseAdmin
        .from("connection_tokens")
        .update({
          status: "used",
          used_at: new Date().toISOString(),
          used_by_user_id: user.id,
        })
        .eq("id", tokenData.id)
        .eq("status", "active") // Only succeeds if still active
        .select("id");

      if (claimError || !claimed || claimed.length === 0) {
        return json({ error: "Token is invalid or already used." });
      }

      const categoryMap: Record<string, string> = {
        friend: "friend",
        family: "family",
        lover: "love",
      };

      const { error: connError } = await supabaseAdmin.from("connections").insert({
        user_id: tokenData.owner_user_id,
        connected_user_id: user.id,
        category: categoryMap[tokenData.relationship_type] || tokenData.relationship_type,
        status: "accepted",
        is_active: true,
      });

      if (connError) {
        // Rollback: revert token back to active if connection failed
        await supabaseAdmin
          .from("connection_tokens")
          .update({ status: "active", used_at: null, used_by_user_id: null })
          .eq("id", tokenData.id);
        return json({ error: connError.message });
      }

      return json({ success: true });
    }

    return json({ error: "Invalid action" });
  } catch (err) {
    console.error("redeem-token error:", err);
    return json({ error: err.message });
  }
});

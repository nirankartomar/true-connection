import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, token } = await req.json();

    if (action === "validate") {
      // Look up token
      const { data: tokenData, error } = await supabaseAdmin
        .from("connection_tokens")
        .select("*, profiles!connection_tokens_owner_user_id_fkey(full_name, avatar_url, city, state, gender, bio_who_i_am)")
        .eq("token", token)
        .eq("status", "active")
        .single();

      if (error || !tokenData) {
        // Try without join – token might exist but foreign key isn't set up
        const { data: tokenOnly } = await supabaseAdmin
          .from("connection_tokens")
          .select("*")
          .eq("token", token)
          .eq("status", "active")
          .single();

        if (!tokenOnly) {
          return new Response(
            JSON.stringify({ error: "Token is invalid, expired, or already used." }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (tokenOnly.owner_user_id === user.id) {
          return new Response(
            JSON.stringify({ error: "You cannot use your own token." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (tokenOnly.expires_at && new Date(tokenOnly.expires_at) < new Date()) {
          await supabaseAdmin
            .from("connection_tokens")
            .update({ status: "expired" })
            .eq("id", tokenOnly.id);
          return new Response(
            JSON.stringify({ error: "This token has expired." }),
            { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Fetch profile separately
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("full_name, avatar_url, city, state, gender, bio_who_i_am")
          .eq("user_id", tokenOnly.owner_user_id)
          .single();

        return new Response(
          JSON.stringify({
            token_id: tokenOnly.id,
            owner_user_id: tokenOnly.owner_user_id,
            relationship_type: tokenOnly.relationship_type,
            intent_message: tokenOnly.intent_message,
            profile: profile || null,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (tokenData.owner_user_id === user.id) {
        return new Response(
          JSON.stringify({ error: "You cannot use your own token." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
        await supabaseAdmin
          .from("connection_tokens")
          .update({ status: "expired" })
          .eq("id", tokenData.id);
        return new Response(
          JSON.stringify({ error: "This token has expired." }),
          { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          token_id: tokenData.id,
          owner_user_id: tokenData.owner_user_id,
          relationship_type: tokenData.relationship_type,
          intent_message: tokenData.intent_message,
          profile: tokenData.profiles || null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "redeem") {
      // Mark token as used and create connection
      const { data: tokenData } = await supabaseAdmin
        .from("connection_tokens")
        .select("*")
        .eq("token", token)
        .eq("status", "active")
        .single();

      if (!tokenData) {
        return new Response(
          JSON.stringify({ error: "Token is invalid or already used." }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (tokenData.owner_user_id === user.id) {
        return new Response(
          JSON.stringify({ error: "You cannot use your own token." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (tokenData.relationship_type === "view_only") {
        return new Response(
          JSON.stringify({ error: "This is a view-only token. No connection can be created." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check existing connection
      const { data: existing } = await supabaseAdmin
        .from("connections")
        .select("id")
        .or(
          `and(user_id.eq.${tokenData.owner_user_id},connected_user_id.eq.${user.id}),and(user_id.eq.${user.id},connected_user_id.eq.${tokenData.owner_user_id})`
        )
        .eq("is_active", true)
        .limit(1);

      if (existing && existing.length > 0) {
        return new Response(
          JSON.stringify({ error: "You already have an active connection with this person." }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check 5-connection limit for both users
      const { count: userCount } = await supabaseAdmin
        .from("connections")
        .select("id", { count: "exact", head: true })
        .or(`user_id.eq.${user.id},connected_user_id.eq.${user.id}`)
        .eq("is_active", true)
        .eq("status", "accepted");

      if ((userCount ?? 0) >= 5) {
        return new Response(
          JSON.stringify({ error: "You have reached the maximum of 5 connections." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { count: ownerCount } = await supabaseAdmin
        .from("connections")
        .select("id", { count: "exact", head: true })
        .or(`user_id.eq.${tokenData.owner_user_id},connected_user_id.eq.${tokenData.owner_user_id}`)
        .eq("is_active", true)
        .eq("status", "accepted");

      if ((ownerCount ?? 0) >= 5) {
        return new Response(
          JSON.stringify({ error: "The token owner has reached their connection limit." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Map relationship type to category
      const categoryMap: Record<string, string> = {
        friend: "friend",
        family: "family",
        lover: "love",
      };

      // Create connection (accepted immediately via token)
      const { error: connError } = await supabaseAdmin.from("connections").insert({
        user_id: tokenData.owner_user_id,
        connected_user_id: user.id,
        category: categoryMap[tokenData.relationship_type] || tokenData.relationship_type,
        status: "accepted",
        is_active: true,
      });

      if (connError) {
        return new Response(
          JSON.stringify({ error: connError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Mark token as used
      await supabaseAdmin
        .from("connection_tokens")
        .update({
          status: "used",
          used_at: new Date().toISOString(),
          used_by_user_id: user.id,
        })
        .eq("id", tokenData.id);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

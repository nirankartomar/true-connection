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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "Missing AI key" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse body — expects { imageBase64: string (data url or base64), mimeType: string }
    const body = await req.json();
    const { imageBase64, mimeType = "image/jpeg" } = body;

    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "No image provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Strip data-url prefix if present
    const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, "");

    // Get all existing avatar URLs from profiles
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, avatar_url")
      .not("avatar_url", "is", null);

    if (!profiles || profiles.length === 0) {
      // No existing profiles to compare against
      return new Response(JSON.stringify({ isDuplicate: false, matchedUser: null }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build content parts for Gemini: new photo + all existing avatars
    const imageParts: Array<{ type: string; image_url?: { url: string }; text?: string }> = [];

    // New selfie
    imageParts.push({
      type: "image_url",
      image_url: { url: `data:${mimeType};base64,${base64Data}` },
    });

    // Add text label
    imageParts.push({ type: "text", text: "This is the NEW person trying to register (Image 0)." });

    // Existing profile photos
    const validProfiles: typeof profiles = [];
    for (const profile of profiles) {
      if (!profile.avatar_url) continue;
      try {
        // Fetch existing avatar as base64
        const res = await fetch(profile.avatar_url);
        if (!res.ok) continue;
        const arrBuf = await res.arrayBuffer();
        const uint8 = new Uint8Array(arrBuf);
        let binary = "";
        for (let i = 0; i < uint8.length; i++) binary += String.fromCharCode(uint8[i]);
        const existingBase64 = btoa(binary);
        const contentType = res.headers.get("content-type") || "image/jpeg";
        imageParts.push({
          type: "image_url",
          image_url: { url: `data:${contentType};base64,${existingBase64}` },
        });
        imageParts.push({ type: "text", text: `This is existing user #${validProfiles.length + 1}: ${profile.full_name}.` });
        validProfiles.push(profile);
      } catch (_) {
        // skip unreachable avatar
      }
    }

    if (validProfiles.length === 0) {
      return new Response(JSON.stringify({ isDuplicate: false, matchedUser: null }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    imageParts.push({
      type: "text",
      text: `You are a strict face-matching security system. Compare the face in Image 0 (new registrant) against all ${validProfiles.length} existing user images. 

Rules:
- Compare ONLY the faces, not background, clothing, or photo angle.
- Account for different lighting, angles, and expressions — focus purely on facial structure.
- If the new person's face matches ANY existing user's face with HIGH confidence (>80%), respond with JSON: {\"isDuplicate\": true, \"matchedName\": \"<name>\"}
- If no match, respond with JSON: {\"isDuplicate\": false, \"matchedName\": null}
- Respond ONLY with raw JSON, no markdown, no explanation.`,
    });

    // Call Gemini via Lovable AI Gateway
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: imageParts,
          },
        ],
        max_tokens: 100,
        temperature: 0,
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI API error:", errText);
      return new Response(JSON.stringify({ error: "AI comparison failed", details: errText }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiRes.json();
    const rawContent = aiData.choices?.[0]?.message?.content?.trim() || "{}";
    console.log("AI response:", rawContent);

    // Parse the JSON response
    let result: { isDuplicate: boolean; matchedName: string | null } = { isDuplicate: false, matchedName: null };
    try {
      // Strip possible markdown code fences
      const cleaned = rawContent.replace(/```json|```/g, "").trim();
      result = JSON.parse(cleaned);
    } catch (e) {
      console.error("Failed to parse AI JSON:", rawContent, e);
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

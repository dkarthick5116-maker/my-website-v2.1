const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function reply(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  try {
    const { roll_number, school_name, password } = await req.json();
    if (![roll_number, school_name, password].every((v) => typeof v === "string" && v.trim())) {
      return reply({ error: "Enter roll number, school name and password." }, 400);
    }
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const admin = createClient(url, serviceKey);
    const schoolKey = school_name.trim().toLowerCase().replace(/\s+/g, " ");
    const rollKey = roll_number.trim().toLowerCase();

    const { data: profile, error: lookupError } = await admin.from("profiles")
      .select("id").eq("role","student").eq("school_key",schoolKey).eq("roll_key",rollKey).maybeSingle();
    if (lookupError || !profile) return reply({ error: "Login failed. Check your details or contact your school." }, 401);

    const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${schoolKey}::${rollKey}`));
    const hex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2,"0")).join("");
    const internalEmail = `student-${hex}@student-login.invalid`;
    const auth = createClient(url, anonKey);
    const { data, error } = await auth.auth.signInWithPassword({ email: internalEmail, password });
    if (error || !data.session) return reply({ error: "Login failed. Check your details or contact your school." }, 401);
    return reply({ session: data.session });
  } catch (_e) {
    return reply({ error: "Login failed. Check your details or try again." }, 400);
  }
});

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
    const { name, roll_number, school_name, class_name, curriculum, parent_email, password } = await req.json();
    if (![name, roll_number, school_name, class_name, curriculum, password].every((v) => typeof v === "string" && v.trim())) {
      return reply({ error: "Please complete all required fields." }, 400);
    }
    if (password.length < 8 || roll_number.length > 40 || school_name.length > 160 || name.length > 120) {
      return reply({ error: "Check the field lengths and use a password of at least 8 characters." }, 400);
    }
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, serviceKey);
    const schoolKey = school_name.trim().toLowerCase().replace(/\s+/g, " ");
    const rollKey = roll_number.trim().toLowerCase();
    const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${schoolKey}::${rollKey}`));
    const hex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2,"0")).join("");
    const internalEmail = `student-${hex}@student-login.invalid`;

    const { data: existing } = await admin.from("profiles").select("id")
      .eq("role","student").eq("school_key",schoolKey).eq("roll_key",rollKey).maybeSingle();
    if (existing) return reply({ error: "An account with this school and roll number already exists. Contact your school administrator." }, 409);

    const { data, error } = await admin.auth.admin.createUser({
      email: internalEmail, password, email_confirm: true,
      user_metadata: {
        role: "student", full_name: name.trim(), school_name: school_name.trim(),
        roll_number: roll_number.trim(), class_name: class_name.trim(),
        curriculum: curriculum.trim(), parent_email: (parent_email || "").trim()
      }
    });
    if (error) return reply({ error: "Could not create account. Check the details or contact the administrator." }, 400);
    return reply({ message: "Student account created. Log in with roll number, school name and password.", user_id: data.user.id });
  } catch (_e) {
    return reply({ error: "Unable to complete signup. Please try again." }, 400);
  }
});

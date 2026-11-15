(() => {
  const cfg = window.APP_CONFIG || {};
  const ready = cfg.SUPABASE_URL && !cfg.SUPABASE_URL.includes("YOUR-") &&
    cfg.SUPABASE_ANON_KEY && !cfg.SUPABASE_ANON_KEY.includes("YOUR_");
  const supabase = ready && window.supabase
    ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY)
    : null;
  const $ = (id) => document.getElementById(id);
  const message = (text, error=false) => {
    $("message").textContent = text;
    $("message").classList.remove("hidden","error");
    if (error) $("message").classList.add("error");
  };
  const hideMessage = () => $("message").classList.add("hidden");
  const val = (form, key) => new FormData(form).get(key)?.toString().trim() || "";
  const normalize = (s) => s.trim().replace(/\s+/g," ").toLowerCase();

  document.querySelectorAll(".tab").forEach(btn => btn.addEventListener("click", () => {
    const card = btn.closest(".panel");
    card.querySelectorAll(".tab").forEach(b => b.classList.toggle("active", b===btn));
    card.querySelectorAll(".auth-form").forEach(f => f.classList.toggle("hidden", f.id !== btn.dataset.tab));
    hideMessage();
  }));

  function setLanguage(lang) {
    document.documentElement.lang = lang === "ta" ? "ta" : "en";
    document.querySelectorAll("[data-en][data-ta]").forEach(el => {
      el.textContent = el.dataset[lang === "ta" ? "ta" : "en"];
    });
    $("englishBtn").classList.toggle("active", lang === "en");
    $("tamilBtn").classList.toggle("active", lang === "ta");
  }
  $("englishBtn").onclick = () => setLanguage("en");
  $("tamilBtn").onclick = () => setLanguage("ta");

  async function edgeFunction(name, body) {
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch(`${cfg.SUPABASE_URL}/functions/v1/${name}`, {
      method:"POST",
      headers:{"Content-Type":"application/json","apikey":cfg.SUPABASE_ANON_KEY,
        "Authorization":`Bearer ${session?.access_token || cfg.SUPABASE_ANON_KEY}`},
      body:JSON.stringify(body)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "Request failed. Please try again.");
    return result;
  }

  $("student-signup").addEventListener("submit", async e => {
    e.preventDefault(); hideMessage();
    if (!supabase) return message("First configure config.js with your Supabase project URL and public key.", true);
    const f=e.currentTarget;
    const payload={name:val(f,"name"),roll_number:val(f,"roll"),school_name:val(f,"school"),
      class_name:val(f,"class_name"),curriculum:val(f,"curriculum"),
      parent_email:val(f,"parent_email"),password:val(f,"password")};
    try {
      const result=await edgeFunction("student-signup",payload);
      message(result.message || "Student account created. You can now log in using roll number, school name and password.");
      f.reset();
    } catch(err) { message(err.message,true); }
  });

  $("student-login").addEventListener("submit", async e => {
    e.preventDefault(); hideMessage();
    if (!supabase) return message("First configure config.js with your Supabase project URL and public key.", true);
    const f=e.currentTarget;
    try {
      const result=await edgeFunction("student-login",{roll_number:val(f,"roll"),school_name:val(f,"school"),password:val(f,"password")});
      if (result.session) {
        const {error}=await supabase.auth.setSession(result.session);
        if(error) throw error;
      }
      await showDashboard();
      message("Student login successful.");
    } catch(err) { message(err.message || "Login failed. Check your details.",true); }
  });

  $("teacher-signup").addEventListener("submit", async e => {
    e.preventDefault(); hideMessage();
    if (!supabase) return message("First configure config.js with your Supabase project URL and public key.", true);
    const f=e.currentTarget;
    try {
      const {data,error}=await supabase.auth.signUp({
        email:val(f,"email"),password:val(f,"password"),
        options:{emailRedirectTo:location.origin, data:{
          role:"teacher",full_name:val(f,"name"),school_name:val(f,"school"),
          curriculum:val(f,"curriculum"),subjects:val(f,"subjects")
        }}
      });
      if(error) throw error;
      message(data.session ? "Teacher account created. Please check your email for verification." :
        "Registration submitted. Check your email and click the verification link before logging in.");
      f.reset();
    } catch(err) { message(err.message,true); }
  });

  $("teacher-login").addEventListener("submit", async e => {
    e.preventDefault(); hideMessage();
    if (!supabase) return message("First configure config.js with your Supabase project URL and public key.", true);
    const f=e.currentTarget;
    try {
      const {data,error}=await supabase.auth.signInWithPassword({email:val(f,"email"),password:val(f,"password")});
      if(error) throw error;
      const {data:profile,error:profileError}=await supabase.from("profiles").select("role,school_name,full_name,curriculum").eq("id",data.user.id).single();
      if(profileError) throw profileError;
      if(profile.role!=="teacher" || normalize(profile.school_name)!==normalize(val(f,"school"))) {
        await supabase.auth.signOut();
        throw new Error("The school name does not match this teacher account.");
      }
      await showDashboard();
      message("Teacher login successful.");
    } catch(err) { message(err.message || "Login failed.",true); }
  });

  async function showDashboard() {
    const {data:{user}}=await supabase.auth.getUser();
    if(!user) return;
    const {data:p,error}=await supabase.from("profiles").select("role,full_name,school_name,curriculum,class_name,roll_number").eq("id",user.id).single();
    if(error) throw error;
    $("welcomeTitle").textContent=`Welcome, ${p.full_name || "User"}`;
    $("profileSummary").textContent=`${p.role} · ${p.school_name} · ${p.curriculum || ""}`;
    $("dashboard").classList.remove("hidden");
    document.querySelector(".portal-grid").classList.add("hidden");
    $("dashboard").scrollIntoView({behavior:"smooth"});
  }
  $("logoutBtn").onclick=async()=>{if(supabase) await supabase.auth.signOut();$("dashboard").classList.add("hidden");document.querySelector(".portal-grid").classList.remove("hidden");message("You have been logged out.");};
  if(!ready) message("Setup required: add your Supabase URL and public anon/publishable key in config.js before using account features.",true);
})();
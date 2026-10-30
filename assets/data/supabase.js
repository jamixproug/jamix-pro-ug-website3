/* ============================================================
   JAMIX PRO UG — Supabase configuration
   ------------------------------------------------------------
   Project URL and the PUBLISHABLE key (Supabase → Project
   Settings → API Keys). Older projects call the same value the
   "anon" key; either works.

   This key is designed to be public: it is protected by the
   row-level security rules in supabase/schema.sql. Never put a
   secret or service_role key in this file — it bypasses every
   rule.

   Leave url blank to keep the player on its built-in 11 clips
   and to show the setup checklist on admin.html.
   ============================================================ */
window.JAMIX_SUPABASE = {
  url: "https://zrdeyvvufcxkiugcpuqh.supabase.co",
  key: "sb_publishable_syI_TVVAJtLs7AY6KTIccA_JDmbfoXb"
};

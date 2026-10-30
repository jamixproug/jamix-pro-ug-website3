/* ============================================================
   JAMIX PRO UG — Supabase configuration
   ------------------------------------------------------------
   Fill in both values from Supabase → Project Settings → API.

   The anon key is designed to be public: it is protected by the
   row-level security rules in supabase/schema.sql. Never put the
   service_role key in this file — it bypasses every rule.

   Leave both blank to keep the player on its built-in 11 clips
   and to show the setup checklist on admin.html.
   ============================================================ */
window.JAMIX_SUPABASE = {
  url: "",      // e.g. "https://abcdefghijkl.supabase.co"
  anonKey: ""   // e.g. "eyJhbGciOiJIUzI1NiIsInR5cCI6..."
};

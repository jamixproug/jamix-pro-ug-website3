/* ============================================================
   JAMIX PRO UG — Shared account helpers
   Supabase Auth only. No passwords, tokens or service keys are
   stored in this file.
   ============================================================ */
(function () {
  "use strict";

  const config = window.JAMIX_SUPABASE || {};
  const publicKey = String(config.key || config.anonKey || "");
  const configured =
    /^https?:\/\//.test(String(config.url || "")) && publicKey.length > 20;
  const ALLOWED_NEXT = ["account.html", "profile.html"];

  let clientInstance = null;

  function client() {
    if (!configured) return null;
    if (!window.supabase || typeof window.supabase.createClient !== "function") return null;
    if (!clientInstance) {
      clientInstance = window.supabase.createClient(
        String(config.url).replace(/\/+$/, ""),
        publicKey
      );
    }
    return clientInstance;
  }

  function param(name) {
    try {
      return new URLSearchParams(window.location.search).get(name) || "";
    } catch (error) {
      return "";
    }
  }

  function nextTarget() {
    const raw = String(param("next") || "").trim();
    return ALLOWED_NEXT.indexOf(raw) === -1 ? "account.html" : raw;
  }

  function goToLogin() {
    const here = (window.location.pathname.split("/").pop() || "").toLowerCase();
    const next = ALLOWED_NEXT.indexOf(here) === -1 ? "account.html" : here;
    window.location.replace("login.html?next=" + encodeURIComponent(next));
  }

  function friendlyAuthError(message) {
    const text = String(message || "").trim();
    if (/invalid login credentials/i.test(text)) return "That email and password do not match.";
    if (/email not confirmed/i.test(text)) return "Confirm your email address first. Check your inbox for the link.";
    if (/user already registered|already been registered/i.test(text)) return "An account with that email already exists. Sign in instead.";
    if (/password should be at least|weak password/i.test(text)) return "Use a password of at least 8 characters.";
    if (/rate limit|too many/i.test(text)) return "Too many attempts. Wait a minute and try again.";
    if (/unable to validate email|invalid email/i.test(text)) return "Enter a valid email address.";
    if (/failed to fetch|network/i.test(text)) return "Could not reach the server. Check your connection and try again.";
    return text || "Something went wrong. Please try again.";
  }

  function passwordProblem(password, email) {
    const value = String(password || "");
    if (value.length < 8) return "Use at least 8 characters.";
    if (value.length > 72) return "Keep the password under 72 characters.";
    if (email && value.toLowerCase() === String(email).trim().toLowerCase()) {
      return "Choose a password that is not your email address.";
    }
    return "";
  }

  function formatDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  }

  async function loadProfile(c, userId) {
    const response = await c
      .from("profiles")
      .select("id,email,display_name,avatar_path,is_suspended,created_at,updated_at")
      .eq("id", userId)
      .maybeSingle();
    if (response.error) throw new Error(response.error.message);
    return response.data || null;
  }

  // Resolves to {client, session, profile} or {error}. Redirects on
  // the signed-out and suspended paths so pages never render empty.
  async function requireUser() {
    const c = client();
    if (!c) return { error: "setup" };
    let session = null;
    try {
      const response = await c.auth.getSession();
      session = response && response.data ? response.data.session : null;
    } catch (error) {
      return { error: "network" };
    }
    if (!session || !session.user) {
      goToLogin();
      return { error: "signed-out" };
    }
    let profile = null;
    try {
      profile = await loadProfile(c, session.user.id);
    } catch (error) {
      return { error: "profile", message: error.message };
    }
    if (profile && profile.is_suspended) {
      await c.auth.signOut();
      window.location.replace("login.html?suspended=1");
      return { error: "suspended" };
    }
    return { client: c, session: session, profile: profile };
  }

  function signOut() {
    const c = client();
    if (!c) return Promise.resolve();
    return c.auth.signOut();
  }

  function onAuthChange(handler) {
    const c = client();
    if (!c) return function () {};
    const result = c.auth.onAuthStateChange(function (event, session) {
      handler(event, session);
    });
    return function () {
      if (result && result.data && result.data.subscription) {
        result.data.subscription.unsubscribe();
      }
    };
  }

  window.JAMIX_AUTH = {
    configured: configured,
    client: client,
    param: param,
    nextTarget: nextTarget,
    goToLogin: goToLogin,
    friendlyAuthError: friendlyAuthError,
    passwordProblem: passwordProblem,
    formatDate: formatDate,
    loadProfile: loadProfile,
    requireUser: requireUser,
    signOut: signOut,
    onAuthChange: onAuthChange
  };
})();

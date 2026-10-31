/* ============================================================
   JAMIX PRO UG — Personal account dashboard
   Reads only the signed-in user's row through RLS.
   ============================================================ */
(function () {
  "use strict";

  const auth = window.JAMIX_AUTH;
  if (!auth) return;

  const $ = (selector, root = document) => root.querySelector(selector);
  const loadingEl = $("[data-account-loading]");
  const errorEl = $("[data-account-error]");
  const errorText = $("[data-account-error-text]");
  const readyEl = $("[data-account-ready]");
  const greetingEl = $("[data-account-greeting]");
  const nameEls = document.querySelectorAll("[data-account-name]");
  const emailEl = $("[data-account-email]");
  const avatarEl = $("[data-account-avatar]");
  const verifiedEl = $("[data-account-verified]");
  const joinedEl = $("[data-account-joined]");
  const idEl = $("[data-account-id]");
  const pictureEl = $("[data-account-picture]");
  const signOutButton = $("[data-signout]");
  const fallbackAvatar = "assets/icons/logo-mark.svg";

  function show(el, visible) {
    if (el) el.hidden = !visible;
  }

  function showError(message) {
    show(loadingEl, false);
    show(readyEl, false);
    if (errorText) errorText.textContent = message;
    show(errorEl, true);
  }

  function setText(el, value) {
    if (el) el.textContent = value || "";
  }

  function paint(result) {
    const user = result.session.user;
    const profile = result.profile || {};
    const displayName = String(profile.display_name || "").trim();
    const email = profile.email || user.email || "";

    if (greetingEl) {
      greetingEl.textContent = displayName ? "Welcome back, " + displayName + "." : "Welcome back.";
    }
    nameEls.forEach(function (el) {
      el.textContent = displayName || "No full name yet";
    });
    setText(emailEl, email);
    if (avatarEl) {
      const url = profile.avatar_path || "";
      avatarEl.src = url || fallbackAvatar;
      avatarEl.alt = url
        ? (displayName ? displayName + " profile picture" : "Your profile picture")
        : "Default profile picture";
    }
    if (verifiedEl) {
      const verified = !!user.email_confirmed_at;
      verifiedEl.textContent = verified ? "Email confirmed" : "Email not confirmed";
      verifiedEl.className = "account-badge" + (verified ? " account-badge--verified" : "");
    }
    setText(joinedEl, auth.formatDate(profile.created_at || user.created_at));
    setText(idEl, user.id || "—");
    setText(pictureEl, profile.avatar_path ? "Picture added" : "Default picture");

    show(loadingEl, false);
    show(readyEl, true);
  }

  if (!auth.configured) {
    showError("Accounts are not connected yet. The site owner needs to finish the Supabase setup.");
    return;
  }

  auth.requireUser().then(function (result) {
    if (result.error === "setup") {
      showError("Accounts are not connected yet. The site owner needs to finish the Supabase setup.");
      return;
    }
    if (result.error === "network") {
      showError("Could not reach Supabase. Check your connection and reload the page.");
      return;
    }
    if (result.error === "profile") {
      showError("Your profile could not load. If this is new, the accounts migration may not have been applied yet.");
      return;
    }
    if (result.error === "signed-out" || result.error === "suspended") return;
    paint(result);

    auth.onAuthChange(function (event, session) {
      if (event === "SIGNED_OUT" || !session) {
        window.location.replace("login.html?signedout=1");
      }
    });
  }).catch(function () {
    showError("Something went wrong loading your account. Reload the page and try again.");
  });

  if (signOutButton) {
    signOutButton.addEventListener("click", async function () {
      signOutButton.disabled = true;
      await auth.signOut();
      window.location.replace("login.html?signedout=1");
    });
  }
})();

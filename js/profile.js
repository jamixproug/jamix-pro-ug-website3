/* ============================================================
   JAMIX PRO UG — Profile & security page
   Edits only the signed-in user's own profile row.
   ============================================================ */
(function () {
  "use strict";

  const auth = window.JAMIX_AUTH;
  if (!auth) return;

  const $ = (selector, root = document) => root.querySelector(selector);
  const loadingEl = $("[data-profile-loading]");
  const errorEl = $("[data-profile-error]");
  const errorText = $("[data-profile-error-text]");
  const readyEl = $("[data-profile-ready]");
  const avatarEl = $("[data-profile-avatar]");
  const nameEls = document.querySelectorAll("[data-profile-name]");
  const emailEl = $("[data-profile-email]");
  const verifiedEl = $("[data-profile-verified]");
  const joinedEl = $("[data-profile-joined]");
  const idEl = $("[data-profile-id]");
  const signOutButton = $("[data-signout]");

  const nameForm = $("[data-name-form]");
  const nameError = $("[data-name-error]");
  const nameSubmit = $("[data-name-submit]");
  const nameStatus = $("[data-name-status]");

  const avatarForm = $("[data-avatar-form]");
  const avatarError = $("[data-avatar-error]");
  const avatarSubmit = $("[data-avatar-submit]");
  const avatarStatus = $("[data-avatar-status]");
  const avatarRemove = $("[data-avatar-remove]");

  const passwordForm = $("[data-password-form]");
  const passwordError = $("[data-password-error]");
  const passwordSubmit = $("[data-password-submit]");
  const passwordStatus = $("[data-password-status]");

  const IMAGE_MAX = 5 * 1024 * 1024;
  const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
  const fallbackAvatar = "assets/icons/logo-mark.svg";
  const AVATAR_MARKER = "/storage/v1/object/public/avatars/";

  let client = null;
  let session = null;
  let profile = null;

  function show(el, visible) {
    if (el) el.hidden = !visible;
  }

  function setText(el, value) {
    if (el) el.textContent = value || "";
  }

  function setStatus(el, message, tone) {
    if (!el) return;
    el.textContent = message || "";
    el.classList.toggle("is-error", tone === "error");
  }

  function showError(message) {
    show(loadingEl, false);
    show(readyEl, false);
    if (errorText) errorText.textContent = message;
    show(errorEl, true);
  }

  function paint() {
    const user = session.user;
    const displayName = String((profile && profile.display_name) || "").trim();
    const email = (profile && profile.email) || user.email || "";

    nameEls.forEach(function (el) {
      el.textContent = displayName || "No full name yet";
    });
    setText(emailEl, email);
    if (avatarEl) {
      const url = (profile && profile.avatar_path) || "";
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
    setText(joinedEl, auth.formatDate((profile && profile.created_at) || user.created_at));
    setText(idEl, user.id || "—");

    if (nameForm) nameForm.elements.display_name.value = displayName;
    if (avatarRemove) show(avatarRemove, !!(profile && profile.avatar_path));
  }

  function imageExtension(file) {
    if (file.type === "image/png") return "png";
    if (file.type === "image/webp") return "webp";
    if (/\.png$/i.test(file.name)) return "png";
    if (/\.webp$/i.test(file.name)) return "webp";
    return "jpg";
  }

  function objectPath(url) {
    const value = String(url || "");
    const index = value.indexOf(AVATAR_MARKER);
    if (index < 0) return "";
    return decodeURIComponent(value.slice(index + AVATAR_MARKER.length));
  }

  async function refreshProfile() {
    const row = await auth.loadProfile(client, session.user.id);
    if (row) profile = row;
    paint();
  }

  if (!auth.configured) {
    showError("Accounts are not connected yet. The site owner needs to finish the Supabase setup.");
    return;
  }

  auth.requireUser().then(async function (result) {
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

    client = result.client;
    session = result.session;
    profile = result.profile || null;
    paint();
    show(loadingEl, false);
    show(readyEl, true);

    auth.onAuthChange(function (event, nextSession) {
      if (event === "SIGNED_OUT" || !nextSession) {
        window.location.replace("login.html?signedout=1");
      }
    });
  }).catch(function () {
    showError("Something went wrong loading your profile. Reload the page and try again.");
  });

  /* ---------- Full name ---------- */
  if (nameForm) {
    nameForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      if (!client) return;
      const value = String(nameForm.elements.display_name.value || "").trim();

      if (value.length > 60) {
        nameError.textContent = "Keep the full name to 60 characters or fewer.";
        return;
      }
      nameError.textContent = "";
      nameSubmit.disabled = true;
      nameSubmit.textContent = "Saving…";
      setStatus(nameStatus, "");

      try {
        const response = await client
          .from("profiles")
          .update({ display_name: value || null })
          .eq("id", session.user.id)
          .select("display_name");
        if (response.error) throw new Error(response.error.message);
        await refreshProfile();
        setStatus(nameStatus, value ? "Full name saved." : "Full name cleared.");
      } catch (error) {
        nameError.textContent = error.message || "Could not save the full name.";
      } finally {
        nameSubmit.disabled = false;
        nameSubmit.textContent = "Save full name";
      }
    });
  }

  /* ---------- Avatar ---------- */
  if (avatarForm) {
    avatarForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      if (!client) return;
      const input = avatarForm.elements.avatar;
      const file = input && input.files ? input.files[0] : null;

      if (!file) {
        avatarError.textContent = "Choose an image first.";
        return;
      }
      if (IMAGE_TYPES.indexOf(file.type) === -1) {
        avatarError.textContent = "Use a JPG, PNG or WebP image.";
        return;
      }
      if (file.size > IMAGE_MAX) {
        avatarError.textContent = "That image is larger than 5 MB. Use a smaller one.";
        return;
      }

      avatarError.textContent = "";
      setStatus(avatarStatus, "");
      avatarSubmit.disabled = true;
      avatarSubmit.textContent = "Uploading…";

      const path = session.user.id + "/" + Date.now() + "." + imageExtension(file);
      const previous = profile && profile.avatar_path ? profile.avatar_path : "";
      let uploaded = false;

      try {
        const upload = await client.storage.from("avatars").upload(path, file, {
          contentType: file.type,
          upsert: false
        });
        if (upload.error) throw new Error(upload.error.message);
        uploaded = true;

        const publicUrl = client.storage.from("avatars").getPublicUrl(path);
        const url = publicUrl && publicUrl.data ? publicUrl.data.publicUrl : "";
        if (!url) throw new Error("Could not read the uploaded image URL.");

        const update = await client
          .from("profiles")
          .update({ avatar_path: url })
          .eq("id", session.user.id)
          .select("avatar_path");
        if (update.error) throw new Error(update.error.message);

        const oldPath = objectPath(previous);
        if (oldPath && previous !== url) {
          await client.storage.from("avatars").remove([oldPath]);
        }

        avatarForm.reset();
        await refreshProfile();
        setStatus(avatarStatus, "Profile picture updated.");
      } catch (error) {
        if (uploaded) await client.storage.from("avatars").remove([path]);
        avatarError.textContent = error.message || "The picture could not be uploaded.";
      } finally {
        avatarSubmit.disabled = false;
        avatarSubmit.textContent = "Upload picture";
      }
    });
  }

  if (avatarRemove) {
    avatarRemove.addEventListener("click", async function () {
      if (!client) return;
      if (!window.confirm("Remove your profile picture and use the default one?")) return;
      avatarRemove.disabled = true;
      setStatus(avatarStatus, "");
      try {
        const oldPath = objectPath(profile && profile.avatar_path);
        const update = await client
          .from("profiles")
          .update({ avatar_path: null })
          .eq("id", session.user.id)
          .select("avatar_path");
        if (update.error) throw new Error(update.error.message);
        if (oldPath) await client.storage.from("avatars").remove([oldPath]);
        await refreshProfile();
        setStatus(avatarStatus, "Profile picture removed.");
      } catch (error) {
        avatarError.textContent = error.message || "Could not remove the picture.";
      } finally {
        avatarRemove.disabled = false;
      }
    });
  }

  /* ---------- Password ---------- */
  if (passwordForm) {
    passwordForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      if (!client) return;
      const current = passwordForm.elements.current.value;
      const next = passwordForm.elements.password.value;
      const confirm = passwordForm.elements.confirm.value;

      if (!current) {
        passwordError.textContent = "Enter your current password.";
        return;
      }
      const problem = auth.passwordProblem(next, session.user.email);
      if (problem) {
        passwordError.textContent = problem;
        return;
      }
      if (next !== confirm) {
        passwordError.textContent = "The two new passwords do not match.";
        return;
      }
      if (next === current) {
        passwordError.textContent = "Choose a password different from your current one.";
        return;
      }

      passwordError.textContent = "";
      setStatus(passwordStatus, "");
      passwordSubmit.disabled = true;
      passwordSubmit.textContent = "Saving…";

      try {
        const check = await client.auth.signInWithPassword({
          email: session.user.email,
          password: current
        });
        if (check.error) {
          passwordError.textContent = "That current password is not correct.";
          return;
        }
        const update = await client.auth.updateUser({ password: next });
        if (update.error) {
          passwordError.textContent = auth.friendlyAuthError(update.error.message);
          return;
        }
        passwordForm.reset();
        setStatus(passwordStatus, "Password changed. Use it the next time you sign in.");
      } catch (error) {
        passwordError.textContent = auth.friendlyAuthError(error.message);
      } finally {
        passwordSubmit.disabled = false;
        passwordSubmit.textContent = "Change password";
      }
    });
  }

  /* ---------- Sign out ---------- */
  if (signOutButton) {
    signOutButton.addEventListener("click", async function () {
      signOutButton.disabled = true;
      await auth.signOut();
      window.location.replace("login.html?signedout=1");
    });
  }
})();

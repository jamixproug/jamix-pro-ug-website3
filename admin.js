/* ============================================================
   JAMIX PRO UG — Drops admin
   Auth + CRUD against Supabase. All writes depend on the
   row-level security rules in supabase/schema.sql.
   ============================================================ */
(function () {
  "use strict";

  const config = window.JAMIX_SUPABASE || {};
  const publicKey = String(config.key || config.anonKey || "");
  const configured =
    /^https?:\/\//.test(String(config.url || "")) && publicKey.length > 20;

  const $ = (selector, root = document) => root.querySelector(selector);

  const setupEl = $("[data-setup]");
  const authEl = $("[data-auth]");
  const dashboardEl = $("[data-dashboard]");
  const accountEl = $("[data-account]");
  const accountEmailEl = $("[data-account-email]");
  const signOutButton = $("[data-signout]");
  const loginForm = $("[data-login]");
  const loginSubmit = $("[data-login-submit]");
  const loginError = $("[data-login-error]");
  const addForm = $("[data-add]");
  const addSubmit = $("[data-add-submit]");
  const listEl = $("[data-list]");
  const emptyEl = $("[data-empty]");
  const refreshButton = $("[data-refresh]");
  const countPublishedEl = $("[data-count-published]");
  const countTotalEl = $("[data-count-total]");
  const statusEl = $("[data-status]");

  let client = null;
  let clips = [];
  let busy = false;
  let entering = false;
  let statusTimer = 0;

  /* ---------- Feedback ---------- */
  function setStatus(message, tone) {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.classList.toggle("is-error", tone === "error");
    statusEl.classList.add("is-visible");
    window.clearTimeout(statusTimer);
    statusTimer = window.setTimeout(function () {
      statusEl.classList.remove("is-visible");
    }, tone === "error" ? 7000 : 4000);
  }

  function setLoginError(message) {
    if (!loginError) return;
    loginError.textContent = message || "";
  }

  function friendlyAuthError(message) {
    const text = String(message || "");
    if (/invalid login credentials/i.test(text)) return "That email and password do not match.";
    if (/email not confirmed/i.test(text)) return "Confirm your email address first, then sign in.";
    if (/rate limit|too many/i.test(text)) return "Too many attempts. Wait a minute and try again.";
    return text || "Sign-in failed. Please try again.";
  }

  /* ---------- Views ---------- */
  function showOnly(section) {
    [setupEl, authEl, dashboardEl].forEach(function (el) {
      if (el) el.hidden = el !== section;
    });
  }

  function showSetup() {
    showOnly(setupEl);
    if (accountEl) accountEl.hidden = true;
  }

  function showAuth() {
    showOnly(authEl);
    if (accountEl) accountEl.hidden = true;
  }

  function showDashboard(session) {
    showOnly(dashboardEl);
    if (accountEl) accountEl.hidden = false;
    if (accountEmailEl) {
      accountEmailEl.textContent = (session && session.user && session.user.email) || "";
    }
  }

  /* ---------- Helpers ---------- */
  function slugify(value) {
    return String(value)
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "clip";
  }

  function shortPath(filePath) {
    const value = String(filePath || "");
    const marker = "/storage/v1/object/public/drops/";
    const index = value.indexOf(marker);
    if (index >= 0) return decodeURIComponent(value.slice(index + marker.length));
    return value.replace(/^assets\/audio\//, "");
  }

  function storagePath(filePath) {
    const value = String(filePath || "");
    const marker = "/storage/v1/object/public/drops/";
    const index = value.indexOf(marker);
    if (index < 0) return "";
    return decodeURIComponent(value.slice(index + marker.length));
  }

  function icon(pathData) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", pathData);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "currentColor");
    path.setAttribute("stroke-width", "1.9");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    svg.appendChild(path);
    return svg;
  }

  function actionButton(label, pathData, extraClass) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "admin-icon-btn" + (extraClass ? " " + extraClass : "");
    button.setAttribute("aria-label", label);
    button.title = label;
    if (pathData) button.appendChild(icon(pathData));
    else button.textContent = label;
    return button;
  }

  /* ---------- Rendering ---------- */
  function renderClips() {
    if (!listEl) return;
    listEl.textContent = "";
    if (emptyEl) emptyEl.hidden = clips.length > 0;
    if (countTotalEl) countTotalEl.textContent = String(clips.length);
    if (countPublishedEl) {
      countPublishedEl.textContent = String(clips.filter(function (clip) {
        return clip.is_published;
      }).length);
    }

    clips.forEach(function (clip, index) {
      const row = document.createElement("li");
      row.className = "admin-row" + (clip.is_published ? "" : " is-hidden");
      row.dataset.id = clip.id;

      const number = document.createElement("span");
      number.className = "admin-row__index";
      number.setAttribute("aria-hidden", "true");
      number.textContent = String(index + 1).padStart(2, "0");

      const body = document.createElement("div");
      body.className = "admin-row__body";

      const title = document.createElement("p");
      title.className = "admin-row__title";
      title.textContent = clip.title;

      const meta = document.createElement("p");
      meta.className = "admin-row__meta";

      const tag = document.createElement("span");
      tag.className = "admin-tag " + (clip.is_published ? "admin-tag--live" : "admin-tag--hidden");
      tag.textContent = clip.is_published ? "Live" : "Hidden";

      const file = document.createElement("span");
      file.textContent = shortPath(clip.file_path);

      meta.appendChild(tag);
      meta.appendChild(file);
      body.appendChild(title);
      body.appendChild(meta);

      const actions = document.createElement("div");
      actions.className = "admin-row__actions";

      const up = actionButton("Move " + clip.title + " up", "M12 19V5M6 11l6-6 6 6");
      up.dataset.action = "up";
      up.disabled = index === 0;

      const down = actionButton("Move " + clip.title + " down", "M12 5v14M6 13l6 6 6-6");
      down.dataset.action = "down";
      down.disabled = index === clips.length - 1;

      const toggle = actionButton(
        (clip.is_published ? "Hide " : "Publish ") + clip.title,
        clip.is_published ? "M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" : "M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.1A9.8 9.8 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-2.2 3.1M6.2 6.2A16.6 16.6 0 0 0 2 12s3.6 7 10 7a9.7 9.7 0 0 0 4-.8"
      );
      toggle.dataset.action = "toggle";

      const rename = actionButton("Rename " + clip.title, "M4 20h4L19 9l-4-4L4 16v4ZM14 6l4 4");
      rename.dataset.action = "rename";

      const remove = actionButton("Delete " + clip.title, "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6", "admin-icon-btn--danger");
      remove.dataset.action = "delete";

      actions.appendChild(up);
      actions.appendChild(down);
      actions.appendChild(toggle);
      actions.appendChild(rename);
      actions.appendChild(remove);

      row.appendChild(number);
      row.appendChild(body);
      row.appendChild(actions);
      listEl.appendChild(row);
    });
  }

  /* ---------- Data ---------- */
  async function loadClips() {
    const response = await client
      .from("drops")
      .select("id,title,file_path,sort_order,is_published,created_at")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (response.error) {
      setStatus("Could not load clips: " + response.error.message, "error");
      return false;
    }

    clips = response.data || [];
    renderClips();
    return true;
  }

  async function updateClip(id, values) {
    const response = await client.from("drops").update(values).eq("id", id);
    if (response.error) throw new Error(response.error.message);
  }

  async function moveClip(clip, direction) {
    const index = clips.indexOf(clip);
    const target = index + direction;
    if (target < 0 || target >= clips.length) return;
    const other = clips[target];

    await updateClip(clip.id, { sort_order: other.sort_order });
    await updateClip(other.id, { sort_order: clip.sort_order });
    await loadClips();
    setStatus("Reordered the playlist.");
  }

  async function toggleClip(clip) {
    await updateClip(clip.id, { is_published: !clip.is_published });
    await loadClips();
    setStatus(clip.is_published ? "Clip hidden from the site." : "Clip published.");
  }

  async function renameClip(clip, title) {
    await updateClip(clip.id, { title: title });
    await loadClips();
    setStatus("Renamed to “" + title + "”.");
  }

  async function deleteClip(clip) {
    const ok = window.confirm(
      'Delete "' + clip.title + '"? The clip is removed from the playlist and the player. This cannot be undone.'
    );
    if (!ok) return;

    const response = await client.from("drops").delete().eq("id", clip.id);
    if (response.error) throw new Error(response.error.message);

    const path = storagePath(clip.file_path);
    if (path) {
      const removal = await client.storage.from("drops").remove([path]);
      if (removal.error) {
        setStatus("Clip deleted, but the audio file could not be removed.", "error");
      }
    }

    await loadClips();
    setStatus("Deleted “" + clip.title + "”.");
  }

  function startRename(clip, row) {
    const body = row.querySelector(".admin-row__body");
    if (!body || body.querySelector(".admin-rename")) return;
    body.textContent = "";

    const form = document.createElement("form");
    form.className = "admin-rename";

    const input = document.createElement("input");
    input.type = "text";
    input.value = clip.title;
    input.maxLength = 80;
    input.setAttribute("aria-label", "New title for " + clip.title);

    const save = document.createElement("button");
    save.type = "submit";
    save.className = "btn btn-gold btn-sm";
    save.textContent = "Save";

    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "btn btn-ghost btn-sm admin-btn-light";
    cancel.textContent = "Cancel";
    cancel.addEventListener("click", renderClips);

    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      const value = input.value.trim();
      if (!value) {
        input.focus();
        return;
      }
      if (busy) return;
      busy = true;
      save.disabled = true;
      save.textContent = "Saving…";
      try {
        await renameClip(clip, value);
      } catch (error) {
        setStatus(error.message || "Could not rename the clip.", "error");
        save.disabled = false;
        save.textContent = "Save";
      } finally {
        busy = false;
      }
    });

    form.appendChild(input);
    form.appendChild(save);
    form.appendChild(cancel);
    body.appendChild(form);
    input.focus();
    input.select();
  }

  /* ---------- Actions ---------- */
  if (listEl) {
    listEl.addEventListener("click", function (event) {
      const button = event.target.closest("button[data-action]");
      if (!button) return;
      const row = button.closest("[data-id]");
      if (!row) return;
      const clip = clips.find(function (item) { return item.id === row.dataset.id; });
      if (!clip || busy) return;

      const action = button.dataset.action;
      busy = true;
      const work = action === "rename"
        ? Promise.resolve(startRename(clip, row))
        : action === "up"
          ? moveClip(clip, -1)
          : action === "down"
            ? moveClip(clip, 1)
            : action === "toggle"
              ? toggleClip(clip)
              : deleteClip(clip);

      Promise.resolve(work)
        .catch(function (error) {
          setStatus(error.message || "That change did not save. Please try again.", "error");
        })
        .finally(function () {
          busy = false;
        });
    });
  }

  if (refreshButton) {
    refreshButton.addEventListener("click", async function () {
      if (busy) return;
      busy = true;
      refreshButton.disabled = true;
      try {
        if (await loadClips()) setStatus("Playlist refreshed.");
      } finally {
        busy = false;
        refreshButton.disabled = false;
      }
    });
  }

  /* ---------- Add clip ---------- */
  if (addForm) {
    addForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      if (busy) return;

      const titleInput = addForm.querySelector('input[name="title"]');
      const fileInput = addForm.querySelector('input[name="file"]');
      const title = titleInput ? titleInput.value.trim() : "";
      const file = fileInput && fileInput.files ? fileInput.files[0] : null;

      if (!title) {
        setStatus("Give the clip a title first.", "error");
        if (titleInput) titleInput.focus();
        return;
      }
      if (!file) {
        setStatus("Choose an MP3 file to upload.", "error");
        return;
      }
      if (!/\.mp3$/i.test(file.name) || (file.type && file.type !== "audio/mpeg")) {
        setStatus("That is not an MP3 file. Export the clip as MP3 and try again.", "error");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setStatus("That file is larger than 10 MB. Shorten the clip and try again.", "error");
        return;
      }

      busy = true;
      addSubmit.disabled = true;
      addSubmit.textContent = "Uploading…";
      addForm.setAttribute("aria-busy", "true");

      const path = Date.now() + "-" + slugify(title) + ".mp3";
      let uploaded = false;

      try {
        const upload = await client.storage.from("drops").upload(path, file, {
          contentType: "audio/mpeg",
          cacheControl: "604800",
          upsert: false
        });
        if (upload.error) throw new Error(upload.error.message);
        uploaded = true;

        const publicUrl = client.storage.from("drops").getPublicUrl(path);
        const url = publicUrl && publicUrl.data ? publicUrl.data.publicUrl : "";
        if (!url) throw new Error("Could not read the uploaded file URL.");

        const nextOrder = clips.reduce(function (max, clip) {
          return Math.max(max, Number(clip.sort_order) || 0);
        }, 0) + 1;

        const insert = await client.from("drops").insert({
          title: title,
          file_path: url,
          sort_order: nextOrder,
          is_published: true
        });
        if (insert.error) throw new Error(insert.error.message);

        addForm.reset();
        await loadClips();
        setStatus("Added “" + title + "”. It is live on the site now.");
      } catch (error) {
        if (uploaded) await client.storage.from("drops").remove([path]);
        setStatus(error.message || "Upload failed. Please try again.", "error");
      } finally {
        busy = false;
        addSubmit.disabled = false;
        addSubmit.textContent = "Upload and add";
        addForm.removeAttribute("aria-busy");
      }
    });
  }

  /* ---------- Auth ---------- */
  async function enter(session) {
    if (entering || !session) return;
    entering = true;
    try {
      const check = await client.rpc("is_admin");
      if (check.error) {
        showAuth();
        setLoginError("Could not verify your access right now. Check your connection and reload.");
        return;
      }
      if (check.data !== true) {
        await client.auth.signOut();
        showAuth();
        setLoginError("This account is not on the admin list. Add it in Supabase and try again.");
        return;
      }
      showDashboard(session);
      await loadClips();
    } finally {
      entering = false;
    }
  }

  if (loginForm) {
    loginForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      if (busy) return;
      setLoginError("");

      const email = loginForm.elements.email.value.trim();
      const password = loginForm.elements.password.value;
      if (!email || !password) {
        setLoginError("Enter both your email and password.");
        return;
      }

      busy = true;
      loginSubmit.disabled = true;
      loginSubmit.textContent = "Signing in…";
      loginForm.setAttribute("aria-busy", "true");

      try {
        const response = await client.auth.signInWithPassword({ email: email, password: password });
        if (response.error) {
          setLoginError(friendlyAuthError(response.error.message));
          return;
        }
        loginForm.reset();
        await enter(response.data.session);
      } catch (error) {
        setLoginError(error.message || "Sign-in failed. Please try again.");
      } finally {
        busy = false;
        loginSubmit.disabled = false;
        loginSubmit.textContent = "Sign in";
        loginForm.removeAttribute("aria-busy");
      }
    });
  }

  if (signOutButton) {
    signOutButton.addEventListener("click", async function () {
      await client.auth.signOut();
      showAuth();
      setStatus("Signed out.");
    });
  }

  /* ---------- Boot ---------- */
  function boot() {
    if (!configured) {
      showSetup();
      return;
    }
    if (!window.supabase || typeof window.supabase.createClient !== "function") {
      showSetup();
      setStatus("The Supabase library could not load. Check your connection and reload.", "error");
      return;
    }

    client = window.supabase.createClient(
      String(config.url).replace(/\/+$/, ""),
      publicKey
    );

    client.auth.getSession().then(function (response) {
      const session = response && response.data ? response.data.session : null;
      if (session) enter(session);
      else showAuth();
    }).catch(function () {
      showAuth();
      setStatus("Could not reach Supabase. Check your connection and reload.", "error");
    });

    client.auth.onAuthStateChange(function (event, session) {
      if (event === "SIGNED_OUT" || (event === "USER_UPDATED" && !session)) {
        showAuth();
      } else if (event === "SIGNED_IN" && session) {
        enter(session);
      }
    });
  }

  boot();
})();

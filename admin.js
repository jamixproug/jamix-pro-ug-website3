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
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

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
  const tabButtons = $$("[data-tab]");
  const panels = $$("[data-panel]");
  const songForm = $("[data-song-add]");
  const songListEl = $("[data-song-list]");
  const songEmptyEl = $("[data-song-empty]");
  const songSubmit = $("[data-song-submit]");
  const songProgress = $("[data-song-progress]");
  const songRefresh = $("[data-song-refresh]");
  const photoForm = $("[data-photo-add]");
  const photoListEl = $("[data-photo-list]");
  const photoEmptyEl = $("[data-photo-empty]");
  const photoSubmit = $("[data-photo-submit]");
  const photoProgress = $("[data-photo-progress]");
  const photoRefresh = $("[data-photo-refresh]");
  const videoForm = $("[data-video-add]");
  const videoListEl = $("[data-video-list]");
  const videoEmptyEl = $("[data-video-empty]");
  const videoSubmit = $("[data-video-submit]");
  const videoProgress = $("[data-video-progress]");
  const videoRefresh = $("[data-video-refresh]");

  const AUDIO_MAX = 25 * 1024 * 1024;
  const IMAGE_MAX = 8 * 1024 * 1024;
  const VIDEO_MAX = 50 * 1024 * 1024;
  const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
  const VIDEO_TYPES = ["video/mp4", "video/webm"];

  let client = null;
  let clips = [];
  let songs = [];
  let photos = [];
  let videos = [];
  let songsLoaded = false;
  let photosLoaded = false;
  let videosLoaded = false;
  let activePanel = "drops";
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
  function paintCounts() {
    const list =
      activePanel === "songs" ? songs
        : activePanel === "photos" ? photos
          : activePanel === "videos" ? videos
            : clips;
    if (countTotalEl) countTotalEl.textContent = String(list.length);
    if (countPublishedEl) {
      countPublishedEl.textContent = String(list.filter(function (item) {
        return item.is_published;
      }).length);
    }
  }

  function renderClips() {
    if (!listEl) return;
    listEl.textContent = "";
    if (emptyEl) emptyEl.hidden = clips.length > 0;
    paintCounts();

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

  /* ---------- Songs and photos ---------- */
  function isImageFile(file) {
    if (!file) return false;
    const nameOk = /\.(jpe?g|png|webp)$/i.test(String(file.name || ""));
    const typeOk = !file.type || IMAGE_TYPES.indexOf(file.type) !== -1;
    return nameOk && typeOk;
  }

  function imageExtension(file) {
    const name = String((file && file.name) || "").toLowerCase();
    if (name.endsWith(".png") || (file && file.type === "image/png")) return "png";
    if (name.endsWith(".webp") || (file && file.type === "image/webp")) return "webp";
    return "jpg";
  }

  function imageContentType(file) {
    const extension = imageExtension(file);
    return extension === "png" ? "image/png" : extension === "webp" ? "image/webp" : "image/jpeg";
  }

  function isVideoFile(file) {
    if (!file) return false;
    const nameOk = /\.(mp4|webm)$/i.test(String(file.name || ""));
    const typeOk = !file.type || VIDEO_TYPES.indexOf(file.type) !== -1;
    return nameOk && typeOk;
  }

  function videoExtension(file) {
    const name = String((file && file.name) || "").toLowerCase();
    if (name.endsWith(".webm") || (file && file.type === "video/webm")) return "webm";
    return "mp4";
  }

  function videoContentType(file) {
    return videoExtension(file) === "webm" ? "video/webm" : "video/mp4";
  }

  function objectPath(filePath, bucket) {
    const marker = "/storage/v1/object/public/" + bucket + "/";
    const value = String(filePath || "");
    const index = value.indexOf(marker);
    if (index < 0) return "";
    return decodeURIComponent(value.slice(index + marker.length));
  }

  function storagePublicUrl(bucket, path) {
    const result = client.storage.from(bucket).getPublicUrl(path);
    return result && result.data ? result.data.publicUrl : "";
  }

  function uploadObject(bucket, path, file, contentType, onProgress) {
    return client.auth.getSession().then(function (result) {
      return new Promise(function (resolve, reject) {
        const session = result && result.data ? result.data.session : null;
        if (!session || !session.access_token) {
          reject(new Error("Your session expired. Sign in again."));
          return;
        }
        const base = String(config.url).replace(/\/+$/, "");
        const encoded = path.split("/").map(encodeURIComponent).join("/");
        const xhr = new XMLHttpRequest();
        xhr.open("POST", base + "/storage/v1/object/" + bucket + "/" + encoded);
        xhr.setRequestHeader("apikey", publicKey);
        xhr.setRequestHeader("Authorization", "Bearer " + session.access_token);
        xhr.setRequestHeader("x-upsert", "false");
        xhr.setRequestHeader("cache-control", "max-age=604800");
        xhr.setRequestHeader("Content-Type", contentType || file.type || "application/octet-stream");
        xhr.upload.addEventListener("progress", function (event) {
          if (event.lengthComputable && typeof onProgress === "function") {
            onProgress(event.loaded / event.total);
          }
        });
        xhr.addEventListener("load", function () {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
            return;
          }
          let message = "Upload failed (" + xhr.status + ").";
          try {
            const body = JSON.parse(xhr.responseText);
            if (body && body.message) message = body.message;
          } catch (error) {
            /* keep the status message */
          }
          reject(new Error(message));
        });
        xhr.addEventListener("error", function () {
          reject(new Error("Upload failed. Check your connection and try again."));
        });
        xhr.addEventListener("abort", function () {
          reject(new Error("Upload cancelled."));
        });
        xhr.send(file);
      });
    });
  }

  function paintUploadProgress(element, value) {
    if (!element) return;
    element.hidden = false;
    element.value = Math.max(0, Math.min(100, Math.round(value)));
  }

  function nextOrder(list) {
    return list.reduce(function (max, item) {
      return Math.max(max, Number(item.sort_order) || 0);
    }, 0) + 1;
  }

  function displayName(filePath) {
    const clean = String(filePath || "").split("?")[0];
    const parts = clean.split("/");
    const name = parts[parts.length - 1] || clean;
    try {
      return decodeURIComponent(name);
    } catch (error) {
      return name;
    }
  }

  function makeRow(index, titleText, metaParts, actionButtons) {
    const row = document.createElement("li");
    row.className = "admin-row";

    const number = document.createElement("span");
    number.className = "admin-row__index";
    number.setAttribute("aria-hidden", "true");
    number.textContent = String(index + 1).padStart(2, "0");

    const body = document.createElement("div");
    body.className = "admin-row__body";

    const title = document.createElement("p");
    title.className = "admin-row__title";
    title.textContent = titleText;

    const meta = document.createElement("p");
    meta.className = "admin-row__meta";
    metaParts.forEach(function (part) {
      if (part) meta.appendChild(part);
    });

    body.appendChild(title);
    body.appendChild(meta);

    const actions = document.createElement("div");
    actions.className = "admin-row__actions";
    actionButtons.forEach(function (button) {
      actions.appendChild(button);
    });

    row.appendChild(number);
    row.appendChild(body);
    row.appendChild(actions);
    return { row: row, body: body };
  }

  async function updateRow(table, id, values) {
    const response = await client.from(table).update(values).eq("id", id);
    if (response.error) throw new Error(response.error.message);
  }

  async function removeStored(bucket, filePath) {
    const path = objectPath(filePath, bucket);
    if (!path) return true;
    const removal = await client.storage.from(bucket).remove([path]);
    return !removal.error;
  }

  function renderSongs() {
    if (!songListEl) return;
    songListEl.textContent = "";
    if (songEmptyEl) songEmptyEl.hidden = songs.length > 0;
    paintCounts();

    songs.forEach(function (song, index) {
      const artist = document.createElement("span");
      artist.textContent = song.artist || "JAMIX PRO UG";
      const file = document.createElement("span");
      file.textContent = displayName(song.audio_path);

      const edit = actionButton("Edit " + song.title, "M4 20h4L19 9l-4-4L4 16v4ZM14 6l4 4");
      edit.dataset.action = "edit";
      const remove = actionButton("Delete " + song.title, "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6", "admin-icon-btn--danger");
      remove.dataset.action = "delete";

      const built = makeRow(index, song.title, [artist, file], [edit, remove]);
      built.row.dataset.id = song.id;
      songListEl.appendChild(built.row);
    });
  }

  function renderPhotos() {
    if (!photoListEl) return;
    photoListEl.textContent = "";
    if (photoEmptyEl) photoEmptyEl.hidden = photos.length > 0;
    paintCounts();

    photos.forEach(function (photo, index) {
      const caption = document.createElement("span");
      caption.textContent = photo.caption || "No caption";
      const file = document.createElement("span");
      file.textContent = displayName(photo.file_path);

      const edit = actionButton("Edit " + photo.title, "M4 20h4L19 9l-4-4L4 16v4ZM14 6l4 4");
      edit.dataset.action = "edit";
      const remove = actionButton("Delete " + photo.title, "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6", "admin-icon-btn--danger");
      remove.dataset.action = "delete";

      const built = makeRow(index, photo.title, [caption, file], [edit, remove]);
      built.row.dataset.id = photo.id;
      photoListEl.appendChild(built.row);
    });
  }

  function renderVideos() {
    if (!videoListEl) return;
    videoListEl.textContent = "";
    if (videoEmptyEl) videoEmptyEl.hidden = videos.length > 0;
    paintCounts();

    videos.forEach(function (video, index) {
      const tag = document.createElement("span");
      tag.className = "admin-tag " + (video.is_published ? "admin-tag--live" : "admin-tag--hidden");
      tag.textContent = video.is_published ? "Live" : "Hidden";

      const note = document.createElement("span");
      note.textContent = video.description || displayName(video.video_path);

      const edit = actionButton("Edit " + video.title, "M4 20h4L19 9l-4-4L4 16v4ZM14 6l4 4");
      edit.dataset.action = "edit";

      const toggle = actionButton(
        (video.is_published ? "Unpublish " : "Publish ") + video.title,
        video.is_published
          ? "M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
          : "M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.1A9.8 9.8 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-2.2 3.1M6.2 6.2A16.6 16.6 0 0 0 2 12s3.6 7 10 7a9.7 9.7 0 0 0 4-.8"
      );
      toggle.dataset.action = "toggle";

      const remove = actionButton("Delete " + video.title, "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6", "admin-icon-btn--danger");
      remove.dataset.action = "delete";

      const built = makeRow(index, video.title, [tag, note], [edit, toggle, remove]);
      built.row.dataset.id = video.id;
      if (!video.is_published) built.row.classList.add("is-hidden");
      videoListEl.appendChild(built.row);
    });
  }

  async function loadSongs() {
    const response = await client
      .from("songs")
      .select("id,title,artist,audio_path,cover_path,sort_order,is_published,created_at")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (response.error) {
      songsLoaded = false;
      songs = [];
      renderSongs();
      setStatus("Could not load songs: " + response.error.message, "error");
      return false;
    }

    songs = response.data || [];
    songsLoaded = true;
    renderSongs();
    return true;
  }

  async function loadPhotos() {
    const response = await client
      .from("photos")
      .select("id,title,caption,file_path,sort_order,is_published,created_at")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (response.error) {
      photosLoaded = false;
      photos = [];
      renderPhotos();
      setStatus("Could not load photos: " + response.error.message, "error");
      return false;
    }

    photos = response.data || [];
    photosLoaded = true;
    renderPhotos();
    return true;
  }

  async function loadVideos() {
    const response = await client
      .from("videos")
      .select("id,title,description,video_path,thumbnail_path,sort_order,is_published,created_at")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (response.error) {
      videosLoaded = false;
      videos = [];
      renderVideos();
      setStatus("Could not load videos: " + response.error.message, "error");
      return false;
    }

    videos = response.data || [];
    videosLoaded = true;
    renderVideos();
    return true;
  }

  function startSongEdit(song, row) {
    const body = row.querySelector(".admin-row__body");
    if (!body || body.querySelector(".admin-rename")) return;
    body.textContent = "";

    const form = document.createElement("form");
    form.className = "admin-rename admin-rename--fields";

    const titleInput = document.createElement("input");
    titleInput.type = "text";
    titleInput.value = song.title;
    titleInput.maxLength = 120;
    titleInput.setAttribute("aria-label", "Song title for " + song.title);

    const artistInput = document.createElement("input");
    artistInput.type = "text";
    artistInput.value = song.artist || "";
    artistInput.maxLength = 120;
    artistInput.setAttribute("aria-label", "Artist for " + song.title);

    const save = document.createElement("button");
    save.type = "submit";
    save.className = "btn btn-gold btn-sm";
    save.textContent = "Save";

    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "btn btn-ghost btn-sm admin-btn-light";
    cancel.textContent = "Cancel";
    cancel.addEventListener("click", renderSongs);

    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      const nextTitle = titleInput.value.trim();
      const nextArtist = artistInput.value.trim();
      if (!nextTitle || !nextArtist) {
        (nextTitle ? artistInput : titleInput).focus();
        return;
      }
      if (busy) return;
      busy = true;
      save.disabled = true;
      save.textContent = "Saving…";
      try {
        await updateRow("songs", song.id, { title: nextTitle, artist: nextArtist });
        await loadSongs();
        setStatus("Saved “" + nextTitle + "”.");
      } catch (error) {
        setStatus(error.message || "Could not save the song.", "error");
        save.disabled = false;
        save.textContent = "Save";
      } finally {
        busy = false;
      }
    });

    form.appendChild(titleInput);
    form.appendChild(artistInput);
    form.appendChild(save);
    form.appendChild(cancel);
    body.appendChild(form);
    titleInput.focus();
    titleInput.select();
  }

  function startPhotoEdit(photo, row) {
    const body = row.querySelector(".admin-row__body");
    if (!body || body.querySelector(".admin-rename")) return;
    body.textContent = "";

    const form = document.createElement("form");
    form.className = "admin-rename admin-rename--fields";

    const titleInput = document.createElement("input");
    titleInput.type = "text";
    titleInput.value = photo.title;
    titleInput.maxLength = 120;
    titleInput.setAttribute("aria-label", "Photo title for " + photo.title);

    const captionInput = document.createElement("input");
    captionInput.type = "text";
    captionInput.value = photo.caption || "";
    captionInput.maxLength = 240;
    captionInput.setAttribute("aria-label", "Caption for " + photo.title);

    const save = document.createElement("button");
    save.type = "submit";
    save.className = "btn btn-gold btn-sm";
    save.textContent = "Save";

    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "btn btn-ghost btn-sm admin-btn-light";
    cancel.textContent = "Cancel";
    cancel.addEventListener("click", renderPhotos);

    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      const nextTitle = titleInput.value.trim();
      if (!nextTitle) {
        titleInput.focus();
        return;
      }
      if (busy) return;
      busy = true;
      save.disabled = true;
      save.textContent = "Saving…";
      try {
        await updateRow("photos", photo.id, {
          title: nextTitle,
          caption: captionInput.value.trim() || null
        });
        await loadPhotos();
        setStatus("Saved “" + nextTitle + "”.");
      } catch (error) {
        setStatus(error.message || "Could not save the photo.", "error");
        save.disabled = false;
        save.textContent = "Save";
      } finally {
        busy = false;
      }
    });

    form.appendChild(titleInput);
    form.appendChild(captionInput);
    form.appendChild(save);
    form.appendChild(cancel);
    body.appendChild(form);
    titleInput.focus();
    titleInput.select();
  }

  function startVideoEdit(video, row) {
    const body = row.querySelector(".admin-row__body");
    if (!body || body.querySelector(".admin-rename")) return;
    body.textContent = "";

    const form = document.createElement("form");
    form.className = "admin-rename admin-rename--fields";

    const titleInput = document.createElement("input");
    titleInput.type = "text";
    titleInput.value = video.title;
    titleInput.maxLength = 120;
    titleInput.setAttribute("aria-label", "Video title for " + video.title);

    const descriptionInput = document.createElement("textarea");
    descriptionInput.value = video.description || "";
    descriptionInput.maxLength = 500;
    descriptionInput.rows = 2;
    descriptionInput.setAttribute("aria-label", "Description for " + video.title);

    const save = document.createElement("button");
    save.type = "submit";
    save.className = "btn btn-gold btn-sm";
    save.textContent = "Save";

    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "btn btn-ghost btn-sm admin-btn-light";
    cancel.textContent = "Cancel";
    cancel.addEventListener("click", renderVideos);

    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      const nextTitle = titleInput.value.trim();
      if (!nextTitle) {
        titleInput.focus();
        return;
      }
      if (busy) return;
      busy = true;
      save.disabled = true;
      save.textContent = "Saving…";
      try {
        await updateRow("videos", video.id, {
          title: nextTitle,
          description: descriptionInput.value.trim() || null
        });
        await loadVideos();
        setStatus("Saved “" + nextTitle + "”.");
      } catch (error) {
        setStatus(error.message || "Could not save the video.", "error");
        save.disabled = false;
        save.textContent = "Save";
      } finally {
        busy = false;
      }
    });

    form.appendChild(titleInput);
    form.appendChild(descriptionInput);
    form.appendChild(save);
    form.appendChild(cancel);
    body.appendChild(form);
    titleInput.focus();
    titleInput.select();
  }

  async function deleteSong(song) {
    const ok = window.confirm(
      'Delete "' + song.title + '"? The song is removed from the site and its files are deleted. This cannot be undone.'
    );
    if (!ok) return;

    const response = await client.from("songs").delete().eq("id", song.id);
    if (response.error) throw new Error(response.error.message);

    const audioRemoved = await removeStored("songs", song.audio_path);
    const coverRemoved = song.cover_path ? await removeStored("photos", song.cover_path) : true;

    await loadSongs();
    if (audioRemoved && coverRemoved) setStatus("Deleted “" + song.title + "”.");
    else setStatus("Song deleted, but a file could not be removed.", "error");
  }

  async function deletePhoto(photo) {
    const ok = window.confirm(
      'Delete "' + photo.title + '"? It disappears from the gallery and its file is deleted. This cannot be undone.'
    );
    if (!ok) return;

    const response = await client.from("photos").delete().eq("id", photo.id);
    if (response.error) throw new Error(response.error.message);

    const fileRemoved = await removeStored("photos", photo.file_path);

    await loadPhotos();
    if (fileRemoved) setStatus("Deleted “" + photo.title + "”.");
    else setStatus("Photo deleted, but its file could not be removed.", "error");
  }

  async function toggleVideo(video) {
    await updateRow("videos", video.id, { is_published: !video.is_published });
    await loadVideos();
    setStatus(video.is_published ? "Video hidden from the site." : "Video published.");
  }

  async function deleteVideo(video) {
    const ok = window.confirm(
      'Delete "' + video.title + '"? The video is removed from the site and its files are deleted. This cannot be undone.'
    );
    if (!ok) return;

    const response = await client.from("videos").delete().eq("id", video.id);
    if (response.error) throw new Error(response.error.message);

    const videoRemoved = await removeStored("videos", video.video_path);
    const thumbRemoved = video.thumbnail_path
      ? await removeStored("photos", video.thumbnail_path)
      : true;

    await loadVideos();
    if (videoRemoved && thumbRemoved) setStatus("Deleted “" + video.title + "”.");
    else setStatus("Video deleted, but a file could not be removed.", "error");
  }

  if (songForm) {
    songForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      if (busy) return;

      const titleInput = songForm.querySelector('input[name="title"]');
      const artistInput = songForm.querySelector('input[name="artist"]');
      const audioInput = songForm.querySelector('input[name="audio"]');
      const coverInput = songForm.querySelector('input[name="cover"]');
      const title = titleInput ? titleInput.value.trim() : "";
      const artist = artistInput ? artistInput.value.trim() : "";
      const audio = audioInput && audioInput.files ? audioInput.files[0] : null;
      const cover = coverInput && coverInput.files ? coverInput.files[0] : null;

      if (!title) {
        setStatus("Give the song a title first.", "error");
        if (titleInput) titleInput.focus();
        return;
      }
      if (!artist) {
        setStatus("Add the artist name as well.", "error");
        if (artistInput) artistInput.focus();
        return;
      }
      if (!audio) {
        setStatus("Choose an MP3 file to upload.", "error");
        return;
      }
      if (!/\.mp3$/i.test(audio.name) || (audio.type && audio.type !== "audio/mpeg")) {
        setStatus("That is not an MP3 file. Export the song as MP3 and try again.", "error");
        return;
      }
      if (audio.size > AUDIO_MAX) {
        setStatus("That file is larger than 25 MB. Shorten the song and try again.", "error");
        return;
      }
      if (cover && !isImageFile(cover)) {
        setStatus("The cover must be a JPG, PNG or WebP image.", "error");
        return;
      }
      if (cover && cover.size > IMAGE_MAX) {
        setStatus("The cover is larger than 8 MB. Use a smaller image.", "error");
        return;
      }

      busy = true;
      songForm.setAttribute("aria-busy", "true");
      if (songSubmit) {
        songSubmit.disabled = true;
        songSubmit.textContent = "Uploading…";
      }
      paintUploadProgress(songProgress, 0);

      const stamp = Date.now();
      const audioPath = stamp + "-" + slugify(title) + ".mp3";
      const coverPath = cover
        ? "covers/" + stamp + "-" + slugify(title) + "." + imageExtension(cover)
        : "";
      let audioUploaded = false;
      let coverUploaded = false;

      try {
        await uploadObject("songs", audioPath, audio, "audio/mpeg", function (ratio) {
          paintUploadProgress(songProgress, cover ? ratio * 82 : ratio * 100);
          if (songSubmit) {
            songSubmit.textContent = "Uploading " + (songProgress ? songProgress.value : 0) + "%…";
          }
        });
        audioUploaded = true;

        let coverUrl = null;
        if (cover) {
          await uploadObject("photos", coverPath, cover, imageContentType(cover), function (ratio) {
            paintUploadProgress(songProgress, 82 + ratio * 18);
            if (songSubmit) {
              songSubmit.textContent = "Uploading " + (songProgress ? songProgress.value : 0) + "%…";
            }
          });
          coverUploaded = true;
          coverUrl = storagePublicUrl("photos", coverPath) || null;
        }

        const audioUrl = storagePublicUrl("songs", audioPath);
        if (!audioUrl) throw new Error("Could not read the uploaded song URL.");

        const insert = await client.from("songs").insert({
          title: title,
          artist: artist,
          audio_path: audioUrl,
          cover_path: coverUrl,
          sort_order: nextOrder(songs),
          is_published: true
        });
        if (insert.error) throw new Error(insert.error.message);

        songForm.reset();
        await loadSongs();
        setStatus("Added “" + title + "”. It is live on the site now.");
      } catch (error) {
        if (audioUploaded) await client.storage.from("songs").remove([audioPath]);
        if (coverUploaded) await client.storage.from("photos").remove([coverPath]);
        setStatus(error.message || "The song upload failed. Please try again.", "error");
      } finally {
        busy = false;
        songForm.removeAttribute("aria-busy");
        if (songSubmit) {
          songSubmit.disabled = false;
          songSubmit.textContent = "Upload song";
        }
        if (songProgress) {
          songProgress.hidden = true;
          songProgress.value = 0;
        }
      }
    });
  }

  if (photoForm) {
    photoForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      if (busy) return;

      const titleInput = photoForm.querySelector('input[name="title"]');
      const captionInput = photoForm.querySelector('input[name="caption"]');
      const imageInput = photoForm.querySelector('input[name="image"]');
      const title = titleInput ? titleInput.value.trim() : "";
      const caption = captionInput ? captionInput.value.trim() : "";
      const image = imageInput && imageInput.files ? imageInput.files[0] : null;

      if (!title) {
        setStatus("Give the photo a title first.", "error");
        if (titleInput) titleInput.focus();
        return;
      }
      if (!image) {
        setStatus("Choose an image to upload.", "error");
        return;
      }
      if (!isImageFile(image)) {
        setStatus("That is not a supported image. Use JPG, PNG or WebP.", "error");
        return;
      }
      if (image.size > IMAGE_MAX) {
        setStatus("That image is larger than 8 MB. Compress it and try again.", "error");
        return;
      }

      busy = true;
      photoForm.setAttribute("aria-busy", "true");
      if (photoSubmit) {
        photoSubmit.disabled = true;
        photoSubmit.textContent = "Uploading…";
      }
      paintUploadProgress(photoProgress, 0);

      const path = Date.now() + "-" + slugify(title) + "." + imageExtension(image);
      let uploaded = false;

      try {
        await uploadObject("photos", path, image, imageContentType(image), function (ratio) {
          paintUploadProgress(photoProgress, ratio * 100);
          if (photoSubmit) {
            photoSubmit.textContent = "Uploading " + (photoProgress ? photoProgress.value : 0) + "%…";
          }
        });
        uploaded = true;

        const url = storagePublicUrl("photos", path);
        if (!url) throw new Error("Could not read the uploaded photo URL.");

        const insert = await client.from("photos").insert({
          title: title,
          caption: caption || null,
          file_path: url,
          sort_order: nextOrder(photos),
          is_published: true
        });
        if (insert.error) throw new Error(insert.error.message);

        photoForm.reset();
        await loadPhotos();
        setStatus("Added “" + title + "”. It is in the gallery now.");
      } catch (error) {
        if (uploaded) await client.storage.from("photos").remove([path]);
        setStatus(error.message || "The photo upload failed. Please try again.", "error");
      } finally {
        busy = false;
        photoForm.removeAttribute("aria-busy");
        if (photoSubmit) {
          photoSubmit.disabled = false;
          photoSubmit.textContent = "Upload photo";
        }
        if (photoProgress) {
          photoProgress.hidden = true;
          photoProgress.value = 0;
        }
      }
    });
  }

  if (videoForm) {
    videoForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      if (busy) return;

      const titleInput = videoForm.querySelector('input[name="title"]');
      const descriptionInput = videoForm.querySelector('textarea[name="description"]');
      const videoInput = videoForm.querySelector('input[name="video"]');
      const thumbInput = videoForm.querySelector('input[name="thumbnail"]');
      const title = titleInput ? titleInput.value.trim() : "";
      const description = descriptionInput ? descriptionInput.value.trim() : "";
      const file = videoInput && videoInput.files ? videoInput.files[0] : null;
      const thumbnail = thumbInput && thumbInput.files ? thumbInput.files[0] : null;

      if (!title) {
        setStatus("Give the video a title first.", "error");
        if (titleInput) titleInput.focus();
        return;
      }
      if (!file) {
        setStatus("Choose an MP4 or WebM file to upload.", "error");
        return;
      }
      if (!isVideoFile(file)) {
        setStatus("That is not a supported video. Use MP4 or WebM.", "error");
        return;
      }
      if (file.size > VIDEO_MAX) {
        setStatus("That video is larger than 50 MB. Compress it and try again.", "error");
        return;
      }
      if (thumbnail && !isImageFile(thumbnail)) {
        setStatus("The thumbnail must be a JPG, PNG or WebP image.", "error");
        return;
      }
      if (thumbnail && thumbnail.size > IMAGE_MAX) {
        setStatus("The thumbnail is larger than 8 MB. Use a smaller image.", "error");
        return;
      }

      busy = true;
      videoForm.setAttribute("aria-busy", "true");
      if (videoSubmit) {
        videoSubmit.disabled = true;
        videoSubmit.textContent = "Uploading…";
      }
      paintUploadProgress(videoProgress, 0);

      const stamp = Date.now();
      const videoPath = stamp + "-" + slugify(title) + "." + videoExtension(file);
      const thumbPath = thumbnail
        ? "video-thumbs/" + stamp + "-" + slugify(title) + "." + imageExtension(thumbnail)
        : "";
      let videoUploaded = false;
      let thumbUploaded = false;

      try {
        await uploadObject("videos", videoPath, file, videoContentType(file), function (ratio) {
          paintUploadProgress(videoProgress, thumbnail ? ratio * 88 : ratio * 100);
          if (videoSubmit) {
            videoSubmit.textContent = "Uploading " + (videoProgress ? videoProgress.value : 0) + "%…";
          }
        });
        videoUploaded = true;

        let thumbUrl = null;
        if (thumbnail) {
          await uploadObject("photos", thumbPath, thumbnail, imageContentType(thumbnail), function (ratio) {
            paintUploadProgress(videoProgress, 88 + ratio * 12);
            if (videoSubmit) {
              videoSubmit.textContent = "Uploading " + (videoProgress ? videoProgress.value : 0) + "%…";
            }
          });
          thumbUploaded = true;
          thumbUrl = storagePublicUrl("photos", thumbPath) || null;
        }

        const videoUrl = storagePublicUrl("videos", videoPath);
        if (!videoUrl) throw new Error("Could not read the uploaded video URL.");

        const insert = await client.from("videos").insert({
          title: title,
          description: description || null,
          video_path: videoUrl,
          thumbnail_path: thumbUrl,
          sort_order: nextOrder(videos),
          is_published: true
        });
        if (insert.error) throw new Error(insert.error.message);

        videoForm.reset();
        await loadVideos();
        setStatus("Added “" + title + "”. It is live on the site now.");
      } catch (error) {
        if (videoUploaded) await client.storage.from("videos").remove([videoPath]);
        if (thumbUploaded) await client.storage.from("photos").remove([thumbPath]);
        setStatus(error.message || "The video upload failed. Please try again.", "error");
      } finally {
        busy = false;
        videoForm.removeAttribute("aria-busy");
        if (videoSubmit) {
          videoSubmit.disabled = false;
          videoSubmit.textContent = "Upload video";
        }
        if (videoProgress) {
          videoProgress.hidden = true;
          videoProgress.value = 0;
        }
      }
    });
  }

  function showPanel(name) {
    activePanel = name;
    panels.forEach(function (panel) {
      panel.hidden = panel.dataset.panel !== name;
    });
    tabButtons.forEach(function (button) {
      const active = button.dataset.tab === name;
      button.setAttribute("aria-selected", active ? "true" : "false");
      button.tabIndex = active ? 0 : -1;
    });
    paintCounts();
    if (!client) return;
    if (name === "songs" && !songsLoaded) loadSongs();
    if (name === "photos" && !photosLoaded) loadPhotos();
    if (name === "videos" && !videosLoaded) loadVideos();
  }

  tabButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      showPanel(button.dataset.tab);
    });
    button.addEventListener("keydown", function (event) {
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
      event.preventDefault();
      const index = tabButtons.indexOf(button);
      const step = event.key === "ArrowRight" ? 1 : -1;
      const next = tabButtons[(index + step + tabButtons.length) % tabButtons.length];
      next.focus();
      showPanel(next.dataset.tab);
    });
  });

  if (songListEl) {
    songListEl.addEventListener("click", function (event) {
      const button = event.target.closest("button[data-action]");
      if (!button) return;
      const row = button.closest("[data-id]");
      if (!row) return;
      const song = songs.find(function (item) { return item.id === row.dataset.id; });
      if (!song || busy) return;

      busy = true;
      const action = button.dataset.action;
      const work = action === "edit" ? Promise.resolve(startSongEdit(song, row)) : deleteSong(song);
      Promise.resolve(work)
        .catch(function (error) {
          setStatus(error.message || "That change did not save. Please try again.", "error");
        })
        .finally(function () {
          busy = false;
        });
    });
  }

  if (photoListEl) {
    photoListEl.addEventListener("click", function (event) {
      const button = event.target.closest("button[data-action]");
      if (!button) return;
      const row = button.closest("[data-id]");
      if (!row) return;
      const photo = photos.find(function (item) { return item.id === row.dataset.id; });
      if (!photo || busy) return;

      busy = true;
      const action = button.dataset.action;
      const work = action === "edit" ? Promise.resolve(startPhotoEdit(photo, row)) : deletePhoto(photo);
      Promise.resolve(work)
        .catch(function (error) {
          setStatus(error.message || "That change did not save. Please try again.", "error");
        })
        .finally(function () {
          busy = false;
        });
    });
  }

  if (videoListEl) {
    videoListEl.addEventListener("click", function (event) {
      const button = event.target.closest("button[data-action]");
      if (!button) return;
      const row = button.closest("[data-id]");
      if (!row) return;
      const video = videos.find(function (item) { return item.id === row.dataset.id; });
      if (!video || busy) return;

      busy = true;
      const action = button.dataset.action;
      const work = action === "edit"
        ? Promise.resolve(startVideoEdit(video, row))
        : action === "toggle"
          ? toggleVideo(video)
          : deleteVideo(video);
      Promise.resolve(work)
        .catch(function (error) {
          setStatus(error.message || "That change did not save. Please try again.", "error");
        })
        .finally(function () {
          busy = false;
        });
    });
  }

  if (songRefresh) {
    songRefresh.addEventListener("click", async function () {
      if (busy || !client) return;
      busy = true;
      songRefresh.disabled = true;
      try {
        if (await loadSongs()) setStatus("Songs refreshed.");
      } finally {
        busy = false;
        songRefresh.disabled = false;
      }
    });
  }

  if (photoRefresh) {
    photoRefresh.addEventListener("click", async function () {
      if (busy || !client) return;
      busy = true;
      photoRefresh.disabled = true;
      try {
        if (await loadPhotos()) setStatus("Photos refreshed.");
      } finally {
        busy = false;
        photoRefresh.disabled = false;
      }
    });
  }

  if (videoRefresh) {
    videoRefresh.addEventListener("click", async function () {
      if (busy || !client) return;
      busy = true;
      videoRefresh.disabled = true;
      try {
        if (await loadVideos()) setStatus("Videos refreshed.");
      } finally {
        busy = false;
        videoRefresh.disabled = false;
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

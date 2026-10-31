/* ============================================================
   JAMIX PRO UG — visitor analytics tracker
   ------------------------------------------------------------
   Tiny, first-party and cookie-free. It stores one random id in
   localStorage so a returning browser counts as the same visitor,
   then POSTs events straight into the analytics_events table with
   the public (publishable) key. Row level security lets visitors
   insert and nothing else, so this file can never read analytics
   back. The service-role key is not used anywhere.

   Loaded on every public page, before script.js is not required.
   If js/supabase.js is not configured it does nothing at all.
   ============================================================ */
(function () {
  "use strict";

  const config = window.JAMIX_SUPABASE || {};
  const key = config.key || config.anonKey || "";
  const base = String(config.url || "").replace(/\/+$/, "");
  const enabled = /^https?:\/\//.test(base) && key.length > 20;

  const VISITOR_KEY = "jamix_visitor_id";
  const WINDOW_MS = 60000;

  /* ---------- Visitor id ---------- */
  let memoryId = "";

  function randomId() {
    const crypto = window.crypto;
    if (crypto && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID().replace(/-/g, "").slice(0, 32);
    }
    if (crypto && typeof crypto.getRandomValues === "function") {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      let out = "";
      for (let i = 0; i < bytes.length; i += 1) {
        out += bytes[i].toString(16).padStart(2, "0");
      }
      return out;
    }
    let fallback = "";
    while (fallback.length < 32) {
      fallback += Math.random().toString(16).slice(2);
    }
    return fallback.slice(0, 32);
  }

  function readStored(keyName) {
    try {
      return window.localStorage.getItem(keyName) || "";
    } catch (error) {
      return "";
    }
  }

  function writeStored(keyName, value) {
    try {
      window.localStorage.setItem(keyName, value);
    } catch (error) {
      /* private mode: the id simply lives for this page load */
    }
  }

  function visitorId() {
    if (!memoryId) {
      const stored = readStored(VISITOR_KEY);
      memoryId = stored && stored.length >= 8 && stored.length <= 64 ? stored : randomId();
      if (memoryId !== stored) writeStored(VISITOR_KEY, memoryId);
    }
    return memoryId;
  }

  /* ---------- Event payload ---------- */
  function currentPage() {
    const path = String(window.location.pathname || "/").replace(/\/+$/, "");
    return (path === "" ? "/" : path).slice(0, 120);
  }

  const sent = Object.create(null);
  const OFF_KEY = "jamix_analytics_off";

  function switchedOff() {
    try {
      return window.sessionStorage.getItem(OFF_KEY) === "1";
    } catch (error) {
      return false;
    }
  }

  function switchOff() {
    try {
      window.sessionStorage.setItem(OFF_KEY, "1");
    } catch (error) {
      /* ignore */
    }
  }

  function duplicate(kind, page, target) {
    const id = kind + "|" + page + "|" + target;
    const now = Date.now();
    const last = sent[id];
    if (last && now - last < WINDOW_MS) return true;
    sent[id] = now;
    return false;
  }

  function send(kind, page, target) {
    // Only these four columns are insertable by a visitor. Anything
    // else is rejected by the table grants, so never add fields here.
    const payload = {
      kind: kind,
      page: page,
      target: target,
      visitor_id: visitorId()
    };

    try {
      const request = fetch(base + "/rest/v1/analytics_events", {
        method: "POST",
        headers: {
          apikey: key,
          Authorization: "Bearer " + key,
          "Content-Type": "application/json",
          Prefer: "return=minimal"
        },
        body: JSON.stringify(payload),
        keepalive: true
      });
      if (request && typeof request.then === "function") {
        request.then(function (response) {
          // 404 means supabase/analytics.sql has not been applied yet and
          // 403/401 means the insert policy is missing. Either way there is
          // no point in retrying on every page of this visit.
          if (response && (response.status === 404 || response.status === 403 || response.status === 401)) {
            switchOff();
          }
        }).catch(function () {
          /* offline or blocked: analytics never breaks the site */
        });
      }
    } catch (error) {
      /* ignore */
    }
  }

  function record(kind, target, options) {
    if (!enabled || switchedOff()) return;
    if (navigator.doNotTrack === "1") return;

    const page = currentPage();
    const value = String(target || "").slice(0, 160);
    const force = options && options.force === true;
    if (!force && duplicate(kind, page, value)) return;
    send(kind, page, value);
  }

  /* ---------- Public surface ---------- */
  window.JAMIX_TRACK = {
    enabled: enabled,
    event: record,
    pageView: function () {
      record("page_view", "");
    },
    visitorId: visitorId
  };

  window.JAMIX_TRACK.pageView();
})();

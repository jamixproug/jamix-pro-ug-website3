/* ============================================================
   JAMIX PRO UG — Sign in, registration and password pages
   Uses Supabase Auth through js/auth.js.
   ============================================================ */
(function () {
  "use strict";

  const auth = window.JAMIX_AUTH;
  const page = document.body ? document.body.dataset.authPage : "";
  if (!auth || !page) return;

  const $ = (selector, root = document) => root.querySelector(selector);

  function setText(el, value) {
    if (el) el.textContent = value || "";
  }

  function show(el, visible) {
    if (el) el.hidden = !visible;
  }

  function setBusy(button, busy, label, busyLabel) {
    if (!button) return;
    button.disabled = busy;
    button.textContent = busy ? busyLabel : label;
  }

  function setupProblem() {
    if (auth.configured && auth.client()) return "";
    return "Accounts are not connected yet. The site owner needs to finish the Supabase setup.";
  }

  function blockForSetup(form, errorEl) {
    const problem = setupProblem();
    if (!problem) return false;
    if (form) {
      Array.from(form.elements).forEach(function (field) {
        if (field.tagName !== "BUTTON") field.disabled = true;
      });
      const button = $("button[type=\"submit\"]", form);
      if (button) button.disabled = true;
    }
    if (errorEl) errorEl.textContent = problem;
    return true;
  }

  /* ---------- Sign in ---------- */
  function initLogin() {
    const form = $("[data-login-form]");
    const errorEl = $("[data-login-error]");
    const submit = $("[data-login-submit]");
    const noteEl = $("[data-login-note]");

    if (blockForSetup(form, errorEl)) return;

    if (auth.param("verified") === "1") {
      setText(noteEl, "Email confirmed. Sign in to continue.");
      show(noteEl, true);
    } else if (auth.param("reset") === "1") {
      setText(noteEl, "Password updated. Sign in with your new password.");
      show(noteEl, true);
    } else if (auth.param("signedout") === "1") {
      setText(noteEl, "You have been signed out.");
      show(noteEl, true);
    }
    if (auth.param("suspended") === "1" && errorEl) {
      errorEl.textContent = "This account has been suspended. Contact JAMIX PRO UG if you think that is wrong.";
    }

    auth.client().auth.getSession().then(function (response) {
      const session = response && response.data ? response.data.session : null;
      if (session) window.location.replace(auth.nextTarget());
    });

    if (!form) return;

    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      const email = String(form.elements.email.value || "").trim();
      const password = form.elements.password.value;
      if (!email || !password) {
        errorEl.textContent = "Enter both your email and password.";
        return;
      }
      errorEl.textContent = "";
      setBusy(submit, true, "Sign in", "Signing in…");
      form.setAttribute("aria-busy", "true");

      try {
        const response = await auth.client().auth.signInWithPassword({
          email: email,
          password: password
        });
        if (response.error) {
          errorEl.textContent = auth.friendlyAuthError(response.error.message);
          return;
        }
        const user = response.data && response.data.user;
        let profile = null;
        try {
          profile = await auth.loadProfile(auth.client(), user.id);
        } catch (profileError) {
          profile = null;
        }
        if (profile && profile.is_suspended) {
          await auth.client().auth.signOut();
          errorEl.textContent = "This account has been suspended. Contact JAMIX PRO UG if you think that is wrong.";
          return;
        }
        window.location.replace(auth.nextTarget());
      } catch (error) {
        errorEl.textContent = auth.friendlyAuthError(error.message);
      } finally {
        setBusy(submit, false, "Sign in", "Signing in…");
        form.removeAttribute("aria-busy");
      }
    });
  }

  /* ---------- Registration ---------- */
  function initRegister() {
    const form = $("[data-register-form]");
    const errorEl = $("[data-register-error]");
    const submit = $("[data-register-submit]");
    const doneEl = $("[data-register-done]");
    const emailOut = $("[data-register-email]");
    const resendButton = $("[data-resend]");
    const resendStatus = $("[data-resend-status]");

    if (blockForSetup(form, errorEl)) return;

    auth.client().auth.getSession().then(function (response) {
      const session = response && response.data ? response.data.session : null;
      if (session) window.location.replace("account.html");
    });

    let pendingEmail = "";
    let resendUntil = 0;

    if (!form) return;

    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      const email = String(form.elements.email.value || "").trim();
      const password = form.elements.password.value;
      const confirm = form.elements.confirm.value;

      if (!email) {
        errorEl.textContent = "Enter your email address.";
        return;
      }
      const problem = auth.passwordProblem(password, email);
      if (problem) {
        errorEl.textContent = problem;
        return;
      }
      if (password !== confirm) {
        errorEl.textContent = "The two passwords do not match.";
        return;
      }

      errorEl.textContent = "";
      setBusy(submit, true, "Create account", "Creating account…");
      form.setAttribute("aria-busy", "true");

      try {
        const response = await auth.client().auth.signUp({
          email: email,
          password: password,
          options: {
            emailRedirectTo: window.location.origin + "/login.html?verified=1"
          }
        });
        if (response.error) {
          errorEl.textContent = auth.friendlyAuthError(response.error.message);
          return;
        }
        if (response.data && response.data.session) {
          window.location.replace("account.html");
          return;
        }
        pendingEmail = email;
        setText(emailOut, email);
        show(form, false);
        show(doneEl, true);
      } catch (error) {
        errorEl.textContent = auth.friendlyAuthError(error.message);
      } finally {
        setBusy(submit, false, "Create account", "Creating account…");
        form.removeAttribute("aria-busy");
      }
    });

    if (resendButton) {
      resendButton.addEventListener("click", async function () {
        if (!pendingEmail) return;
        if (Date.now() < resendUntil) {
          setText(resendStatus, "Wait a moment before asking for another email.");
          return;
        }
        resendButton.disabled = true;
        setText(resendStatus, "Sending a new link…");
        try {
          const response = await auth.client().auth.resend({
            type: "signup",
            email: pendingEmail,
            options: {
              emailRedirectTo: window.location.origin + "/login.html?verified=1"
            }
          });
          if (response.error) {
            setText(resendStatus, auth.friendlyAuthError(response.error.message));
          } else {
            resendUntil = Date.now() + 30000;
            setText(resendStatus, "A new confirmation link is on its way.");
          }
        } catch (error) {
          setText(resendStatus, auth.friendlyAuthError(error.message));
        } finally {
          resendButton.disabled = false;
        }
      });
    }
  }

  /* ---------- Forgot password ---------- */
  function initForgot() {
    const form = $("[data-forgot-form]");
    const errorEl = $("[data-forgot-error]");
    const submit = $("[data-forgot-submit]");
    const doneEl = $("[data-forgot-done]");
    const emailOut = $("[data-forgot-email]");

    if (blockForSetup(form, errorEl)) return;
    if (!form) return;

    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      const email = String(form.elements.email.value || "").trim();
      if (!email) {
        errorEl.textContent = "Enter the email address you signed up with.";
        return;
      }
      errorEl.textContent = "";
      setBusy(submit, true, "Send reset link", "Sending…");
      form.setAttribute("aria-busy", "true");

      try {
        const response = await auth.client().auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + "/reset-password.html"
        });
        if (response.error) {
          errorEl.textContent = auth.friendlyAuthError(response.error.message);
          return;
        }
        setText(emailOut, email);
        show(form, false);
        show(doneEl, true);
      } catch (error) {
        errorEl.textContent = auth.friendlyAuthError(error.message);
      } finally {
        setBusy(submit, false, "Send reset link", "Sending…");
        form.removeAttribute("aria-busy");
      }
    });
  }

  /* ---------- Reset password ---------- */
  function initReset() {
    const loadingEl = $("[data-reset-loading]");
    const invalidEl = $("[data-reset-invalid]");
    const form = $("[data-reset-form]");
    const errorEl = $("[data-reset-error]");
    const submit = $("[data-reset-submit]");
    const doneEl = $("[data-reset-done]");

    if (blockForSetup(form, errorEl)) return;

    const client = auth.client();
    let ready = false;
    let timer = 0;

    function showForm() {
      if (ready) return;
      ready = true;
      window.clearTimeout(timer);
      show(loadingEl, false);
      show(invalidEl, false);
      show(form, true);
    }

    function showInvalid() {
      if (ready) return;
      show(loadingEl, false);
      show(form, false);
      show(invalidEl, true);
    }

    auth.onAuthChange(function (event) {
      if (event === "PASSWORD_RECOVERY") showForm();
    });

    client.auth.getSession().then(function (response) {
      const session = response && response.data ? response.data.session : null;
      if (session) showForm();
      else timer = window.setTimeout(showInvalid, 2500);
    }).catch(showInvalid);

    if (!form) return;

    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      const password = form.elements.password.value;
      const confirm = form.elements.confirm.value;
      const problem = auth.passwordProblem(password);
      if (problem) {
        errorEl.textContent = problem;
        return;
      }
      if (password !== confirm) {
        errorEl.textContent = "The two passwords do not match.";
        return;
      }
      errorEl.textContent = "";
      setBusy(submit, true, "Save new password", "Saving…");
      form.setAttribute("aria-busy", "true");

      try {
        const response = await client.auth.updateUser({ password: password });
        if (response.error) {
          errorEl.textContent = auth.friendlyAuthError(response.error.message);
          return;
        }
        await client.auth.signOut();
        show(form, false);
        show(doneEl, true);
      } catch (error) {
        errorEl.textContent = auth.friendlyAuthError(error.message);
      } finally {
        setBusy(submit, false, "Save new password", "Saving…");
        form.removeAttribute("aria-busy");
      }
    });
  }

  if (page === "login") initLogin();
  if (page === "register") initRegister();
  if (page === "forgot") initForgot();
  if (page === "reset") initReset();
})();

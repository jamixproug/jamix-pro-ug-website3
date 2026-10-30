/* ============================================================
   JAMIX PRO UG — site behaviour
   Vanilla JavaScript. No dependencies.
   ============================================================ */

(function () {
  "use strict";

  /* ----------------------------------------------------------
     Site configuration
     ----------------------------------------------------------
     FORM_ENDPOINT: Formspree endpoint for the booking form.
     When set, valid enquiries are posted to Formspree and the
     visitor sees a sent confirmation. Set it to "" to return to
     demo mode, where the form prepares the enquiry but clearly
     tells the visitor that nothing was sent.
  ---------------------------------------------------------- */
  const SITE = {
    whatsapp: "256763873852",
    email: "jamixproug@gmail.com",
    formEndpoint: "https://formspree.io/f/xppplekn",
    demoNotice:
      "Demo mode: this form is not connected to a mailbox yet. You can send the same details on WhatsApp in one tap.",
  };

  const $ = (selector, scope) => (scope || document).querySelector(selector);
  const $$ = (selector, scope) => Array.from((scope || document).querySelectorAll(selector));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const escapeHtml = (value) =>
    String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const formatDate = (iso) => {
    if (!iso) return "";
    const date = new Date(iso + "T12:00:00");
    if (Number.isNaN(date.getTime())) return iso;
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  /* ----------------------------------------------------------
     Header + mobile navigation
  ---------------------------------------------------------- */
  const header = $(".site-header");
  const navToggle = $("[data-nav-toggle]");
  const mobileNav = $("[data-mobile-nav]");
  const mobilePanel = mobileNav ? $(".mobile-nav__panel", mobileNav) : null;
  const mobileClose = $("[data-nav-close]", mobileNav || document);
  let lastFocused = null;

  const onScroll = () => {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 8);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  const isNavOpen = () => document.body.classList.contains("nav-open");

  function openNav() {
    if (!mobileNav || !navToggle) return;
    lastFocused = document.activeElement;
    document.body.classList.add("nav-open");
    mobileNav.removeAttribute("inert");
    mobileNav.setAttribute("aria-hidden", "false");
    navToggle.setAttribute("aria-expanded", "true");
    navToggle.setAttribute("aria-label", "Close menu");
    window.setTimeout(() => {
      const first = $(".mobile-nav__list a", mobileNav);
      if (first) first.focus();
    }, 80);
  }

  function closeNav(returnFocus) {
    if (!mobileNav || !navToggle) return;
    document.body.classList.remove("nav-open");
    mobileNav.setAttribute("inert", "");
    mobileNav.setAttribute("aria-hidden", "true");
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.setAttribute("aria-label", "Open menu");
    if (returnFocus !== false) {
      if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
      else navToggle.focus();
    }
  }

  if (navToggle) {
    navToggle.addEventListener("click", () => {
      if (isNavOpen()) closeNav();
      else openNav();
    });
  }
  if (mobileNav) {
    $$("[data-nav-close]", mobileNav).forEach((el) =>
      el.addEventListener("click", () => closeNav())
    );
    $$("a", mobileNav).forEach((link) =>
      link.addEventListener("click", () => closeNav(false))
    );
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && isNavOpen()) {
        event.preventDefault();
        closeNav();
      }
    });
    mobileNav.addEventListener("keydown", (event) => {
      if (event.key !== "Tab" || !isNavOpen() || !mobilePanel) return;
      const focusable = $$(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
        mobilePanel
      ).filter((el) => el.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
  }
  window.addEventListener("resize", () => {
    if (window.innerWidth > 1020 && isNavOpen()) closeNav(false);
  });

  /* ----------------------------------------------------------
     Scroll reveal
  ---------------------------------------------------------- */
  const revealElements = $$("[data-reveal]");
  if (revealElements.length) {
    if (reduceMotion || !("IntersectionObserver" in window)) {
      revealElements.forEach((el) => el.classList.add("is-visible"));
    } else {
      revealElements.forEach((el) => {
        const siblings = el.parentElement
          ? $$("[data-reveal]", el.parentElement).filter(
              (node) => node.parentElement === el.parentElement
            )
          : [el];
        const index = siblings.indexOf(el);
        if (index > 0 && !el.style.getPropertyValue("--delay")) {
          el.style.setProperty("--delay", Math.min(index, 3) * 0.08 + "s");
        }
      });
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
      );
      revealElements.forEach((el) => observer.observe(el));
    }
  }

  /* ----------------------------------------------------------
     Footer year
  ---------------------------------------------------------- */
  $$("[data-year]").forEach((el) => {
    el.textContent = String(new Date().getFullYear());
  });

  /* ----------------------------------------------------------
     Portfolio filters
  ---------------------------------------------------------- */
  const filterButtons = $$("[data-filter]");
  const portfolioItems = $$("[data-category]");
  const filterResult = $("[data-filter-result]");

  if (filterButtons.length && portfolioItems.length) {
    const params = new URLSearchParams(window.location.search);
    const requested = (params.get("filter") || "all").toLowerCase();

    const setFilter = (filter, updateUrl) => {
      const active = filter || "all";
      let count = 0;
      filterButtons.forEach((button) => {
        const isActive = button.dataset.filter === active;
        button.setAttribute("aria-pressed", isActive ? "true" : "false");
      });
      portfolioItems.forEach((item) => {
        const show =
          active === "all" ||
          item.dataset.category.split(" ").map((c) => c.toLowerCase()).includes(active);
        item.hidden = !show;
        if (show) count += 1;
      });
      if (filterResult) {
        filterResult.textContent =
          count +
          (count === 1 ? " project" : " projects") +
          (active === "all"
            ? " in the archive"
            : " in " + active.charAt(0).toUpperCase() + active.slice(1));
      }
      if (updateUrl && window.history.replaceState) {
        const next = new URL(window.location.href);
        if (active === "all") next.searchParams.delete("filter");
        else next.searchParams.set("filter", active);
        window.history.replaceState({}, "", next.pathname + next.search + next.hash);
      }
    };

    const valid = filterButtons.some((b) => b.dataset.filter === requested);
    setFilter(valid ? requested : "all", false);

    filterButtons.forEach((button) => {
      button.addEventListener("click", () => setFilter(button.dataset.filter, true));
    });
  }

  /* ----------------------------------------------------------
     Lightbox
  ---------------------------------------------------------- */
  const lightbox = $("#lightbox");
  const lightboxImg = $("#lightbox-img");
  const lightboxTitle = $("#lightbox-title");
  const lightboxCaption = $("#lightbox-caption");
  const lightboxCount = $("#lightbox-count");
  const lightboxPrev = $("[data-lightbox-prev]");
  const lightboxNext = $("[data-lightbox-next]");
  const lightboxClose = $("[data-lightbox-close]");
  let lightboxList = [];
  let lightboxIndex = 0;
  let lightboxTrigger = null;

  function visibleLightboxItems() {
    return $$("[data-lightbox]").filter((item) => {
      const wrapper = item.closest("[data-category]");
      return !wrapper || !wrapper.hidden;
    });
  }

  function paintLightbox(index) {
    if (!lightboxList.length) return;
    lightboxIndex = (index + lightboxList.length) % lightboxList.length;
    const trigger = lightboxList[lightboxIndex];
    const data = trigger.dataset;
    if (lightboxImg) {
      lightboxImg.src = data.full;
      lightboxImg.alt = data.alt || data.title || "";
    }
    if (lightboxTitle) lightboxTitle.textContent = data.title || "";
    if (lightboxCaption) lightboxCaption.textContent = data.caption || "";
    if (lightboxCount) {
      lightboxCount.textContent =
        String(lightboxIndex + 1).padStart(2, "0") + " / " + String(lightboxList.length).padStart(2, "0");
    }
    if (lightboxPrev) lightboxPrev.hidden = lightboxList.length < 2;
    if (lightboxNext) lightboxNext.hidden = lightboxList.length < 2;

    const next = lightboxList[(lightboxIndex + 1) % lightboxList.length];
    if (next && next.dataset.full) {
      const preload = new Image();
      preload.src = next.dataset.full;
    }
  }

  if (lightbox && lightboxImg && typeof lightbox.showModal === "function") {
    $$("[data-lightbox]").forEach((trigger) => {
      trigger.addEventListener("click", () => {
        lightboxList = visibleLightboxItems();
        lightboxTrigger = trigger;
        paintLightbox(lightboxList.indexOf(trigger));
        document.body.classList.add("nav-open");
        lightbox.showModal();
        if (lightboxClose) lightboxClose.focus();
      });
    });

    const closeLightbox = () => {
      if (lightbox.open) lightbox.close();
    };
    if (lightboxClose) lightboxClose.addEventListener("click", closeLightbox);
    if (lightboxPrev) lightboxPrev.addEventListener("click", () => paintLightbox(lightboxIndex - 1));
    if (lightboxNext) lightboxNext.addEventListener("click", () => paintLightbox(lightboxIndex + 1));
    lightbox.addEventListener("click", (event) => {
      if (event.target === lightbox) closeLightbox();
    });
    lightbox.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        paintLightbox(lightboxIndex - 1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        paintLightbox(lightboxIndex + 1);
      }
    });
    lightbox.addEventListener("close", () => {
      document.body.classList.remove("nav-open");
      lightboxImg.removeAttribute("src");
      if (lightboxTrigger) lightboxTrigger.focus();
    });
  }

  /* ----------------------------------------------------------
     Blog listing: render, search, categories
  ---------------------------------------------------------- */
  const posts = Array.isArray(window.JAMIX_POSTS) ? window.JAMIX_POSTS : [];
  const postGrid = $("#post-grid");

  const postCard = (post) => {
    const webp = post.image.replace(/\.jpg$/i, ".webp");
    return (
      '<article class="post-card" data-reveal>' +
      '<a class="post-media" href="article.html?post=' + encodeURIComponent(post.slug) + '" tabindex="-1" aria-hidden="true">' +
      "<picture>" +
      '<source srcset="' + escapeHtml(webp) + '" type="image/webp">' +
      '<img src="' + escapeHtml(post.image) + '" alt="' + escapeHtml(post.imageAlt || "") + '" width="' + (post.imageWidth || 900) + '" height="' + (post.imageHeight || 560) + '" loading="lazy" style="' + escapeHtml(post.imagePosition ? "object-position:" + post.imagePosition : "") + '">' +
      "</picture>" +
      '<span class="tag">' + escapeHtml(post.category) + "</span>" +
      "</a>" +
      '<div class="post-body">' +
      '<div class="post-meta"><time datetime="' + escapeHtml(post.date) + '">' + escapeHtml(formatDate(post.date)) + "</time><span aria-hidden=\"true\"></span>" + escapeHtml(post.readTime || "4 min read") + "</div>" +
      '<h3><a href="article.html?post=' + encodeURIComponent(post.slug) + '">' + escapeHtml(post.title) + "</a></h3>" +
      "<p>" + escapeHtml(post.excerpt) + "</p>" +
      '<a class="link-arrow" href="article.html?post=' + encodeURIComponent(post.slug) + '">Read article ' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></a>' +
      "</div></article>"
    );
  };

  if (postGrid && posts.length) {
    postGrid.innerHTML = posts.map(postCard).join("");
    $$("[data-reveal]", postGrid).forEach((el) => el.classList.add("is-visible"));

    const searchInput = $("#blog-search");
    const clearButton = $("#blog-clear");
    const chips = $$("[data-blog-category]");
    const countEl = $("#blog-count");
    const emptyState = $("#blog-empty");
    const resetButton = $("#blog-reset");
    const params = new URLSearchParams(window.location.search);
    let activeCategory = params.get("category") || "all";
    let query = params.get("q") || "";

    const normalise = (value) => String(value || "").toLowerCase().trim();

    const categoryExists = chips.some(
      (chip) => chip.dataset.blogCategory.toLowerCase() === activeCategory.toLowerCase()
    );
    if (!categoryExists) activeCategory = "all";
    // Preserve display casing from the chip list.
    const activeChip = chips.find(
      (chip) => chip.dataset.blogCategory.toLowerCase() === activeCategory.toLowerCase()
    );
    if (activeChip) activeCategory = activeChip.dataset.blogCategory;

    if (searchInput) searchInput.value = query;

    const updateUrl = () => {
      if (!window.history.replaceState) return;
      const next = new URL(window.location.href);
      if (activeCategory && activeCategory !== "all") next.searchParams.set("category", activeCategory);
      else next.searchParams.delete("category");
      if (query) next.searchParams.set("q", query);
      else next.searchParams.delete("q");
      window.history.replaceState({}, "", next.pathname + next.search + next.hash);
    };

    const applyFilters = () => {
      const cards = $$(".post-card", postGrid);
      const needle = normalise(query);
      let visible = 0;

      posts.forEach((post) => {
        const card = cards.find((c) => $("h3 a", c) && $("h3 a", c).getAttribute("href").includes(encodeURIComponent(post.slug)));
        if (!card) return;
        const haystack = normalise(
          [post.title, post.excerpt, post.category, (post.tags || []).join(" ")].join(" ")
        );
        const matchesQuery = !needle || haystack.includes(needle);
        const matchesCategory =
          activeCategory === "all" ||
          post.category.toLowerCase() === activeCategory.toLowerCase();
        const show = matchesQuery && matchesCategory;
        card.hidden = !show;
        if (show) visible += 1;
      });

      chips.forEach((chip) => {
        chip.setAttribute(
          "aria-pressed",
          chip.dataset.blogCategory === activeCategory ? "true" : "false"
        );
      });

      if (countEl) {
        if (!needle && activeCategory === "all") {
          countEl.innerHTML = "Showing <strong>" + visible + "</strong> " + (visible === 1 ? "article" : "articles");
        } else {
          countEl.innerHTML =
            "Showing <strong>" + visible + "</strong> of " + posts.length + " articles" +
            (activeCategory !== "all" ? " · " + escapeHtml(activeCategory) : "") +
            (needle ? " · “" + escapeHtml(query) + "”" : "");
        }
      }
      if (emptyState) emptyState.classList.toggle("is-visible", visible === 0);
      if (postGrid) postGrid.hidden = visible === 0;
      if (clearButton) clearButton.classList.toggle("is-visible", Boolean(query));
      updateUrl();
    };

    chips.forEach((chip) => {
      chip.addEventListener("click", () => {
        activeCategory = chip.dataset.blogCategory;
        applyFilters();
      });
    });

    if (searchInput) {
      let timer = null;
      searchInput.addEventListener("input", () => {
        query = searchInput.value;
        window.clearTimeout(timer);
        timer = window.setTimeout(applyFilters, 120);
      });
      searchInput.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          searchInput.value = "";
          query = "";
          applyFilters();
        }
      });
    }

    if (clearButton) {
      clearButton.addEventListener("click", () => {
        query = "";
        if (searchInput) {
          searchInput.value = "";
          searchInput.focus();
        }
        applyFilters();
      });
    }

    if (resetButton) {
      resetButton.addEventListener("click", () => {
        query = "";
        activeCategory = "all";
        if (searchInput) searchInput.value = "";
        applyFilters();
        // The empty-state panel (and its reset button) is hidden after
        // clearing, so move focus somewhere visible instead of dropping
        // it back to the top of the document.
        if (searchInput) searchInput.focus();
      });
    }

    applyFilters();
  }

  /* ----------------------------------------------------------
     Article template
  ---------------------------------------------------------- */
  const articleRoot = $("#article-root");

  if (articleRoot) {
    const slug = new URLSearchParams(window.location.search).get("post");
    const post = posts.find((item) => item.slug === slug);

    if (!post) {
      articleRoot.innerHTML =
        '<div class="error-page" style="min-height:auto;padding-block:60px 20px">' +
        '<p class="eyebrow" style="justify-content:center">Journal</p>' +
        "<h1>Article not found</h1>" +
        "<p>The article you are looking for may have moved. Browse the journal for the latest notes from JAMIX PRO UG.</p>" +
        '<div class="cta-actions"><a class="btn btn-gold" href="blog.html">Back to the journal</a></div>' +
        "</div>";
      document.title = "Article not found — JAMIX PRO UG";
    } else {
      const webp = post.image.replace(/\.jpg$/i, ".webp");
      const bodyHTML = post.body
        .map((block) => {
          if (typeof block === "string") return block;
          return block.html || "";
        })
        .join("");

      const related = posts
        .filter((item) => item.slug !== post.slug)
        .sort((a, b) => {
          const aScore = a.category === post.category ? 0 : 1;
          const bScore = b.category === post.category ? 0 : 1;
          return aScore - bScore;
        })
        .slice(0, 3);

      articleRoot.innerHTML =
        '<header class="article-head">' +
        '<div class="article-kicker"><span class="tag">' + escapeHtml(post.category) + "</span><span aria-hidden=\"true\"></span>" +
        "<time datetime=\"" + escapeHtml(post.date) + "\">" + escapeHtml(formatDate(post.date)) + "</time><span aria-hidden=\"true\"></span>" +
        escapeHtml(post.readTime || "4 min read") + "</div>" +
        '<h1 class="article-title">' + escapeHtml(post.title) + "</h1>" +
        '<p class="article-dek">' + escapeHtml(post.excerpt) + "</p>" +
        "</header>" +
        '<figure class="article-cover"><picture><source srcset="' + escapeHtml(webp) + '" type="image/webp">' +
        '<img src="' + escapeHtml(post.image) + '" alt="' + escapeHtml(post.imageAlt || "") + '" width="' + (post.imageWidth || 1200) + '" height="' + (post.imageHeight || 700) + '" style="' + escapeHtml(post.imagePosition ? "object-position:" + post.imagePosition : "") + '"></picture></figure>' +
        '<div class="article-body">' + bodyHTML + "</div>" +
        (post.note
          ? '<div class="article-note"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 10.5v6M12 7.4v.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg><span>' + escapeHtml(post.note) + "</span></div>"
          : "") +
        '<div class="article-share"><span>Share this article</span>' +
        '<button class="btn btn-ghost" type="button" data-copy-link><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.1 0l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1M14 11a5 5 0 0 0-7.1 0l-2 2a5 5 0 0 0 7.1 7.1l1.1-1.1" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg><span data-copy-label>Copy link</span></button>' +
        '<a class="btn btn-ghost" href="https://wa.me/?text=' + encodeURIComponent(post.title + " — " + window.location.href) + '" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 0 0-7.7 13.7L3 21l4.4-1.2A9 9 0 1 0 12 3Z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8.7 8.6c.3-.6 1.5-.5 1.8.1.2.5.6 1.2.4 1.6-.2.4-.7.7-.6 1.1.4 1 1.3 1.9 2.3 2.3.4.1.7-.4 1.1-.6.4-.2 1.1.2 1.6.4.6.3.7 1.5.1 1.8-1.1.6-2.6.4-4.1-.5a8 8 0 0 1-3.1-3.1c-.9-1.5-1.1-3-.5-4.1Z" fill="currentColor"/></svg>WhatsApp</a>' +
        "</div>" +
        '<div class="article-foot"><div class="section-head" style="margin-top:60px;margin-bottom:26px"><div><p class="eyebrow">Keep reading</p><h2 class="section-title" style="font-size:clamp(1.8rem,3vw,2.5rem)">More from the journal</h2></div><a class="link-arrow" href="blog.html">All articles <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></a></div>' +
        '<div class="related-grid">' + related.map(postCard).join("") + "</div></div>";

      document.title = post.title + " — JAMIX PRO UG";
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) metaDescription.setAttribute("content", post.excerpt);
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) ogTitle.setAttribute("content", post.title + " — JAMIX PRO UG");
      const ogDescription = document.querySelector('meta[property="og:description"]');
      if (ogDescription) ogDescription.setAttribute("content", post.excerpt);
      const ogImage = document.querySelector('meta[property="og:image"]');
      if (ogImage) ogImage.setAttribute("content", post.image);

      const copyButton = $("[data-copy-link]", articleRoot);
      if (copyButton) {
        copyButton.addEventListener("click", async () => {
          const label = $("[data-copy-label]", copyButton);
          try {
            await navigator.clipboard.writeText(window.location.href);
            if (label) label.textContent = "Link copied";
          } catch (error) {
            if (label) label.textContent = "Copy this page URL";
          }
          window.setTimeout(() => {
            if (label) label.textContent = "Copy link";
          }, 2400);
        });
      }
    }
  }

  /* ----------------------------------------------------------
     Contact form
  ---------------------------------------------------------- */
  const form = $("#contact-form");

  if (form) {
    const status = $("#form-status");
    const submitButton = $('button[type="submit"]', form);
    const demoNote = $("#form-demo-note");
    const dateField = $("#event-date");

    if (demoNote && !SITE.formEndpoint) demoNote.textContent = SITE.demoNotice;
    if (dateField) {
      const today = new Date();
      const iso = new Date(today.getTime() - today.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 10);
      dateField.setAttribute("min", iso);
    }

    const fields = {
      name: $("#name"),
      email: $("#email"),
      phone: $("#phone"),
      type: $("#enquiry-type"),
      date: $("#event-date"),
      message: $("#message"),
      consent: $("#consent"),
    };

    const setError = (name, message) => {
      const field = fields[name];
      const error = $("#" + name + "-error");
      if (error) error.textContent = message || "";
      if (field) {
        if (message) field.setAttribute("aria-invalid", "true");
        else field.removeAttribute("aria-invalid");
      }
    };

    const clearStatus = () => {
      if (!status) return;
      status.classList.remove("is-visible", "form-status--info", "form-status--success", "form-status--error");
      status.innerHTML = "";
    };

    const showStatus = (type, html) => {
      if (!status) return;
      clearStatus();
      status.classList.add("is-visible", "form-status--" + type);
      status.innerHTML = html;
      status.setAttribute("role", type === "error" ? "alert" : "status");
      status.setAttribute("aria-live", type === "error" ? "assertive" : "polite");
      status.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "nearest" });
      const focusTarget = $(".form-status__actions a, .form-status__actions button", status);
      if (focusTarget) focusTarget.focus({ preventScroll: true });
    };

    const readValues = () => ({
      name: (fields.name && fields.name.value.trim()) || "",
      email: (fields.email && fields.email.value.trim()) || "",
      phone: (fields.phone && fields.phone.value.trim()) || "",
      type: (fields.type && fields.type.value) || "",
      date: (fields.date && fields.date.value) || "",
      message: (fields.message && fields.message.value.trim()) || "",
      consent: Boolean(fields.consent && fields.consent.checked),
    });

    const validate = () => {
      const values = readValues();
      const errors = {};
      if (values.name.length < 2) errors.name = "Please enter your name (at least 2 characters).";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(values.email))
        errors.email = "Please enter a valid email address, e.g. name@example.com.";
      if (values.phone && !/^[+()\d\s.-]{7,22}$/.test(values.phone))
        errors.phone = "Please use digits and + ( ) - only, or leave this blank.";
      if (!values.type) errors.type = "Please choose the type of enquiry.";
      if (values.date) {
        const chosen = new Date(values.date + "T23:59:00");
        const now = new Date();
        if (chosen < now && values.date !== new Date().toISOString().slice(0, 10)) {
          errors.date = "Please choose today or a future date for an event.";
        }
      }
      if (values.message.length < 10)
        errors.message = "Please tell us a little more (at least 10 characters).";
      if (!values.consent) errors.consent = "Please confirm that we may reply to your enquiry.";
      return { values, errors };
    };

    const fieldOrder = ["name", "email", "phone", "type", "date", "message", "consent"];

    Object.keys(fields).forEach((name) => {
      const field = fields[name];
      if (!field) return;
      const eventName = field.type === "checkbox" || field.tagName === "SELECT" ? "change" : "input";
      field.addEventListener(eventName, () => {
        if (field.getAttribute("aria-invalid") === "true") setError(name, "");
      });
      if (name !== "consent") {
        field.addEventListener("blur", () => {
          if (field.value.trim() && field.getAttribute("aria-invalid") !== "true") setError(name, "");
        });
      }
    });

    const buildMessage = (values) =>
      [
        "Hi JAMIX PRO UG, I would like to make an enquiry.",
        "",
        "Name: " + values.name,
        "Email: " + values.email,
        values.phone ? "Phone: " + values.phone : "",
        "Enquiry: " + values.type,
        values.date ? "Event date: " + values.date : "",
        "",
        values.message,
      ]
        .filter((line) => line !== "")
        .join("\n");

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      clearStatus();
      const { values, errors } = validate();
      fieldOrder.forEach((name) => setError(name, errors[name] || ""));

      const firstError = fieldOrder.find((name) => errors[name]);
      if (firstError && fields[firstError]) {
        fields[firstError].focus();
        fields[firstError].scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
        return;
      }

      const honey = $('input[name="company"]', form);
      if (honey && honey.value) {
        // Quietly stop bots without revealing the honeypot.
        showStatus("info", "<h3>Thank you</h3><p>Your enquiry was received.</p>");
        form.reset();
        return;
      }

      if (!SITE.formEndpoint) {
        const waText = encodeURIComponent(buildMessage(values));
        const waLink = "https://wa.me/" + SITE.whatsapp + "?text=" + waText;
        const mailSubject = encodeURIComponent("Booking enquiry — " + values.type);
        const mailBody = encodeURIComponent(buildMessage(values));
        const mailLink =
          "mailto:" + SITE.email + "?subject=" + mailSubject + "&body=" + mailBody;
        showStatus(
          "info",
          "<h3>Your enquiry is ready — but it has not been sent yet.</h3>" +
            "<p>This website's form is a front-end demo and is not connected to a mailbox. Nothing was submitted. To reach JAMIX PRO UG, send the details on WhatsApp or by email:</p>" +
            '<div class="form-status__actions">' +
            '<a class="btn btn-wa" href="' + waLink + '" target="_blank" rel="noopener">Send on WhatsApp</a>' +
            '<a class="btn btn-ghost" href="' + mailLink + '" style="border-color:rgba(6,13,28,.25);color:#0a1428;background:transparent">Send by email</a>' +
            '<button class="btn btn-ghost" type="button" data-copy-enquiry style="border-color:rgba(6,13,28,.25);color:#0a1428;background:transparent">Copy enquiry</button>' +
            "</div>"
        );
        const copyEnquiry = $("[data-copy-enquiry]", status);
        if (copyEnquiry) {
          copyEnquiry.addEventListener("click", async () => {
            try {
              await navigator.clipboard.writeText(buildMessage(values));
              copyEnquiry.textContent = "Copied";
            } catch (error) {
              copyEnquiry.textContent = "Copy unavailable";
            }
            window.setTimeout(() => {
              copyEnquiry.textContent = "Copy enquiry";
            }, 2400);
          });
        }
        return;
      }

      // A real endpoint is configured — submit it.
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.dataset.label = submitButton.innerHTML;
        submitButton.innerHTML = "Sending…";
      }
      try {
        const payload = new FormData(form);
        payload.delete("company");
        const response = await fetch(SITE.formEndpoint, {
          method: "POST",
          headers: { Accept: "application/json" },
          body: payload,
        });
        if (!response.ok) throw new Error("Request failed with status " + response.status);
        showStatus(
          "success",
          "<h3>Message sent</h3><p>Thank you — your enquiry has reached JAMIX PRO UG. We will reply to the email or phone number you provided.</p>" +
            '<div class="form-status__actions"><a class="btn btn-wa" href="https://wa.me/' + SITE.whatsapp + '" target="_blank" rel="noopener">Chat on WhatsApp</a></div>'
        );
        form.reset();
      } catch (error) {
        showStatus(
          "error",
          "<h3>That did not go through</h3><p>Your message could not be sent. Please try again, or reach us directly on WhatsApp — it is the fastest route.</p>" +
            '<div class="form-status__actions"><a class="btn btn-wa" href="https://wa.me/' + SITE.whatsapp + '" target="_blank" rel="noopener">Open WhatsApp</a><a class="btn btn-ghost" href="mailto:' + SITE.email + '" style="border-color:rgba(6,13,28,.25);color:#0a1428;background:transparent">Email us</a></div>'
        );
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          if (submitButton.dataset.label) submitButton.innerHTML = submitButton.dataset.label;
        }
      }
    });
  }

  /* ----------------------------------------------------------
     Small enhancement: external links open safely
  ---------------------------------------------------------- */
  $$('a[target="_blank"]').forEach((link) => {
    if (!link.rel) link.rel = "noopener";
  });
})();

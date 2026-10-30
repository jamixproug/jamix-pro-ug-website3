# JAMIX PRO UG — Website

A fast, responsive, multi-page static website for **JAMIX PRO UG**, a music, DJ and lifestyle brand based in Kampala, Uganda.

Built with plain HTML, CSS and vanilla JavaScript. No frameworks and no build step. The public pages load only Google Fonts; the private admin page additionally loads the pinned Supabase JS library from jsDelivr.

---

## 1. What is included

| Page | File | Purpose |
| --- | --- | --- |
| Home | `index.html` | Hero, brand introduction, “The sound” set philosophy and listening links, services preview, selected work, latest journal posts, booking call to action |
| About | `about.html` | Story, mission, vision, core values and brand statement |
| Services | `services.html` | DJ performance, karaoke nights, event hosting, brand collaborations, process and pricing/quote policy |
| Portfolio | `portfolio.html` | Filterable gallery with keyboard-accessible image previews |
| Blog | `blog.html` | Searchable, category-filtered article listing |
| Article | `article.html` | Single article template driven by `assets/data/posts.js` (`article.html?post=slug`) |
| Contact | `contact.html` | WhatsApp, email, location, social links and an enquiry form with validation |
| Drops admin | `admin.html` | Private dashboard to manage the home-page playlist (not linked in navigation, `noindex`) |
| Not found | `404.html` | Friendly fallback page for broken or old links |

Supporting files:

- `style.css` — full design system, layout, components, responsive rules and reduced-motion support.
- `admin.css` — admin-only layout, built on the same tokens.
- `script.js` — navigation, scroll reveals, portfolio filters, lightbox, blog search/filter, article rendering, drops player, form validation and Formspree submission.
- `admin.js` — Supabase sign-in and playlist management for `admin.html`.
- `assets/data/posts.js` — all article content in one editable file.
- `assets/data/supabase.js` — Supabase project URL and publishable key (older projects call it the anon key).
- `supabase/schema.sql` — tables, security rules, storage bucket and seed data for the admin.
- `assets/audio/` — the 11 drops clips served by the player.
- `assets/images/` — optimized JPG/WebP photography and brand artwork.
- `assets/icons/` — logo mark, favicon and app icons.
- `manifest.webmanifest` — installable web-app metadata.
- `robots.txt`, `render.yaml`, `.gitignore`.

---

## 2. Preview the site locally

Do not double-click the HTML files for final checks. A local web server makes relative paths, the manifest and the article links behave exactly as they will online.

From this folder (`D:\jamix-pro-ug-website`), run one of these:

```bash
# Python 3 (already available on most machines)
python -m http.server 8000

# or with Node.js
npx serve .
```

Then open:

```
http://localhost:8000
```

Test on a narrow window or phone-sized viewport too — the navigation becomes a slide-in drawer below 1020px.

To stop the server, press `Ctrl + C` in the terminal.

---

## 3. Project structure

```
jamix-pro-ug-website/
├── index.html
├── about.html
├── services.html
├── portfolio.html
├── blog.html
├── article.html
├── contact.html
├── admin.html
├── 404.html
├── style.css
├── admin.css
├── script.js
├── admin.js
├── manifest.webmanifest
├── robots.txt
├── render.yaml
├── .gitignore
├── README.md
├── supabase/
│   └── schema.sql
└── assets/
    ├── audio/            (11 MP3 clips)
    ├── data/
    │   ├── posts.js
    │   └── supabase.js
    ├── icons/
    │   ├── logo-mark.svg
    │   ├── favicon.svg
    │   ├── icon-192.png
    │   ├── icon-512.png
    │   └── apple-touch-icon.png
    └── images/
        ├── portrait-editorial.jpg / .webp
        ├── portrait-studio.jpg / .webp
        ├── portrait-tee.jpg / .webp
        ├── creative-carved-portrait.jpg / .webp
        ├── event-karaoke-night.jpg / .webp
        ├── brand-banner-jamix.jpg / .webp
        ├── brand-banner-jk.jpg / .webp
        ├── brand-mrvibe.png / .webp
        └── og-cover.jpg
```

---

## 4. How the contact and booking form behaves

One form on `contact.html` handles both contact messages and booking enquiries (the `#booking` anchor). Valid enquiries are posted to **Formspree** (endpoint `https://formspree.io/f/mdeedvje`) and delivered to `jamixproug@gmail.com`.

The form collects:

- **Required:** name, email, type of enquiry, message and consent to be contacted.
- **Optional:** phone / WhatsApp number and event date.

When a visitor submits a valid enquiry:

1. The form validates each field in the browser and focuses the first error if something is missing.
2. The details are sent over HTTPS to Formspree and forwarded to the booking inbox.
3. The submit button is disabled and shows “Sending…” while the request is in flight; repeat submits are ignored until it finishes.
4. A confirmation panel says the enquiry has been sent, with an option to continue on WhatsApp.
5. If the request fails or takes longer than 15 seconds, an error panel explains that nothing went through and offers WhatsApp or email instead. Field-specific errors returned by Formspree are shown under the matching inputs.

A hidden honeypot field quietly stops basic bots, and Formspree applies its own spam filtering. The site itself does not store submissions.

### Form service settings

- **Plan:** the free Formspree tier covers 50 submissions per month. Check the Formspree dashboard if the site becomes busy; upgrade or switch services before the limit is reached.
- **Allowed domains:** in Formspree, restrict the form to `jamix-pro-ug-website3.onrender.com` and any custom domain. Requests from other domains should be rejected.
- **Recipient:** confirm that `jamixproug@gmail.com` is monitored and that Formspree notifications are not being filtered as spam.

### Changing the endpoint

Open `script.js` and edit `formEndpoint`:

```js
const SITE = {
  whatsapp: "256763873852",
  email: "jamixproug@gmail.com",
  formEndpoint: "https://formspree.io/f/mdeedvje",
  ...
};
```

The endpoint URL is not a secret, but API keys are. Never place private keys, passwords or SMTP credentials in this repository. Setting `formEndpoint` to `""` returns the form to demo mode: it validates, states clearly that nothing was sent, and offers WhatsApp, email and copy actions instead.

---

## 5. Drops admin (Supabase)

`admin.html` is a private dashboard for the home-page **Drops & IDs** playlist. It can add a clip (uploading the MP3), rename, reorder, hide and delete clips. Changes appear on the public site within a minute — no code edit or redeploy.

The page is deliberately not linked in the navigation. It is `noindex, nofollow` and disallowed in `robots.txt`. That keeps it out of search results; the real protection is the database rules.

### One-time setup

1. Create a free project at [supabase.com/dashboard](https://supabase.com/dashboard).
2. Go to **Authentication → Users → Add user**. Use `jamixproug@gmail.com` with a strong password, and confirm the user. Do this before the next step: the schema allowlists the account by looking it up.
3. Open **SQL Editor**, paste all of `supabase/schema.sql` and click **Run**. This creates the `drops` table, the `admins` allowlist, the security policies, a public `drops` storage bucket, the 11 existing clips and your admin row.
4. Go to **Project Settings → API Keys** and copy the **Project URL** and the **publishable** key (older projects label it **anon public**) into `assets/data/supabase.js`. This repository is already configured for the live project.
5. Commit and push. Render redeploys and `/admin.html` switches from the setup checklist to the sign-in form.

If the schema was run before the user existed, simply run it again — it is idempotent and will add the missing `admins` row.

Leave the URL blank to go back to the previous behaviour: the player uses its built-in 11 clips and `admin.html` shows the setup checklist.

### Using the dashboard

- Sign in at `https://<your-site>/admin.html`.
- **Add a clip** uploads an MP3 to the `drops` bucket and publishes it at the end of the playlist. MP3 only, 10 MB maximum — clips of 5–15 seconds work best.
- The arrow buttons change the order, **Rename** edits the title inline, **Hide** removes a clip from the player without deleting it.
- **Delete** removes the row and the uploaded file. Clips that came from `assets/audio/` keep their file in the repository; only the database row is removed.
- The public player reads published rows from Supabase. If the database is unreachable it silently falls back to the hard-coded list, so visitors never see an empty section.

### Security notes

- The **publishable** key (formerly anon) in `assets/data/supabase.js` is public by design. Every write is checked by row-level security against the `admins` table.
- **Never** put the `service_role` key in this repository or in the browser. It bypasses all rules.
- To revoke someone's access, delete their row from `public.admins`.
- Free Supabase projects pause after a period of inactivity. While paused, the player falls back to the built-in clips and the dashboard cannot sign in; open the Supabase dashboard to wake it. Check the current free-tier limits before relying on storage for a large library.

### If something breaks

| Symptom | Likely cause |
|---|---|
| Setup checklist stays visible | `assets/data/supabase.js` still has blank values, or the deploy did not pick up the change |
| "This account is not on the admin list" | The user exists but has no `admins` row — usually the schema ran before the user was created. Re-run `schema.sql` |
| Upload fails with a policy error | `schema.sql` was not run in full, or the storage policies were skipped |
| Player shows the old 11 clips | Supabase unreachable, no published rows, or the key is wrong — check the browser console |

---

## 6. Customising the site

### Contact details

Search and replace these values across the HTML files and `script.js` when they change:

- WhatsApp: `256763873852` (international format, no `+` or spaces, used in `wa.me` links)
- Displayed phone: `+256 763 873 852`
- Email: `jamixproug@gmail.com`

The central JavaScript config lives at the top of `script.js` in the `SITE` object.

### After the site has a live address

Set the social preview image (`og:image`) to an absolute URL in each page once you know the final domain, for example `https://your-domain.example/assets/images/og-cover.jpg`. Some platforms do not resolve relative image URLs. You may also add the live sitemap URL to `robots.txt`.

### Social links

Each social icon is a plain link. Replace the `href` values in the header drawer, footer and contact page. Current values in the build:

- Instagram — `https://www.instagram.com/jamixprougcr7/`
- TikTok — `https://www.tiktok.com/@jamixproug1`
- Facebook — `https://www.facebook.com/jamixdeejay`
- X — `https://x.com/jamixproug`
- Snapchat — `https://www.snapchat.com/add/jamixproug`
- YouTube — `https://www.youtube.com/@jamixproug`

The home page “Listen” card repeats the Instagram, TikTok and YouTube links inside `index.html` (section `#music`). If a handle changes, update it there as well as in the header, footer and contact page.

**Verify every handle before publishing.** Some were taken from promotional artwork and may not all be official or current. Remove any account that does not belong to the brand rather than leaving a dead or incorrect link.

### Listening section (home)

The `#music` section explains how a JAMIX PRO UG set is built and points visitors to the official channels. It also contains a **Drops & IDs** player for short venue tags, booking lines and shout-outs.

- The player asks Supabase for the published clips, in playlist order, once the page loads. If Supabase is unconfigured or unreachable it keeps the 11 clips hard-coded in `index.html`, so the section never breaks.
- The original clips live in `assets/audio/`. New clips uploaded through `admin.html` go to Supabase Storage instead.
- Playback only starts when a visitor chooses a clip; nothing autoplays.
- The player has play/pause, previous/next, seek and a live status message. It shows a clear message if a clip cannot be loaded.
- The vinyl graphic is drawn in CSS and stops spinning when the visitor prefers reduced motion.
- The copy is adapted from the article “How a JAMIX PRO UG set is built” in `assets/data/posts.js`; keep the two consistent if you edit one.

The playlist is normally managed from `/admin.html` — see section 5. The table below documents the 11 clips that shipped with the site and are used as the database seed and as the no-JavaScript fallback.

The current playlist uses these files (original names, copied into `assets/audio/`):

| Title | File |
|---|---|
| A Kafumbe Hotel | `A  Kafumbe hotel.mp3` |
| A & K Htel | `A & K htel.mp3` |
| A and K Hotel | `A and K hotel.mp3` |
| A and K Road | `A and K road.mp3` |
| Bright DJay | `bright djay.mp3` |
| Call 0763 87 | `call 0 7 6 3 8 7.mp3` |
| DJ Fred Senior | `Dj Fred senior.mp3` |
| For Booking, Call 0763 | `for booking call 0 7 6 3.mp3` |
| JK Entertainment DJs | `jk entertainment djays.mp3` |
| Mr Vibe | `Mr Vibe.mp3` |
| This JK Entertainment DJs | `this jk entertainment djays.mp3` |

The `~1` files in the source folder (`Mr Vibe~1.mp3`, `call 0 7 6 3 8 7~1.mp3`, `for booking call 0 7 6 3~1.mp3`) were treated as duplicate copies and are not listed. If they are different takes, add them to the playlist and update the clip count.

**Encoding:** the `data-src` values are percent-encoded, so the files can keep their original names with spaces and `&`. Do not rename a file without updating the matching `data-src`.

### Blog articles

All posts live in `assets/data/posts.js` inside `window.JAMIX_POSTS`. Each post supports:

```js
{
  slug: "unique-url-slug",
  title: "Article title",
  category: "Events" | "Music" | "Guides" | "Brand",
  date: "2026-10-24",
  readTime: "4 min read",
  excerpt: "Short summary for cards and search results.",
  image: "assets/images/example.jpg",
  imageAlt: "Describe the image for screen readers.",
  imageWidth: 1200,
  imageHeight: 1500,
  imagePosition: "center",
  tags: ["karaoke", "kampala"],
  body: [ /* paragraphs, headings and lists */ ]
}
```

To add a post, copy an existing object, change the slug and content, and add it to the array. The blog listing, search, category filters and article page all update automatically.

The Home page shows three **hard-coded** article cards. If you replace those posts, update `index.html` as well.

### Images

Images are already compressed and supplied in modern WebP plus JPG fallbacks where used. When adding new images:

- Export at roughly 1600px on the long edge for full-width photos, 800–1000px for portraits.
- Keep files under about 250 KB where possible.
- Always write meaningful `alt` text; use `alt=""` only for purely decorative images.
- Keep the same folder structure so relative paths continue to work.

The photography and brand artwork in `assets/images/` were supplied by the brand owner. Confirm you hold the rights to every image before commercial publication, especially images featuring other people or third-party logos (for example the event flyer and the Mr. Vibe mark).

### Colours and type

Design tokens are at the top of `style.css`:

```css
--navy-900: #060d1c;
--gold: #d4af37;
--blue: #2f6bff;
--cream: #f2ede1;
```

Changing those values updates most of the site consistently. Headings use Instrument Serif for accent words and Manrope for interface text, loaded from Google Fonts.

---

## 7. Honesty and placeholder notes

This build deliberately avoids inventing facts. Before publishing, review these items:

- **No testimonials, client logos, awards, staff numbers or years in business** were invented.
- **No fixed price list** is published. Services are marked “Quote on request” or “By arrangement”, and the pricing section explains why.
- **The Karaoke Night flyer** is presented as an event promotion. Its prices and details belong to the organiser (KTW Presents) and should be confirmed with them before being treated as current.
- **The carved-wood portrait** is labelled as creative artwork, not a client project.
- **Portfolio images** are brand and promotional material, not case studies. The page says so.
- **No audio, mixes or video are hosted** on this site. The home listening section links to official channels and never claims to be a player.
- **Social handles** need verification (see above).
- **The contact form** delivers through Formspree to `jamixproug@gmail.com`. Confirm that inbox is monitored, that Formspree notifications are not caught by spam filters, and that the free-plan quota suits the site's traffic.
- **The email address and WhatsApp number** should be confirmed as the official booking channels.

Anything you add later — reviews, prices, client names, statistics — should be accurate and have permission to be published.

---

## 8. Publishing with GitHub Desktop and Render

### Step A — put the site on GitHub

1. Install [GitHub Desktop](https://desktop.github.com/) and sign in.
2. Choose **File → Add local repository…**.
3. Select the folder `D:\jamix-pro-ug-website`.
4. If prompted that it is not a Git repository, choose **create a repository** here.
5. In the lower-left summary box, enter a commit message such as `Initial JAMIX PRO UG website`, then click **Commit to main**.
6. Click **Publish repository**.
7. Choose a name (for example `jamix-pro-ug-website`).
8. Untick **Keep this code private** only if you want the source to be public. A public repository is fine for a static brochure site; it must never contain secrets.
9. Click **Publish repository**.

### Step B — deploy on Render as a Static Site

1. Sign in at [render.com](https://render.com/) and connect your GitHub account.
2. Click **New +** → **Static Site**.
3. Select the repository you just published.
4. Use these settings:

   | Setting | Value |
   | --- | --- |
   | Name | `jamix-pro-ug` (or your preferred name) |
   | Branch | `main` |
   | Build Command | *(leave completely empty)* |
   | Publish Directory | `.` (a single full stop) |

5. Click **Create Static Site**.
6. Wait for the first deploy to finish, then open the `onrender.com` URL Render provides.
7. In Render, open **Settings → Custom Domain** if you want to use your own domain, and follow the DNS instructions.

The included `render.yaml` describes the same setup if you prefer a Blueprint deploy. Manual setup from the dashboard is the simplest route and works without the file.

**Why the publish directory is `.`:** `index.html` sits in the repository root, so Render must publish the root folder itself — not a subfolder such as `public` or `dist`.

### Step C — updating the live site

1. Edit files locally.
2. Open GitHub Desktop. Changed files appear in the left panel.
3. Write a short summary (for example `Update autumn events`) and click **Commit to main**.
4. Click **Push origin**.
5. Render detects the push and redeploys automatically. The live site updates in a minute or two.
6. If auto-deploy is off, open the site in Render and choose **Manual Deploy → Deploy latest commit**.

Before pushing, check the **Changes** tab in GitHub Desktop to make sure you are not committing `.env` files, passwords or private documents. The included `.gitignore` blocks common offenders, but it cannot protect a secret you force-add.

---

## 9. Testing checklist

Run through these before and after publishing:

- [ ] Every page loads with no 404s for CSS, JS, fonts or images.
- [ ] The browser console shows no errors.
- [ ] Desktop and mobile navigation reach every page; the mobile drawer closes with Escape and the close button.
- [ ] All internal links and footer links work, including `services.html#pricing` and `contact.html#booking`.
- [ ] Portfolio filters update the gallery and survive a page reload via `?filter=`.
- [ ] Gallery previews open, move with arrow keys and close with Escape.
- [ ] Blog search and category chips filter correctly; empty search shows the reset panel.
- [ ] The home listening section shows two columns on desktop, one on mobile, and its channel links open the right profiles.
- [ ] Article links open the right post and the related-post links work.
- [ ] The contact form blocks invalid submissions, focuses the first error and explains each error.
- [ ] A valid submission shows the sent confirmation and arrives at `jamixproug@gmail.com`.
- [ ] WhatsApp, email and social links open the intended destinations.
- [ ] Layout holds at 360px, 768px, 1024px and 1440px wide.
- [ ] With JavaScript disabled, core pages and article links still work (the blog listing falls back to a plain list).
- [ ] Keyboard focus is visible throughout, including on the cream form card.
- [ ] `/admin.html` shows the setup checklist while Supabase is unconfigured, and the sign-in form once it is.
- [ ] Signing in with an allowlisted account lists the clips; an account without an `admins` row is refused and signed out.
- [ ] Adding, renaming, hiding, reordering and deleting a clip all survive a page reload and show on the home player.

---

## 10. Technical notes

- **No build step.** HTML, CSS and JS are served as written.
- **Relative paths.** All local links are relative, so the site works at a domain root or a subpath.
- **Fonts.** Google Fonts is the only external request on public pages (plus Supabase reads for the playlist when configured). If it is blocked, the site falls back to system fonts and remains usable.
- **Images.** WebP is used where a `<picture>` element is present, with a JPG fallback for older browsers.
- **Accessibility.** Skip link, semantic landmarks, visible focus styles, labelled form fields, error messages announced via live regions, keyboard-operable filters and lightbox, `prefers-reduced-motion` support.
- **No analytics or tracking** is installed. Add analytics only with the owner's consent and, where required, an appropriate cookie notice.
- **No site backend of its own.** The static site stores nothing. A submitted enquiry is posted to Formspree and forwarded to the booking inbox; other contact happens only when a visitor chooses WhatsApp or email.
- **Drops data.** Playlist titles and order live in Supabase (Postgres), audio added through the dashboard lives in Supabase Storage, and all writes are gated by row-level security. The public player only ever reads published rows.

---

## 11. Ownership

Site code and layout were produced for JAMIX PRO UG. Brand artwork and photography were supplied by the brand owner; confirm rights and permissions before commercial use. Third-party names and logos that appear in event artwork remain the property of their respective owners.

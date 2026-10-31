# JAMIX PRO UG — Website

A fast, responsive, multi-page static website for **JAMIX PRO UG**, a music, DJ and lifestyle brand based in Kampala, Uganda.

Built with plain HTML, CSS and vanilla JavaScript. No frameworks and no build step. The public pages load only Google Fonts; the private admin page additionally loads the pinned Supabase JS library from jsDelivr.

---

## 1. What is included

| Page | File | Purpose |
| --- | --- | --- |
| Home | `index.html` | Hero, brand introduction, “The sound” set philosophy and listening links, uploads, videos, services preview, selected work, latest journal posts, booking call to action |
| About | `about.html` | Story, mission, vision, core values and brand statement |
| Services | `services.html` | DJ performance, karaoke nights, event hosting, brand collaborations, process and pricing/quote policy |
| Portfolio | `portfolio.html` | Filterable gallery with keyboard-accessible image previews |
| Live Radio | `radio.html` | Station details, now playing, live stream player with play/pause and volume |
| Blog | `blog.html` | Searchable, category-filtered article listing |
| Article | `article.html` | Single article template driven by `assets/data/posts.js` (`article.html?post=slug`) |
| Contact | `contact.html` | WhatsApp, email, location, social links and an enquiry form with validation |
| Sign in | `login.html` | Email and password sign-in, with links to registration and password recovery (`noindex`) |
| Register | `register.html` | Creates a Supabase Auth account and asks the user to confirm by email (`noindex`) |
| Forgot / reset password | `forgot-password.html`, `reset-password.html` | Sends a single-use reset link and sets the new password (`noindex`) |
| My account | `account.html` | Private dashboard: display name, picture, email status, joining date and sign out (`noindex`) |
| Profile & security | `profile.html` | Edit display name, upload or remove the profile picture, change the password (`noindex`) |
| Media admin | `admin.html` | Private dashboard to manage drops, songs, gallery photos, videos, radio and registered users (not linked in navigation, `noindex`) |
| Not found | `404.html` | Friendly fallback page for broken or old links |

Supporting files:

- `style.css` — full design system, layout, components, responsive rules and reduced-motion support.
- `admin.css` — admin-only layout, built on the same tokens.
- `script.js` — navigation, scroll reveals, portfolio filters, lightbox, blog search/filter, article rendering, drops player, uploaded-song player, uploaded-video player, live radio player, uploaded-photo gallery, form validation and Formspree submission.
- `admin.js` — Supabase sign-in and drops, songs, photos, videos, radio settings and registered-user management for `admin.html`.
- `assets/data/posts.js` — all article content in one editable file.
- `js/supabase.js` — Supabase project URL and publishable key (older projects call it the anon key).
- `js/auth.js` — shared session helpers for the account pages: client creation, friendly error text, password checks, profile loading and the signed-in guard.
- `js/auth-pages.js` — sign-in, registration, forgot-password and reset-password behaviour.
- `js/account.js` and `js/profile.js` — the account dashboard and the profile, picture and password forms.
- `supabase/schema.sql` — tables, security rules, storage buckets and seed data for a fresh install.
- `supabase/videos.sql` — the standalone videos migration for a project that already has `schema.sql` installed.
- `supabase/radio.sql` — the standalone live radio migration for a project that already has `schema.sql` installed.
- `supabase/accounts.sql` — the standalone accounts migration: `profiles`, its security rules and grants, the `avatars` bucket and the admin suspension function.
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
├── radio.html
├── blog.html
├── article.html
├── contact.html
├── login.html
├── register.html
├── forgot-password.html
├── reset-password.html
├── account.html
├── profile.html
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
├── js/
│   ├── supabase.js
│   ├── auth.js
│   ├── auth-pages.js
│   ├── account.js
│   └── profile.js
├── supabase/
│   ├── schema.sql
│   ├── videos.sql
│   ├── radio.sql
│   └── accounts.sql
└── assets/
    ├── audio/            (11 MP3 clips)
    ├── data/
    │   └── posts.js
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

## 5. Media admin (Supabase)

`admin.html` is a private dashboard for the site's media, live radio and registered users, split into six tabs:

- **Drops** — the home-page **Drops & IDs** playlist: add a clip (uploading the MP3), rename, reorder, hide and delete.
- **Songs** — full tracks with title, artist, optional cover image and a public player in the home listening section.
- **Photos** — gallery images that appear in the portfolio grid under an **Uploads** filter.
- **Videos** — uploaded MP4/WebM clips with title, description and optional thumbnail, published in the home **Videos** section.
- **Radio** — the station name, tagline, stream URL, now playing text, logo and an on-air switch for `radio.html`.
- **Users** — everyone who has registered on the site, with email, display name and joining date, plus suspend and restore.

Changes appear on the public site within a minute — no code edit or redeploy.

The page is deliberately not linked in the navigation. It is `noindex, nofollow` and disallowed in `robots.txt`. That keeps it out of search results; the real protection is the database rules.

### One-time setup

1. Create a free project at [supabase.com/dashboard](https://supabase.com/dashboard).
2. Go to **Authentication → Users → Add user**. Use `jamixproug@gmail.com` with a strong password, and confirm the user. Do this before the next step: the schema allowlists the account by looking it up.
3. Open **SQL Editor**, paste all of `supabase/schema.sql` and click **Run**. This creates the `drops`, `songs`, `photos`, `videos` and `radio_settings` tables, the `admins` allowlist, the security policies, four public storage buckets (`drops`, `songs`, `photos`, `videos`), the 11 existing clips and your admin row.
4. Go to **Project Settings → API Keys** and copy the **Project URL** and the **publishable** key (older projects label it **anon public**) into `js/supabase.js`. This repository is already configured for the live project.
5. Commit and push. Render redeploys and `/admin.html` switches from the setup checklist to the sign-in form.

If the schema was run before the user existed, simply run it again — it is idempotent and will add the missing `admins` row. Run it again after pulling this update as well: it adds the `videos` table, the `radio_settings` table and their buckets without touching existing media. If you prefer not to re-run the whole file, run `supabase/videos.sql` and/or `supabase/radio.sql` instead; each applies only its own changes.

Leave the URL blank to go back to the previous behaviour: the player uses its built-in 11 clips and `admin.html` shows the setup checklist.

### Using the dashboard

- Sign in at `https://<your-site>/admin.html`, then choose the **Drops**, **Songs**, **Photos**, **Videos** or **Radio** tab.
- **Drops → Add a clip** uploads an MP3 to the `drops` bucket and publishes it at the end of the playlist. MP3 only, 10 MB maximum — clips of 5–15 seconds work best.
- The arrow buttons change the order, **Rename** edits the title inline, **Hide** removes a clip from the player without deleting it.
- **Songs → Add a song** uploads audio to the `songs` bucket (MP3 up to 25 MB) and an optional cover to `photos`. The home player shows the cover, title, artist and play/pause controls.
- **Photos → Add a photo** uploads an image to the `photos` bucket (JPG, PNG or WebP up to 8 MB) and adds it to the portfolio gallery.
- **Videos → Add a video** uploads an MP4 or WebM file to the `videos` bucket (up to 50 MB) and an optional thumbnail to `photos`. The home **Videos** section shows cards with the thumbnail, title and description, and plays the selected clip in an HTML5 player.
- **Radio → Station settings** edits the name, tagline, direct stream URL, now playing line and logo, and switches the station **on air**. The public `radio.html` page reads the same row. Turning off-air disables play and shows “Off air”.
- Song, photo, video and radio-logo uploads show a live progress bar. Each row has **Edit**; videos also have **Publish/Unpublish**.
- **Delete** removes the row and the uploaded files. Clips that came from `assets/audio/` keep their file in the repository; only the database row is removed.
- The public players and gallery read published rows from Supabase. If the database is unreachable the drops player silently falls back to the hard-coded list, and the songs and uploads sections stay hidden, so visitors never see an empty section. The videos section explains that videos could not load instead of showing a broken player. The radio page likewise shows a clear message and keeps play disabled when the station details cannot be loaded.

### Visitor accounts (Supabase Auth)

Registered users get a private profile. Everything runs on Supabase Auth — the site never stores or handles a password itself.

Pages: `login.html`, `register.html`, `forgot-password.html`, `reset-password.html`, `account.html` (dashboard) and `profile.html` (display name, picture, password). They are linked from the account icon in the header, item **09 Account** in the mobile menu and the footer **Explore** list, and all six are `noindex, nofollow`.

To switch accounts on:

1. Run `supabase/accounts.sql` in the SQL Editor. It adds the `profiles` table, the two `auth.users` triggers, the row-level-security rules and column grants, the `admin_set_user_suspended()` function and a new public `avatars` bucket. It changes nothing in `drops`, `songs`, `photos`, `videos`, `radio_settings` or `admins`, and it is safe to re-run.
2. In **Authentication → Sign In / Providers → Email**, keep **Confirm email** on. Registration then sends a confirmation link and the account cannot sign in until it is opened.
3. In **Authentication → URL Configuration**, set **Site URL** to `https://jamix-pro-ug-website3.onrender.com` and add the same address to the redirect allowlist. Without this the confirmation and reset links do not come back to your site.
4. Confirm the links themselves: `.../login.html?verified=1` for new sign-ups and `.../reset-password.html` for password resets.

How it behaves:

- A new account signs up, confirms by email, then signs in. The `profiles` row is created by the trigger on `auth.users`, so no insert privilege is given to visitors.
- On the profile page a user can change their display name, upload or remove a picture (JPG, PNG or WebP up to 5 MB, stored under their own id in the `avatars` bucket) and change their password — the current password is required first.
- Email address, joining date and the suspension flag cannot be rewritten by the user, even inside their own row: `revoke`/`grant` limits updates to `display_name` and `avatar_path`.
- Only signed-in users can read `profiles` at all, and only their own row; admins read every row. Anonymous requests are refused outright.
- Admins see the list in **Users** and can suspend or restore an account. Suspending blocks the profile update policy and the site shows a clear "account suspended" message on sign-in. It does not delete anything, and only an admin — never the user themselves — can change it.

Two limits worth knowing: passwords and tokens live in Supabase Auth and are never readable from this site, and **deleting** a registered account is not exposed in the dashboard because that requires the `service_role` key. Delete a user in **Authentication → Users** if removal is really needed; the profile row follows it through `on delete cascade`.

### Security notes

- The **publishable** key (formerly anon) in `js/supabase.js` is public by design. Every write is checked by row-level security against the `admins` table.
- **Never** put the `service_role` key in this repository or in the browser. It bypasses all rules.
- To revoke someone's access, delete their row from `public.admins`.
- Free Supabase projects pause after a period of inactivity. While paused, the player falls back to the built-in clips and the dashboard cannot sign in; open the Supabase dashboard to wake it. Check the current free-tier limits before relying on storage for a large library.

### If something breaks

| Symptom | Likely cause |
|---|---|
| Setup checklist stays visible | `js/supabase.js` still has blank values, or the deploy did not pick up the change |
| "This account is not on the admin list" | The user exists but has no `admins` row — usually the schema ran before the user was created. Re-run `schema.sql` |
| Upload fails with a policy error | `schema.sql` was not run in full, or the storage policies were skipped |
| Songs, Photos or Videos tab says the table is missing | The older schema is still installed — run `supabase/videos.sql` for videos, or re-run `schema.sql` to add every table and bucket |
| Radio tab says the table is missing | `supabase/radio.sql` has not been run. Run it (or re-run `schema.sql`) — it only adds `radio_settings` |
| Radio page says the station is off air | In the **Radio** tab, add a stream URL and tick **Show the station as on air**, then save |
| Radio play button stays disabled | No stream URL is published, the station is off air, or the station details could not load. Check the status line under the controls |
| Player shows the old 11 clips | Supabase unreachable, no published rows, or the key is wrong — check the browser console |
| Uploaded song has no cover or will not play | The cover is optional; playback needs an MP3 in the `songs` bucket and a published row. Check the console for the failing URL |
| Video upload is rejected as too large | The limit is 50 MB, matching the Supabase Free plan. Compress the clip or shorten it; the bucket and the dashboard enforce the same limit |
| Account pages say the migration may not have been applied | `supabase/accounts.sql` has not been run — the `profiles` table does not exist yet |
| Sign-up never receives a confirmation email | Turn on **Confirm email**, then check the spam folder. The resend button on `register.html` waits 30 seconds between requests |
| Confirmation or reset link opens the wrong site | **Site URL** or the redirect allowlist in **Authentication → URL Configuration** does not match the deployed address |
| Users tab says it could not load users | Run `supabase/accounts.sql`. If it still fails, the signed-in account is not in the `admins` allowlist |
| Profile picture upload rejected | `accounts.sql` creates the `avatars` bucket — if it is missing the upload fails. Also check the file is JPG, PNG or WebP and under 5 MB |

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

The `#music` section explains how a JAMIX PRO UG set is built and points visitors to the official channels. It also contains a **Drops & IDs** player for short venue tags, booking lines and shout-outs, and a **Songs** player for full tracks uploaded from the dashboard.

- The player asks Supabase for the published clips, in playlist order, once the page loads. If Supabase is unconfigured or unreachable it keeps the 11 clips hard-coded in `index.html`, so the section never breaks.
- The original clips live in `assets/audio/`. New clips uploaded through `admin.html` go to Supabase Storage instead.
- Playback only starts when a visitor chooses a clip; nothing autoplays.
- The player has play/pause, previous/next, seek and a live status message. It shows a clear message if a clip cannot be loaded.
- The vinyl graphic is drawn in CSS and stops spinning when the visitor prefers reduced motion.
- The copy is adapted from the article “How a JAMIX PRO UG set is built” in `assets/data/posts.js`; keep the two consistent if you edit one.
- The **Songs** panel is hidden until at least one published song exists. It lists cover, title and artist, and uses a single audio element with play/pause — one song plays at a time and nothing autoplays.
- The **Videos** section links from the main navigation as `index.html#videos`. It shows published videos as responsive cards with thumbnail, title and description; choosing one reveals an HTML5 `<video>` player and starts only that clip. The section shows a loading message, a friendly empty message when nothing is published, and an error message if Supabase cannot be reached. Video playback pauses any active drops or song audio, and starting audio pauses the video.
- The **Live Radio** page (`radio.html`) is the only place the station stream plays. It shows the station name, tagline, logo and now playing line from Supabase, plus play/pause, a volume slider and a mute button. Nothing starts automatically; the stream URL is only requested after a visitor presses play. The page reports “Off air” when the station is switched off in the dashboard, and explains when the stream is offline or slow instead of spinning forever. The station row is refreshed quietly every minute while the tab is visible.

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
- Photos uploaded through `admin.html` are not stored in the repository; they live in Supabase Storage and appear in the portfolio grid under the **Uploads** filter. The curated gallery still comes from `assets/images/`.

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
- **Audio and video are limited to what the owner uploads.** The site hosts the 11 short drops, any songs added through the dashboard, and any videos published through the Videos tab. The listening section links to the official channels for full mixes and other content.
- **The live radio stream is not hosted on this site.** The Radio tab stores whatever stream URL the owner enters; the player plays that URL directly. The station name, tagline and now playing line are display text typed by the owner — the player does not read track metadata from the stream, so keep them updated manually.
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
- [ ] The Drops, Songs, Photos, Videos, Radio and Users tabs switch cleanly and keep the layout intact on a phone.
- [ ] Adding, renaming, hiding, reordering and deleting a clip all survive a page reload and show on the home player.
- [ ] Uploading a song shows progress, then the song appears in the home player with cover, title, artist and working play/pause.
- [ ] Uploading a photo shows progress, then the photo appears in the portfolio under **Uploads** and opens in the lightbox.
- [ ] Uploading a video shows progress, then its card appears in the home **Videos** section and plays in the HTML5 player.
- [ ] Editing a video updates its title and description; **Unpublish** removes the card from the public site and **Publish** brings it back.
- [ ] Deleting a song, photo or video removes the row and its uploaded files, and updates the public site after a refresh.
- [ ] An oversized or wrong-type file is rejected with a clear message before upload.
- [ ] The **Videos** link appears in the desktop navigation, mobile menu and footer on every page, and the section shows friendly loading, empty and error states.
- [ ] Saving the **Radio** tab updates the name, tagline, now playing line and logo on `radio.html`.
- [ ] Pressing play on `radio.html` starts the stream; pause, the volume slider and mute all work, and the status line says “Live now”.
- [ ] With **Off air** ticked off, the public page shows “Off air” and play is disabled. An invalid stream URL is rejected in the dashboard.
- [ ] The **Radio** link appears in the desktop navigation, mobile menu and footer on every page.
- [ ] When the stream URL is unreachable, the page shows a clear offline message rather than loading forever.
- [ ] Registering with a new email sends a confirmation link, the resend button works after the 30 second wait, and signing in before confirming says the email still needs confirming.
- [ ] The confirmation link opens `login.html?verified=1` on this site and the account signs in.
- [ ] Signing in takes the user to `account.html`, which shows their name, email, email status and joining date, and works on a phone and on a desktop.
- [ ] Signing out returns to the sign-in page with a "signed out" message, and opening `account.html` or `profile.html` afterwards bounces back to `login.html`.
- [ ] Changing the display name saves and survives a reload; a name over 60 characters is refused.
- [ ] Uploading a JPG, PNG or WebP picture updates the avatar on both account pages; an oversized or unsupported file is rejected before upload, and **Remove picture** returns to the default mark.
- [ ] Changing the password requires the current one, rejects a mismatch or a repeated password, and the new password then signs in.
- [ ] **Forgot password** sends a link for a registered address and shows the same neutral message for an unregistered one.
- [ ] The reset link opens `reset-password.html` in recovery mode and saves; a stale or used link shows the "no longer valid" panel instead of a blank form.
- [ ] The **Users** tab lists each account with email, display name and joining date, marks admin rows, and suspend/restore both ask for confirmation and survive a reload.
- [ ] A suspended account cannot edit its profile; the sign-in page explains the suspension rather than signing it in.
- [ ] An anonymous request to `/rest/v1/profiles` is refused, and no password, token or `service_role` key appears in the repository or the browser console.

---

## 10. Technical notes

- **No build step.** HTML, CSS and JS are served as written.
- **Relative paths.** All local links are relative, so the site works at a domain root or a subpath.
- **Fonts.** Google Fonts is the only external request on public pages (plus Supabase reads for the playlist when configured). If it is blocked, the site falls back to system fonts and remains usable.
- **Images.** WebP is used where a `<picture>` element is present, with a JPG fallback for older browsers.
- **Accessibility.** Skip link, semantic landmarks, visible focus styles, labelled form fields, error messages announced via live regions, keyboard-operable filters and lightbox, `prefers-reduced-motion` support.
- **No analytics or tracking** is installed. Add analytics only with the owner's consent and, where required, an appropriate cookie notice.
- **No site backend of its own.** The static site stores nothing. A submitted enquiry is posted to Formspree and forwarded to the booking inbox; other contact happens only when a visitor chooses WhatsApp or email.
- **Media data.** Drops, songs, photos and videos live in Supabase (Postgres); audio, images and videos added through the dashboard live in the `drops`, `songs`, `photos` and `videos` Storage buckets. Video thumbnails and the radio logo are stored in the `photos` bucket. The live radio settings live in the single-row `radio_settings` table. All writes are gated by row-level security. Public pages only ever read published rows and the public station row.
- **Uploads without the SDK.** File uploads use `XMLHttpRequest` to the Storage REST endpoint so the dashboard can show real progress; reads, sign-in and row writes use the Supabase client. One shared client is created in `admin.js` from `js/supabase.js`.

---

## 11. Ownership

Site code and layout were produced for JAMIX PRO UG. Brand artwork and photography were supplied by the brand owner; confirm rights and permissions before commercial use. Third-party names and logos that appear in event artwork remain the property of their respective owners.

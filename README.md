# Weldon Spring Automotive & Tire — Node.js

A server-rendered Node.js website for the existing SiteGround/GitHub `wsa` application. Preserves the shop's logo, red/charcoal design, photographs, 24 pages, 11 detailed service pages, search, local SEO, guest Wi-Fi mentions, and appointment links. No service pricing is published.

The current app replaces the earlier WordPress theme. It needs no PHP, WordPress, MySQL, Python, or database. The previous implementation remains in Git history at `484b249`.

## SiteGround deployment

Use the existing GitHub deployment connection:

- Repository: `blueskymarketingstl/wsa`
- Branch: `main`
- Application/root directory: repository root
- Node version: **22**
- Package manager: **npm**
- Build command: **`npm run build`** (the UI may show an `npm` prefix and `run build` in the input)
- Start command, if requested: **`npm start`**
- Framework, if required by the dashboard: **Express** or the generic **Node.js** preset
- Listening address: `0.0.0.0`, using the platform's `PORT` variable

The build copies the deployable Node server, content, templates, and assets to `dist/`. `npm start` launches `dist/server.js`. Dependencies needed for building and serving are production dependencies; `npm ci --omit=dev` is supported. Do not configure this as static-only hosting: the server handles HTML, search, and inquiries.

A push to `main` is intended to trigger the user's existing auto-deployment connection. GitHub push success alone does not confirm SiteGround's build, startup, domain mapping, or email delivery. Verify those in the deployment logs and on the actual app URL. `/health` returns app version, build fingerprint, and mail configuration status without credential values.

## Environment variables

Add values through **SiteGround's Environment Variables** section. Do not commit credentials or put them in chat.

| Name | Purpose |
| --- | --- |
| `SITE_URL` | Final public origin for canonical links, social previews, and sitemap, e.g. `https://weldonspringautoandtire.com`. Change to the intended domain when mapping is confirmed. |
| `NOINDEX` | `true` for staging, `false` for approved production indexing. |
| `INQUIRY_EMAIL` | Defaults to `michael@blueskymarketingstl.com`. |
| `SMTP_HOST` | Your email provider's outgoing server hostname. |
| `SMTP_PORT` | Defaults to `465` with TLS; `587` requires STARTTLS. |
| `SMTP_USER` | Sending mailbox username. |
| `SMTP_PASS` | Sending mailbox password or app password, entered securely. |
| `MAIL_FROM` | Plain email address authorized for that sending account. |
| `CSRF_SECRET` | Optional stable random security key, recommended for multiple instances. A process-local key is generated when absent. |
| `BOOKING_URL` | Optional replacement for the original site's appointment URL. HTTPS required. |

The app works without SMTP settings, showing direct email/call options and an unavailable online form. It **does not** display fake successful submissions. Once configured, messages are handed to SMTP with the visitor email in `Reply-To`, an authenticated sender in `From`, and the configured recipient. Confirm inbox delivery and reply behavior before relying on inquiries. Maintain the sending domain's SPF/DKIM configuration.

The form has server validation, short-lived signed CSRF protection, a same-site HTTP-only cookie, a honeypot, a one-per-minute successful-submission cooldown, and a bounded in-memory request limiter. Contact responses are never cached. Inquiry content is not written to logs or a database. The limiter is per process; use shared rate limiting or a provider firewall for multi-instance deployments with substantial traffic.

`.env.example` lists the settings. Local `.env` files are ignored by Git and are not loaded automatically; use Node 22's `--env-file` or exported variables when developing.

## STEER / AutoOps booking

The shop-supplied AutoOps portal script is the last element inside `<body>` on every page. Its browser-side configuration is in `content/autoops.json`: public widget key, red loading color `eb1b23`, and the requested Google Analytics integration enabled. The privacy page describes this integration.

Appointment links in the header, homepage, footer, service sidebar, booking page, and mobile bar call `AutoOps.show()` when the vendor script is ready. Links retain their original destinations: if the script is slow, blocked, or fails, visitors can still reach `/book/` and the original external appointment link. Modifier-clicks and opening links in a new tab retain normal browser behavior.

Browser tests stub the vendor script to verify portal calls and fallback behavior; they never create a real appointment. Verify the real portal and available appointment times on the deployed site before launch. The previous `content/steer-embed.html` option remains available for a separately supplied booking-page embed, but is not needed for the global AutoOps script.

## Development

Use the existing isolated `/workspace/wsa` checkout. Do not create a Git worktree unless explicitly requested.

```bash
cd /workspace/wsa
bash tools/setup.sh
npm run dev
```

Node 22+ is required. The local default port is 3000. To exercise production:

```bash
npm ci
npm run build
npm start
```

Checks:

```bash
npm run lint
npm test
```

The browser tests start their own production server on port 9402 and use system Chromium (`CHROMIUM_PATH`, default `/usr/bin/chromium`). Server tests use injected mail transports and do not send messages. Tests cover all 24 pages, real 404s, redirects, search, metadata, schema, sitemap/robots, mobile navigation, viewport overflow, accessibility, contact protection, failure handling, and successful mail handoff with the configured recipient. Review screenshots are in `dist/screenshots/`.

## Editing content and SEO

- `content/pages.json`: page titles, descriptions, HTML body content, service keywords, and image references. This is the content source; there is no WordPress dashboard in this app.
- `views/home.ejs`: designed homepage sections.
- `views/partials/`: shared header, footer, and contact form.
- `public/site.css`, `public/site.js`, `public/assets/`: responsive styles, interactions, and local assets.
- Existing paths retained: `/tires/`, `/auto-repair/`, `/about/`, `/contact/`, `/coupons/`, `/blog/`, `/financing/`, `/napa-warranty/`, `/tips-advice/`, `/privacy/`, `/sitemap/`.
- Service detail pages live under `/auto-repair/`.
- Server-rendered titles, descriptions, canonicals, social previews, and AutoRepair/Service structured data are present without client JavaScript. XML sitemap: `/sitemap.xml`; `/wp-sitemap.xml` is retained as an alias. Staging indexing is controlled by `NOINDEX=true`.

Before final launch, confirm shop facts and warranty terms, verify the live STEER portal and actual inquiry delivery, map the final domain, preserve URL redirects, approve indexing, and submit the sitemap through the owner's Search Console account. The privacy policy identifies the temporary inquiry recipient; update both when it changes.

Original reference content and source notes are in `research/`. Original logo and photos were reused with the user's authorization. Third-party brand marks remain their owners' property.

# Weldon Spring Automotive & Tire

A custom WordPress website for SiteGround, using the existing shop logo, red/charcoal palette, shop photography, and tire/service artwork. Built for desktop and mobile with service search, educational repair pages, local SEO, contact inquiries, and configurable appointment booking. No service pricing is published.

## Run locally

Requirements: Node 24.18 or later, npm 11.16 or later (the setup script invokes the pinned npm), Python 3, Git, and Chromium for browser tests.

```bash
cd /workspace/wsa
bash tools/setup.sh
npm run dev
```

The local WordPress server listens on port 9400. It uses PHP 8.3 WebAssembly and SQLite, with WordPress 7.1.3 from the official WordPress GitHub mirror at commit `fc9832bef919c2a08541248db23af90d14ffb082`. The setup script checks that pin on every run. The local environment needs GitHub and npm registry access; it does not require Docker, MySQL, or a global PHP installation. TLS and package integrity checks remain enabled.

This task already has an isolated checkout. Use the existing `/workspace/wsa`; do not create a Git worktree unless explicitly requested.

On first activation, the theme creates its starter pages. Repeated setup preserves existing page content and shop settings. Local WordPress files and its database persist in `.runtime/`, which is ignored by Git. Do not delete it if you need to retain local content edits. Local mail is deliberately disabled, local indexing is disabled, and no live host is modified.

```bash
npm test
npm run build
```

Tests use system Chromium (`/usr/bin/chromium` by default). Set `CHROMIUM_PATH` if needed. Tests exercise the real local WordPress server; start it before running tests. They cover every seeded page, SEO metadata, missing-page responses, service search, mobile menus and overflow, WCAG checks, form validation, successful mail handoff using a local-only stub, mail failure, rate limiting, and booking fallback. The stub never sends an email. Screenshots are written to `dist/screenshots/`.

## Install on SiteGround

1. Create a **staging WordPress installation**, or a separate staging site for the replacement. Back up the existing live site. Use a currently supported WordPress release, PHP 8.3+, and SiteGround's normal MySQL database. The local SQLite adapter is **not** included in the theme package.
2. Run `npm run build`. In WordPress, open **Appearance → Themes → Add New → Upload Theme**, upload `dist/weldon-spring-theme.zip`, and activate it.
3. Activation creates the starter pages and assigns Home as the front page. Pages with an existing matching URL are preserved, not overwritten. Activation sets the site name, timezone, and `/%postname%/` permalinks, and refreshes rewrite rules. Check Settings → Reading and Settings → Permalinks afterward. Review conflicting existing pages in staging before proceeding.
4. Go to **Appearance → Shop Settings**. Inquiry recipient defaults to **michael@blueskymarketingstl.com**. The booking link defaults to the original site's appointment URL. Paste the **trusted STEER embed code** when supplied; this replaces the booking-link card on `/book/`. Script-containing embeds require an administrator with `unfiltered_html` capability. Keep the HTTPS booking URL as a fallback.
5. Set up authenticated email through SiteGround or your chosen SMTP provider. Configure SPF/DKIM as appropriate for the sending domain. This theme uses WordPress `wp_mail()` with the visitor email in `Reply-To`; it does not impersonate the visitor's address as sender. Send a real inquiry and verify inbox delivery and replies. A successful mail handoff alone does not prove delivery. Do not send passwords or SMTP credentials in chat or put them in the repository.
6. Exclude **`/contact/` and `/wp-admin/admin-post.php`** from full-page caching so form nonces stay fresh. Do not cache POST requests. The form has required-field and server-side validation, a nonce, honeypot, and a one-per-minute IP-based limit. The theme does not save inquiry content in the WordPress database. It sends the inquiry to the configured recipient.
7. Review all page content, business details, warranty/financing terms, photography, and privacy policy with the shop. Original content is preserved in `research/` text references. Editorial changes use manufacturer-specific maintenance intervals rather than universal advice. Financing dollar thresholds and dated coupon graphics are intentionally excluded because the brief requires no pricing. No reviews, ratings, or team members have been invented.
8. Confirm the final production domain, HTTPS, and redirects from the former host. Preserve the existing URLs listed below. If a URL changes, add a 301 redirect using SiteGround or a redirect plugin. Keep staging set to discourage search indexing; enable indexing on production only when approved to launch.
9. Check the WordPress XML sitemap at `/wp-sitemap.xml` after production indexing is enabled. Submit it through the shop's Google Search Console account, and confirm the Google Business Profile points to the final domain. The theme includes descriptions, canonicals through WordPress core, social previews, AutoRepair/Service structured data, local contact details, and service cross-links. If Yoast, Rank Math, or AIOSEO is active, theme metadata is suppressed to avoid duplicates; configure that plugin's metadata/schema before launch.
10. Test a real mobile device, a desktop, every main link, inquiry delivery, and the STEER appointment journey on staging. After review, publish through SiteGround and verify the live domain. **This repository has not been deployed to SiteGround.**

## Content and pages

Existing routes retained: `/tires/`, `/auto-repair/`, `/about/`, `/contact/`, `/coupons/`, `/blog/`, `/financing/`, `/napa-warranty/`, `/tips-advice/`, `/privacy/`, `/sitemap/`.

New route `/book/` centralizes appointments. Eleven child pages under `/auto-repair/` cover brakes, suspension/steering, oil changes, diagnostics, heating/A/C, transmission, exhaust/emissions, electrical/battery, preventative maintenance, alignment/tire care, and wheels/lift kits. These are real WordPress pages with editable content, not just client-side routes.

Page titles, descriptions (the Excerpt field, available through the page editor's options), and body content can be edited in WordPress. The homepage's designed sections live in `front-page.php`; the hero and service-card design are part of the theme. Initial content lives in `inc/pages.json`; changing it affects newly seeded pages, not existing edited pages. Card summaries derive from page content.

The inquiry recipient is temporary; update it and the privacy policy together when the shop's permanent recipient is confirmed. The existing shop email remains visible as a direct shop contact. The site includes free guest Wi-Fi references throughout, per the brief. The neighborhood graphic is decorative; it is not presented as an accurate map. The directions links open Google Maps with the shop address.

## Launch items still requiring the owner

- STEER embed code and a verified end-to-end booking test (the original booking link works as the current fallback).
- SiteGround staging/WordPress access through a secure method, plus approval of the final content and layout.
- Authenticated sending configuration and a real inbox-delivery test.
- Final-domain/DNS migration, redirects, and production indexing approval.

## Source and licensing

Business content and assets were obtained from the owner-supplied `weldonspringautoandtire.com` reference on October 26, 2026. See `research/SOURCES.md`. Permission to reuse these materials was provided in the task; third-party brand marks remain the property of their owners. Theme source is GPL-2.0-or-later. External dependencies retain their own licenses.

---
title: "Cookie DevTools"
summary: "The cookie editor built for developers: safe edits, import with preview, JWT decoding, protect and block, side panel and DevTools panel. No ads, no tracking."
weight: 5
ShowReadingTime: false
---

A cookie editor and cookie manager built for developers. See, edit, import, export, decode and protect the cookies of the site you're working on — in the toolbar popup, Chrome's side panel, or a Cookies panel in DevTools. No ads. No tracking. Nothing you do here leaves your device.

## Edit cookies safely

- Every cookie for the current site, including partitioned (CHIPS) cookies set by embedded frames
- Checks for what the browser would reject before you save: SameSite=None without Secure, `__Host-` and `__Secure-` prefix rules, the 4096-byte limit, invalid characters
- Edits never destroy the original — if the browser refuses a change, the cookie stays as it was
- Host-only, partition and exact expiry are kept unless you change them; Delete All asks first, and deletes can be undone

## Decode, import and export

- **Value inspector** — JWT header and payload with `exp`/`iat`/`nbf` as dates (decoded on your device, never verified or sent anywhere), URL-encoded, Base64 and JSON values
- **Import** JSON from other cookie editors, Playwright or Puppeteer; a Netscape `cookies.txt`; `Set-Cookie` or `Cookie` headers; or a curl command — with a preview of what will be created, replaced or skipped and why
- **Export** to JSON, cookies.txt (curl/wget), a curl command or a Cookie header — copy or download, for every cookie or just the ones you select

## Protect, block and watch

- **Protect** a cookie: when a site changes or deletes it, your saved value is put back
- **Block** a cookie: it is deleted whenever a site sets it again
- **Live change feed** for the page you're on, plus optional recording (off until you turn it on) with the cause of every change

## Built for daily developer work

- Environment profiles — save a site's cookies as "staging-admin" and switch back in one click
- Sort by name, domain, expiry or size; filter by Secure, HttpOnly, Session, Partitioned or SameSite=None
- Side panel that follows your tabs, and a Cookies panel in DevTools that follows the inspected page
- Keyboard friendly, dark mode, WCAG AA contrast

## Permissions, plainly

Chrome shows "Read and change all your data on all websites" when you add Cookie DevTools, because an extension can only read and write a site's cookies if it has access to that site. Cookie DevTools uses that access only for cookies — it never reads page content, never injects scripts, and never sends data anywhere. See the [privacy policy](/privacy/cookie-devtools).

## Also from Brightbar

- **[Browser API Client](/products/browser-api-client/)** — Test APIs right from your browser. Use cookie exports for authenticated requests.
- **[DevTools Pro](/products/devtools-pro/)** — CSS inspector, measurements, accessibility audit and more in one extension.
- **[JSON Viewer Pro](/products/json-viewer-pro/)** — Auto-format JSON responses with tree view, search, and dark mode.

## Links

- [Install from Chrome Web Store](https://chromewebstore.google.com/detail/cookie-devtools/pgohmdladleifefhobididhhlmjcknjl)
- [Source on GitHub](https://github.com/brightbar-dev/cookie-devtools)
- [Privacy Policy](/privacy/cookie-devtools)

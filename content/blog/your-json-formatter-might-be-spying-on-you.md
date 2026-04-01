---
title: "Your JSON Formatter Extension Might Be Spying on You"
date: 2026-04-01
draft: true
tags: ["chrome-extensions", "privacy", "json", "security"]
summary: "A popular JSON formatter extension was caught injecting checkout popups and tracking user locations. Here's what happened and what to use instead."
---

In early 2026, one of the most popular JSON formatter extensions for Chrome — installed by millions of developers — went from open-source to closed-source and started doing things no developer tool should do.

## What Happened

The extension, which had built trust over years as a simple, open-source JSON beautifier, was found to be:

- **Injecting donation popups on checkout pages.** When you were buying something online, the extension inserted a GiveFreely popup asking you to donate — exploiting the psychological pressure of being mid-transaction.
- **Tracking your location.** The extension queried MaxMind's GeoIP2 API with a hardcoded key to identify where you live, enabling targeted prompts toward users in high-income regions.
- **Sending data to third-party servers.** Communication with `api.givefreely.com` and `events.givefreely.com` for behavioral monitoring.
- **Running suspicious code.** Variables like `GF_SHOULD_STAND_DOWN` raised concerns about potential click injection and impression manipulation.

This wasn't a supply chain attack. This wasn't a compromised dependency. The extension's own code was doing this, deliberately, to millions of users who trusted it to do one thing: format JSON.

## Why This Matters

As developers, we're supposed to be the people who understand what software does. But browser extensions run with broad permissions, and even technical users rarely audit what they've installed.

A JSON formatter needs access to page content to do its job — it has to read the response body to format it. But that same access can be used to read checkout forms, inject scripts, and monitor your browsing.

The permission model doesn't distinguish between "reading JSON to format it" and "reading your credit card form to inject a popup."

## How to Audit Your Extensions

Before uninstalling everything in a panic, here's a quick audit:

1. **Open `chrome://extensions/`** and review what you have installed
2. **Check permissions**: Click "Details" on each extension. Look for `<all_urls>` or broad host permissions
3. **Check source availability**: Is the source code public? Can you verify what it does?
4. **Check update history**: Has the extension changed ownership? Has it gone closed-source?
5. **Check the reviews**: Sort by recent. Users often report problems before anyone investigates

## What to Look for in a JSON Viewer

If you're replacing your JSON formatter, here's what matters:

**Minimal permissions.** A JSON viewer only needs `storage` (to save your theme preference) and host permissions (to detect JSON content type). It should NOT need `tabs`, `webNavigation`, `cookies`, or any other permission.

**Open source.** You should be able to read every line of code the extension runs. Not just "source available" — actually open source, on a public repo, with commit history.

**Manifest V3.** Chrome's latest extension platform is more restrictive by design. MV3 extensions can't run arbitrary remote code, which limits the attack surface. If your JSON viewer is still on MV2, it's using a deprecated platform with weaker security guarantees.

**No network requests.** A JSON formatter has no reason to contact external servers. It should work entirely locally — read the page, format the JSON, display it. Done.

## Alternatives

A few JSON viewers that meet the criteria above:

- **[JSON Viewer Pro](https://chromewebstore.google.com/detail/json-viewer-pro/iodhhjpjemdfmmfffmejfnbbjbfafoac)** — Auto-detects JSON responses, collapsible tree view, search, dark mode. Storage permission only. Manifest V3. Open source. *(Full disclosure: I built this one.)*

- **JSONVue** — Established, open source, simple. Does the basics well.

- **Built-in browser tools** — Firefox has a built-in JSON viewer. Chrome's DevTools Network tab shows formatted JSON responses. No extension needed if you're comfortable with DevTools.

- **VS Code / local tools** — If you mostly work with JSON files rather than API responses, a local editor with a JSON plugin avoids browser extensions entirely.

## The Bigger Picture

This incident is a reminder that browser extensions are software, and software can change. An extension that was trustworthy when you installed it three years ago might not be trustworthy today.

A few habits that help:

- **Audit your extensions quarterly.** Set a calendar reminder.
- **Prefer extensions with minimal permissions.** The fewer permissions, the smaller the attack surface.
- **Prefer open source.** Not because open source is magically secure, but because it can be verified.
- **Read recent reviews before updating.** If an update introduces problems, other users will flag it.

Your browser has access to everything you do online. The extensions running inside it deserve the same scrutiny as any other software you trust with your data.

---
title: "WCAG Compliance for Developers: A Practical Guide for April 2026"
date: 2026-04-04
draft: true
tags: ["accessibility", "wcag", "ada", "developer-tools", "compliance"]
summary: "The ADA Title II deadline hits April 24. If you build for the web, here's what's actually required, which tools find real issues, and what you'll need to fix by hand."
---

On April 24, 2026, the ADA Title II compliance deadline takes effect. State and local government entities serving populations of 50,000 or more must meet WCAG 2.1 Level AA. Smaller entities get until April 2027.

If you build websites for government agencies, educational institutions, or public services — or if your company serves EU customers — this isn't optional anymore. It's law.

## What's Actually Required

**WCAG 2.1 Level AA** covers four principles — Perceivable, Operable, Understandable, Robust — across 50 specific success criteria. The ones that trip up most sites:

**Perceivable:**
- All images need meaningful `alt` text (not "image1.png" — what does the image convey?)
- Color can't be the only way to communicate information (red/green status indicators need icons or text too)
- Text contrast must be at least 4.5:1 against its background (3:1 for large text)
- Video needs captions. Audio needs transcripts.

**Operable:**
- Every interactive element must be keyboard-accessible. Tab order must make sense.
- No keyboard traps — if you can Tab into something, you must be able to Tab out.
- Skip navigation links ("Skip to main content") for keyboard users.
- Hover/focus content must be dismissable and persistent.

**Understandable:**
- Form inputs need visible labels (not just placeholders — placeholders disappear when you type).
- Error messages must identify what went wrong and suggest how to fix it.
- The page language must be declared in HTML (`<html lang="en">`).

**Robust:**
- Valid HTML. Semantic elements. Proper ARIA when native HTML isn't enough.
- Custom widgets must expose correct roles, states, and properties to assistive technology.

## The Enforcement Landscape

This isn't theoretical. ADA web accessibility lawsuits hit over 4,600 in 2023, and enforcement has only accelerated.

In the EU, the European Accessibility Act (EAA) has been enforced since June 2025. France is issuing formal notices. Germany is investigating complaints. Fines run up to EUR 3M — per country, not total. If you serve customers in multiple EU member states, the exposure multiplies.

Overlay tools like accessiBe and UserWay are not a safe harbor. The FTC has scrutinized them, and multiple lawsuits have been filed by accessibility advocates arguing that overlays don't actually achieve WCAG compliance. They might make things look better without fixing the underlying issues.

## What Automated Tools Can (and Can't) Find

Here's the uncomfortable truth: **automated tools catch about 30-40% of WCAG issues.** The rest require manual testing — keyboard navigation, screen reader testing, cognitive review.

But that 30-40% is still the right place to start. Here's what to use:

### axe DevTools (Free Extension)

The de facto standard. 800K+ installs on Chrome Web Store. Built by Deque, the company behind much of the accessibility testing infrastructure.

- Open DevTools → axe tab → "Scan ALL of my page"
- Returns issues grouped by severity with WCAG references
- Each issue includes: what's wrong, why it matters, how to fix it
- Zero false positives by design — Deque's philosophy is "if we report it, it's real"

The free version is genuinely powerful. The paid tier ($5K+/year) adds guided manual testing, and most individual developers don't need it.

### Lighthouse (Built into Chrome)

Already in your browser. DevTools → Lighthouse → check "Accessibility" → Generate report.

- Scores 0-100 based on a subset of axe-core rules
- Good for a quick health check, not comprehensive
- Misses issues that require page interaction (modal focus traps, dynamic content)

### WAVE (Free Web Tool + Extension)

WebAIM's tool. Shows issues as visual icons overlaid on the page.

- Great for visual learners — you see exactly where issues are
- Shows document structure, heading hierarchy, ARIA landmarks
- The contrast checker is particularly useful
- More verbose than axe — reports potential issues alongside confirmed ones

### Chrome DevTools Built-in Features

DevTools has gotten better at accessibility without any extensions:

- **Elements panel → Accessibility pane:** Shows the accessibility tree, ARIA attributes, and computed accessible name for any element
- **CSS Overview → Colors:** Flags contrast issues across the entire page
- **Rendering → Emulate vision deficiencies:** See your page through the lens of protanopia, deuteranopia, tritanopia, blurred vision
- **Lighthouse:** Built-in, as noted above

### The "Good Enough" Stack

For most developers, this covers it:

1. **axe DevTools** for comprehensive automated scanning
2. **WAVE** for visual structure review
3. **Chrome DevTools** accessibility pane for element-level debugging
4. **Your keyboard** for manual navigation testing (see below)

## The Keyboard Test: 5 Minutes That Find Real Issues

Put your mouse away. Navigate your site with just:

- **Tab** to move forward
- **Shift+Tab** to move backward
- **Enter** to activate links and buttons
- **Space** to check checkboxes and toggle buttons
- **Arrow keys** for radio buttons, menus, tabs
- **Escape** to close modals and dropdowns

What to watch for:

1. **Can you see where focus is?** If there's no visible focus indicator, sighted keyboard users are lost. Check that `:focus` styles are visible (don't `outline: none` without a replacement).
2. **Can you reach everything?** Every button, link, form field, and interactive widget should be reachable by Tab.
3. **Can you get OUT of everything?** Open a modal — can you Escape it? Open a dropdown — can you close it? Tab into a date picker — can you leave?
4. **Does the order make sense?** Focus should follow visual reading order. If Tab jumps from the header to the sidebar before the main content, the DOM order is wrong.
5. **Do custom widgets work?** Accordions, tabs, carousels, tree views — these need ARIA roles and keyboard handling. A `<div onclick="toggle()">` is invisible to keyboard users.

This test catches issues that no automated tool can. A modal without focus trapping, a custom dropdown that doesn't respond to arrow keys, a slide-out menu that can't be dismissed — these are real barriers.

## The Top 10 Issues You'll Actually Find

Based on the WebAIM Million (annual survey of the top 1 million websites):

1. **Low contrast text** (83% of pages) — Use Chrome's color picker or WAVE to check. Fix: adjust colors to meet 4.5:1 ratio.
2. **Missing alt text** (58%) — Every `<img>` needs `alt`. Decorative images get `alt=""`. Meaningful images get descriptions.
3. **Missing form labels** (50%) — Every `<input>` needs an associated `<label>`. Placeholders are not labels.
4. **Empty links** (50%) — Links with no text (icon-only links without `aria-label`).
5. **Empty buttons** (27%) — Same problem as empty links — icon buttons without accessible names.
6. **Missing document language** (18%) — Add `lang="en"` (or appropriate language) to `<html>`.
7. **Missing skip navigation** — Keyboard users must Tab through your entire header/nav on every page.
8. **Inaccessible custom widgets** — Accordions, dropdowns, modals built with `<div>` instead of semantic HTML.
9. **Auto-playing media** — Video/audio that plays on page load without user control.
10. **Poor heading structure** — Skipping heading levels (h1 → h3), multiple h1s, headings used for styling.

## A Practical Audit Checklist

If you're staring at a site that needs to be compliant by April 24:

**Week 1: Scan and Triage**
- [ ] Run axe DevTools on every major page template (homepage, listing, detail, form, checkout)
- [ ] Export results. Group by severity: Critical → Serious → Moderate
- [ ] Run the keyboard test on each template
- [ ] Note any modals, custom widgets, or interactive components that fail keyboard nav

**Week 2: Fix Critical and Serious Issues**
- [ ] Contrast fixes (CSS changes, usually straightforward)
- [ ] Alt text audit (content team or developer — someone who knows what the images mean)
- [ ] Form labels (associate every input with a label)
- [ ] Keyboard focus indicators (ensure `:focus-visible` styles exist and are visible)
- [ ] Skip navigation link (one `<a>` at the top of the body, hidden until focused)

**Week 3: Address Remaining Issues**
- [ ] ARIA attributes for custom widgets
- [ ] Focus management for modals (trap focus in, return focus out)
- [ ] Heading structure review
- [ ] Language declaration, empty links/buttons, document title

**Ongoing:**
- [ ] Screen reader testing (VoiceOver on Mac, NVDA on Windows — both free)
- [ ] Add accessibility checks to CI/CD (axe-core npm package, jest-axe, or Playwright's accessibility assertions)

## Making It Stick

Fixing a codebase for compliance once is necessary. Keeping it accessible is harder. A few things that help:

**axe-core in your test suite.** The `@axe-core/playwright` or `jest-axe` packages catch regressions before they ship. A test that renders a page and runs `axe()` on it takes 30 seconds to write and saves hours of remediation.

**Component-level accessibility.** If your button component is accessible, every button on your site is accessible. Fix the components, not the pages.

**Linting.** `eslint-plugin-jsx-a11y` (React) or similar plugins catch issues at author time, before the code is even rendered.

## The Reality Check

Full WCAG 2.1 AA compliance is hard. If your site is a complex application with custom widgets, third-party embeds, and years of accumulated UI debt, you won't be fully compliant by April 24. Nobody will.

But you can be *demonstrably working on it.* Run the scans, fix the critical issues, document your remediation plan, and keep making progress. The DOJ's enforcement guidance emphasizes good faith and systematic improvement, not perfection on day one.

The developers who build accessibility into their workflow now — automated testing, keyboard testing, semantic HTML as default — will spend less time on compliance and more time building things that work for everyone.

---

*We build [developer tools](https://brightbar.dev) that work for everyone. Accessibility isn't a feature — it's how software should work.*

---
title: "Building Browser Extensions with WXT in 2026"
date: 2026-03-15
draft: true
tags: ["wxt", "browser-extensions", "typescript", "manifest-v3"]
summary: "What I learned rewriting 5 browser extensions in WXT — what it solves, what's still rough, and whether it's worth adopting."
---

I rewrote 5 Chrome extensions from raw Manifest V3 to [WXT](https://wxt.dev/) over the span of a few weeks. Three were existing published extensions. Two were new builds. Here's what I learned.

## What WXT is

WXT is a Vite-based framework for building browser extensions. Think "Nuxt, but for web extensions." It handles manifest generation, TypeScript configuration, hot module reloading, and multi-browser builds from a single codebase.

It's pre-1.0 (v0.20 as of writing) but has 9,300 GitHub stars, 168,000 weekly npm downloads, and 2,600 dependent projects. It's the consensus recommendation for new extension projects in 2026.

## What it solves

### Manifest generation

Raw MV3 means hand-writing `manifest.json`. Content scripts, background workers, permissions, icons — all manually maintained. Change a file name? Update the manifest. Add a content script? Update the manifest. Forget to update the manifest? Debug for 20 minutes before you realize.

WXT generates the manifest from your file structure. Drop a file in `entrypoints/`, export the right metadata, and the manifest updates automatically:

```typescript
// entrypoints/background.ts
export default defineBackground(() => {
  console.log('Background loaded');
});

// entrypoints/popup/main.ts
export default defineContentScript({
  matches: ['*://*.example.com/*'],
  main() {
    // injected into matching pages
  },
});
```

No manifest to maintain. The file _is_ the configuration.

### Dev reloading

Without WXT, the dev loop for extensions is: edit code, build, go to `chrome://extensions`, click reload, switch to your test tab, refresh. Every change. Every time.

WXT gives you hot module reloading. Edit your popup code and it updates in place. Edit a content script and it re-injects. Even background service workers reload automatically. This alone justified the migration — I estimate it saved 5-10 seconds per change, hundreds of times.

### Cross-browser builds

One codebase, multiple targets:

```bash
wxt build                  # Chrome (default)
wxt build --browser firefox
wxt build --browser edge
wxt build --browser safari
```

WXT uses `webextension-polyfill` under the hood, so `browser.storage.local.get()` works everywhere. Browser-specific APIs get handled with conditional imports. I haven't shipped Firefox versions yet, but the build works — and knowing it's one command away instead of a separate codebase removes a real barrier.

### Testing

WXT integrates cleanly with Vitest and provides a `wxt/testing` module with `fakeBrowser` — a mock of the WebExtension API. This replaces the hand-rolled mocks I was maintaining before:

```typescript
import { describe, it, expect } from 'vitest';
import { fakeBrowser } from 'wxt/testing';

describe('storage', () => {
  it('saves and retrieves settings', async () => {
    await fakeBrowser.storage.local.set({ theme: 'dark' });
    const result = await fakeBrowser.storage.local.get('theme');
    expect(result.theme).toBe('dark');
  });
});
```

Across the 5 extensions, I have 539 tests running on Vitest. They're fast — the full suite runs in under 3 seconds.

## What's still rough

### Documentation assumes a frontend framework

WXT's docs lean heavily toward React, Vue, or Svelte. If you're writing vanilla TypeScript (which I am), you'll find fewer examples and some patterns that don't translate directly. The popup entrypoint docs, for example, show React components — figuring out the vanilla equivalent took some digging.

This isn't a dealbreaker, but it adds friction. I'd estimate 15-20% of my WXT debugging time was "how do I do this without React?" not "how do I do this in WXT?"

### The storage API has a learning curve

WXT provides a typed storage API that's nice once you learn it, but the initial setup is non-obvious:

```typescript
// Define a storage item with a default value
const settings = storage.defineItem<Settings>('local:settings', {
  defaultValue: { theme: 'light', fontSize: 14 },
});

// Use it
const current = await settings.getValue();
await settings.setValue({ ...current, theme: 'dark' });
```

The `local:` prefix, the `defineItem` pattern, the typing — none of it is hard, but it's all new conventions to learn. The raw `browser.storage.local.get/set` API is simpler to reason about, even if it's less type-safe.

### Third-party library conflicts

This one bit me hard. Libraries that call `browser.runtime.onMessage.addListener` internally will conflict with your own message handlers. WXT doesn't cause this — it's a Manifest V3 problem — but WXT doesn't protect you from it either.

I ran into this integrating a payment library. It registered its own message listener in the background script. My custom messages were being intercepted and swallowed. The fix was to call the library's methods directly from the popup instead of routing everything through background messaging. Took a while to diagnose.

**Lesson:** Always check whether a third-party library registers its own extension listeners. If it does, don't proxy through messaging — call its methods directly from the context that needs them.

### Pre-1.0 means occasional breaking changes

WXT is actively developed. Minor version bumps sometimes change behavior. I haven't hit anything catastrophic, but I've had to adjust configuration after updates. If stability is your top priority, pin your WXT version and update deliberately.

## Migration vs. new project

For new extensions: use WXT. The dev experience is dramatically better than raw MV3, and the ecosystem is mature enough for production use.

For existing extensions: it depends. My three migrations each took a few hours — mostly restructuring files to match WXT's conventions and replacing manual manifest management. Tests needed updating to use `fakeBrowser` instead of hand-rolled mocks. The migrations were straightforward but not trivial.

If your existing extension is stable and doesn't need new features, there's no urgent reason to migrate. If you're actively developing it and the manual reload cycle is driving you crazy, the migration pays for itself quickly.

## The raw numbers

Here's what the rewrite looked like across my 5 extensions:

| Metric | Before (Raw MV3) | After (WXT) |
|--------|-------------------|-------------|
| Build config | Hand-rolled | Zero-config |
| Dev reload | Manual (5 clicks) | Automatic HMR |
| Browser targets | Chrome only | Chrome, Firefox, Edge |
| Test framework | Hand-rolled mocks | Vitest + fakeBrowser |
| Total tests | ~50 | 539 |
| Manifest | Manual JSON | Auto-generated |

The test count increase isn't entirely WXT's doing — I wrote more tests because WXT made it easier to write tests. That's the compounding effect of good tooling: when the friction drops, you do more of the thing.

## Should you use it?

If you're building browser extensions in 2026 and you're not using WXT, you're writing boilerplate that a framework handles better. The file-based entrypoints, auto manifest, HMR, and cross-browser builds are real productivity gains — not theoretical ones.

The rough edges (docs favoring React, occasional pre-1.0 breakage) are real but manageable. And with 9,300 stars and growing, the ecosystem is only getting better.

Start a new project with it. If you like it, consider migrating your existing ones.

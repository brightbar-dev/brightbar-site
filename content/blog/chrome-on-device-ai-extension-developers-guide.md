---
title: "Chrome's On-Device AI for Extension Developers: What's Actually Usable Today"
date: 2026-04-04
draft: true
tags: ["chrome-extensions", "ai", "gemini-nano", "prompt-api", "on-device-ai", "privacy"]
summary: "Chrome ships on-device AI APIs powered by Gemini Nano. The Prompt API is stable for extensions — not web pages. Here's what works, what doesn't, and what you can build right now."
---

Chrome now ships AI models directly in the browser. No API keys. No network requests. No data leaving the device. It's called "Built-in AI," it's powered by Gemini Nano, and extension developers have access to APIs that web pages don't.

That last part is the interesting bit.

> **Note on API naming:** The Prompt API surface has been `self.ai.languageModel`, then `LanguageModel` as a global. Chrome docs currently show both. If one doesn't work, try the other. This post uses the `LanguageModel` global where possible.

## The API Landscape

Chrome has seven built-in AI APIs at various stages of maturity. Here's the actual status:

| API | Status for Extensions | Status for Web | Chrome Version |
|-----|----------------------|----------------|----------------|
| **Prompt API** | Stable | Origin Trial | 138+ |
| **Summarizer** | Stable | Stable | 138+ |
| **Language Detector** | Stable | Stable | 138+ |
| **Translator** | Stable | Stable | 138+ |
| **Writer** | Developer Trial | Developer Trial | — |
| **Rewriter** | Developer Trial | Developer Trial | — |
| **Proofreader** | Origin Trial | Origin Trial | — |

The standout: the **Prompt API is stable for extensions but still in origin trial for web pages.** This means extensions have a privileged position — you can ship production features with the Prompt API today, and web developers can't.

## How It Works

All these APIs run on Gemini Nano. The model downloads once (~22GB of storage needed) and runs locally. Chrome manages downloads and updates automatically — the model can even hot-swap to a new version while Chrome is running.

### Hardware Requirements

This is the catch:

- **Storage:** 22GB free space on the volume containing your Chrome profile
- **GPU path:** 4GB+ VRAM (preferred, faster inference)
- **CPU fallback:** 16GB+ RAM, 4+ cores (works since Chrome 140 — previously GPU-only)
- **OS:** Windows 10+, macOS 13+, Linux, ChromeOS (Chromebook Plus only)
- **NOT available on:** mobile (Android/iOS), low-RAM machines, regular Chromebooks, Web Workers

The 22GB storage requirement is the real gatekeeper. RAM matters less now that CPU fallback exists, but the storage footprint means your extension needs to feature-detect and degrade gracefully. Chrome will also delete the model automatically if disk space runs low.

### Language Support

As of Chrome 140: **English, Spanish, and Japanese** for input/output. That's it. More languages are coming, but today, the Prompt API is effectively English-first.

The Translator API supports broader language pairs, and the Language Detector handles 50+ languages for identification. But for free-form prompting, you're limited to three languages.

## The Prompt API: What Extensions Can Do

The Prompt API is the most flexible of the bunch. You give it a prompt, it returns a response. Simple API, broad applications.

```javascript
// Check if the API is available
const availability = await LanguageModel.availability();

if (availability.available) {
  // Model is downloaded and ready
  const session = await LanguageModel.create({
    systemPrompt: 'You are a helpful assistant that explains code.'
  });

  const result = await session.prompt(
    'Explain this CSS rule: grid-template-columns: repeat(auto-fit, minmax(250px, 1fr))'
  );

  console.log(result);
  // → Explains the CSS grid rule in plain English

  // Clean up when done
  session.destroy();
}
```

### Key Constraints

- **Context window:** ~6,144 tokens (check `session.maxTokens` at runtime — it varies by model version). Track usage with `session.tokensSoFar` and `session.tokensLeft`.
- **Reasoning:** Good for classification, summarization, extraction, and rewriting. Not good for complex multi-step reasoning or code generation.
- **Multimodal input:** The Prompt API accepts text, images, and audio as input (text output only). Audio requires a GPU.
- **Speed:** Fast on capable hardware. Noticeably slow on minimum-spec machines.
- **Sessions:** Each session maintains context (last ~4,096 tokens of conversation). Call `destroy()` when done to free resources. A `contextoverflow` event fires when the context fills — earlier conversation pairs are dropped but the system prompt persists.

### Streaming Responses

For better UX, stream results instead of waiting for the full response:

```javascript
const stream = await session.promptStreaming('Summarize this error log...');

for await (const chunk of stream) {
  // Update UI incrementally
  outputElement.textContent = chunk;
}
```

## The Summarizer API: Instant Document Summaries

This one is stable for both extensions AND web pages. Given text, it returns a summary. You control the length and format.

```javascript
const summarizer = await self.ai.summarizer.create({
  type: 'key-points',     // or 'tl;dr', 'teaser', 'headline'
  length: 'medium',       // 'short', 'medium', 'long'
  format: 'markdown'      // or 'plain-text'
});

const summary = await summarizer.summarize(longArticleText);
```

### Extension Ideas

- A **reading list extension** that auto-summarizes saved articles
- A **PR review helper** that summarizes diff descriptions
- A **documentation browser** that TL;DRs long API docs

## What to Actually Build

The interesting extensions aren't "add AI for the sake of AI." They use on-device inference to solve problems that previously required either cloud APIs (expensive, privacy-concerning) or manual effort.

### Pattern 1: Classify and Route

Use the Prompt API to classify content and take action:

```javascript
const session = await self.ai.languageModel.create({
  systemPrompt: `Classify the following text into exactly one category:
    BUG_REPORT, FEATURE_REQUEST, QUESTION, OTHER.
    Respond with only the category name.`
});

const category = await session.prompt(issueText);
// Route to the right handler based on category
```

This works well because classification is within Gemini Nano's sweet spot — it doesn't require complex reasoning, just pattern matching against well-defined categories.

### Pattern 2: Extract Structure

Turn unstructured content into structured data:

```javascript
const session = await self.ai.languageModel.create({
  systemPrompt: `Extract key-value pairs from the following text.
    Return valid JSON with keys: name, email, phone, company.
    Use null for missing fields.`
});

const extracted = await session.prompt(contactBlockText);
const data = JSON.parse(extracted);
```

### Pattern 3: Explain in Context

Add contextual explanations to technical content:

```javascript
// In a developer tools extension
const session = await self.ai.languageModel.create({
  systemPrompt: 'Explain web development concepts in one clear sentence.'
});

const explanation = await session.prompt(
  `What does this HTTP header do: ${headerName}: ${headerValue}`
);
```

### Pattern 3.5: Feature Detection Done Right

Every use of these APIs needs a fallback:

```javascript
async function getPromptSession(systemPrompt) {
  if (typeof LanguageModel === 'undefined') return null;

  const availability = await LanguageModel.availability();
  if (!availability.available) {
    // Model not downloaded or device not capable
    // Consider offering a "Download AI model" button if downloadProgress exists
    return null;
  }

  return LanguageModel.create({ systemPrompt });
}
```

Not "if AI is available, the extension works; otherwise it doesn't." The AI features should be an enhancement, not a dependency. The extension should be useful without them.

## The Privacy Angle

This is where on-device AI gets genuinely interesting for extensions.

Browser extensions already have a trust problem (see: [JSON formatter extensions that spy on you](/blog/your-json-formatter-might-be-spying-on-you/)). Users are rightly cautious about giving extensions access to their data.

On-device AI lets you build features that would normally require sending data to a server — summarization, classification, extraction — without any data ever leaving the browser. You can advertise "AI-powered, zero data sent anywhere" and actually mean it. No API keys to manage, no server costs, no privacy policies to update.

For developer tool extensions specifically, this is powerful. Developers inspect sensitive codebases, internal APIs, production configurations. An extension that analyzes code locally is a fundamentally different trust proposition than one that phones home to an API.

## What Doesn't Work (Yet)

**Complex code generation.** Gemini Nano is a small model. It can explain code and classify code, but it won't write a React component for you. That's what full-size models via API are for.

**Long documents.** The context window is limited. If you need to summarize a 50-page document, you'll need to chunk it — and the Summarizer API handles that better than raw Prompt API calls.

**Non-English content.** Three languages. That's the reality. If your extension serves a global audience, on-device AI features will only work for a subset.

**Low-end hardware.** 16GB RAM is a hard requirement. No polyfill, no fallback. Feature-detect and degrade.

**Image/audio/video.** These APIs are text-only. No vision models, no speech-to-text, no image generation.

## The Timing Opportunity

Here's the thing nobody's talking about: almost no one is building extensions with these APIs yet.

Google has published the documentation. The APIs are stable. But the extension ecosystem hasn't caught up. Search the Chrome Web Store for extensions using `self.ai.languageModel` and you'll find a handful of experiments, not mature tools.

This is the same pattern as any new platform capability. The APIs ship, the docs go up, and then there's a gap of 6-12 months before developers build serious products on them. We're in that gap right now.

If you're an extension developer, you have a window to build the first high-quality tools that use on-device AI. Not "ChatGPT in a sidebar" — that's been done. Tools that use AI as infrastructure: classifying, extracting, explaining, summarizing as part of a larger workflow that solves a real problem.

The extensions that ship first with genuine, useful on-device AI features — and market them as "private, on-device, no data sent anywhere" — will have a significant advantage when the broader developer audience catches up.

---

*At [Brightbar](https://brightbar.dev), we're exploring how on-device AI can enhance developer tools without compromising privacy. More on what we learn as we build.*

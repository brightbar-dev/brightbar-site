---
title: "Shopify App Development with Elixir: A Practical Guide"
date: 2026-03-31
draft: true
tags: ["elixir", "shopify", "phoenix", "shopifex", "fly-io"]
summary: "Most Shopify apps are built with Remix and Node. Here's what it looks like to build one with Elixir/Phoenix instead — and when that's actually a good idea."
---

Shopify's official app template is Remix on Node.js. Their docs assume it. Their CLI generates it. If you follow the happy path, you're writing React and JavaScript.

But Shopify doesn't require Node. The app is just an HTTP server that handles OAuth, validates webhooks, and serves pages inside an iframe. Any language that can do that works.

I'm building a Shopify app with Elixir and Phoenix. Here's what that looks like in practice.

## Why consider Elixir at all

Shopify apps are webhook-heavy. A merchant installs your app, and Shopify starts sending HTTP POST requests every time something happens — orders created, inventory updated, customers deleted. Your app needs to receive these, validate them, and do something useful. Fast.

Elixir is unusually good at this:

**Concurrency without thinking about it.** Each incoming webhook gets its own lightweight process (not an OS thread — Erlang processes are ~2KB). A burst of 500 order webhooks from a flash sale? They're processed concurrently by default. No worker pool configuration, no async/await chains, no callback hell.

**Fault tolerance is built in.** If one webhook handler crashes — bad data, network timeout, whatever — it crashes alone. The supervisor restarts it. Every other request continues unaffected. In Node, an unhandled exception in an async handler can take down the process.

**OTP for background work.** Shopify apps need background jobs: retry failed notifications, poll inventory levels, calculate analytics. OTP (Open Telecom Platform) gives you GenServers and supervision trees — battle-tested patterns for long-running processes. Add [Oban](https://hex.pm/packages/oban) and you get persistent, retryable background jobs backed by Postgres.

These aren't theoretical advantages. For a webhook relay app, they're the actual architecture.

## Shopifex: the bridge library

[Shopifex](https://hex.pm/packages/shopifex) is an Elixir library (v2.4.0, ~114 GitHub stars) that handles the Shopify-specific plumbing:

- **OAuth flow** — installs and re-authenticates merchants
- **Session token validation** — verifies requests coming from the Shopify Admin iframe
- **Webhook HMAC verification** — confirms webhooks are actually from Shopify
- **Billing API integration** — creates and manages subscription charges

Here's what a webhook controller looks like:

```elixir
defmodule StorePulseWeb.WebhookController do
  use StorePulseWeb, :controller
  use Shopifex.Webhook, scope: "/webhook"

  webhook "orders/created" do
    order = conn.body_params

    # Each webhook runs in its own process.
    # Spawn a task to deliver notifications
    # without blocking the HTTP response.
    Task.Supervisor.start_child(StorePulse.TaskSupervisor, fn ->
      StorePulse.Notifications.deliver(shop, order)
    end)

    conn
    |> put_resp_content_type("application/json")
    |> send_resp(200, Jason.encode!(%{ok: true}))
  end
end
```

Shopifex validates the HMAC signature before your code runs. If the signature is invalid, it rejects the request. You write the business logic; Shopifex handles the Shopify protocol.

The router setup is straightforward:

```elixir
# router.ex
scope "/auth", StorePulseWeb do
  pipe_through [:browser]
  get "/", AuthController, :auth
  get "/callback", AuthController, :callback
end

scope "/webhook", StorePulseWeb do
  pipe_through [:shopifex_webhook]
  post "/*path", WebhookController, :action
end
```

### One gotcha worth knowing

Phoenix 1.8 defaults to Bandit as its HTTP adapter. Shopifex depends on `plug_cowboy`. You'll hit a dependency conflict if you don't swap it:

```elixir
# mix.exs — use Cowboy, not Bandit
defp deps do
  [
    {:shopifex, "~> 2.4"},
    {:phoenix, "~> 1.8"},
    {:plug_cowboy, "~> 2.7"},  # NOT bandit
    {:oban, "~> 2.18"},
  ]
end
```

And in your config:

```elixir
# config/config.exs
config :store_pulse, StorePulseWeb.Endpoint,
  adapter: Phoenix.Endpoint.Cowboy2Adapter
```

This will likely change as Shopifex evolves, but as of v2.4 it's a hard requirement.

## Polaris without React

Shopify's UI component library is called Polaris. It used to require React. As of October 2025, Polaris ships as web components — framework-agnostic, works anywhere.

In a Phoenix `.heex` template:

```html
<s-page title="Store Pulse">
  <s-layout>
    <s-layout-section>
      <s-card>
        <s-text variant="headingMd">Notification Channels</s-text>
        <s-resource-list>
          <%= for channel <- @channels do %>
            <s-resource-item id={channel.id}>
              <s-text variant="bodyMd"><%= channel.name %></s-text>
              <s-badge tone={if channel.active, do: "success", else: "critical"}>
                <%= if channel.active, do: "Active", else: "Paused" %>
              </s-badge>
            </s-resource-item>
          <% end %>
        </s-resource-list>
      </s-card>
    </s-layout-section>
  </s-layout>
</s-page>
```

Three script tags in your layout and you have the full component library:

```html
<meta name="shopify-api-key" content={@api_key} />
<script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
<script src="https://cdn.shopify.com/shopifycloud/polaris.js"></script>
```

Components use the `s-` prefix (`<s-page>`, `<s-card>`, `<s-button>`). They render identically to their React counterparts because they are the same components — just exposed as custom elements. Your app looks native inside the Shopify Admin without a single line of React.

This is a big deal for the Elixir stack. Before web components, you needed a React frontend even if your backend was Phoenix — which meant running two frameworks. Now it's Phoenix end-to-end.

## How it compares to Remix/Node

Shopify's default Remix template gives you a lot for free: CLI scaffolding, Prisma for the database, automatic deployment to Shopify's infrastructure, Polaris React components wired up. If you're starting from zero and want to ship fast, the default stack is faster to hello-world.

Here's where the stacks diverge:

| Concern | Remix/Node | Phoenix/Shopifex |
|---------|-----------|-----------------|
| Setup time | `shopify app create` — minutes | Manual Phoenix setup — an hour or two |
| Webhook handling | Express middleware | Supervised processes, isolated failures |
| Background jobs | BullMQ + Redis | Oban + Postgres (no Redis dependency) |
| Concurrency | Single-threaded event loop | Preemptive scheduling, thousands of processes |
| Error isolation | Process-level (crashes affect other requests) | Process-level (crashes are contained) |
| Polaris UI | React components (native) | Web components (same result, no React) |
| Hosting | Shopify infra, Vercel, etc. | Fly.io (~$5/month) |
| Community | Large, well-documented | Small, Shopifex has ~114 GH stars |

The Node stack wins on ecosystem size, documentation, and getting-started speed. The Elixir stack wins on operational characteristics — the things that matter when your app is handling real traffic from real merchants.

## Deploying to Fly.io

Phoenix apps deploy well to [Fly.io](https://fly.io). A minimal Shopify app runs on their smallest instance:

- **shared-cpu-1x** (256MB RAM): ~$2/month
- **Fly Postgres** (dev single-node): ~$2/month
- **1GB volume** for uploads/logs: ~$0.15/month

Total: roughly $4-5/month. That's cheaper than most Shopify app hosting solutions, and you get a real server with SSH access, not a serverless function with cold start penalties.

One thing to watch: Fly Postgres uses IPv6 by default. Set `socket_options: [:inet6]` in your database config or you'll get connection timeouts that are confusing to debug.

## When Elixir is the right choice

**Use Elixir if:**

- You already know Elixir. This is the biggest factor. The Shopify-specific parts (Shopifex, Polaris web components, Billing API) take a day to learn regardless of your backend language. The language and framework take months. If you're already productive in Phoenix, using it for Shopify apps is a no-brainer.
- Your app is webhook-heavy. Notification routing, inventory monitoring, order processing — anything that receives a high volume of events and needs to handle them reliably. This plays to Elixir's core strengths.
- You want Oban for background jobs. Oban is genuinely best-in-class for background job processing. Postgres-backed (no Redis), with built-in retry, cron scheduling, rate limiting, and job uniqueness. If your app needs reliable async processing, Oban alone might justify the stack choice.

**Don't use Elixir if:**

- You don't know Elixir and want to ship this week. Learning a new language, a new framework, and a new platform simultaneously is a recipe for slow progress. Use the Remix template, ship, validate the idea, then rewrite if the operational characteristics matter.
- Your app is mostly UI. If you're building a complex dashboard with lots of client-side interactivity, Phoenix LiveView can handle it — but you'll be fighting upstream against Shopify's React-centric ecosystem for anything beyond basic Polaris components.
- Shopifex's pace concerns you. It's maintained by a single developer (Eric Froese). It's actively updated and well-built, but if you need the safety net of a large maintainer team, the official Remix stack is the conservative choice. Pin your Shopifex version and test upgrades deliberately.

## The honest bottom line

Elixir isn't the obvious choice for Shopify apps. The ecosystem is smaller, the docs are thinner, and you'll solve problems that Remix developers never encounter.

But if you're already in the Elixir world, the fit is surprisingly good. Shopifex handles the Shopify protocol. Polaris web components eliminate the React dependency. Fly.io keeps hosting cheap. And the BEAM gives you concurrency and fault tolerance that Node developers have to bolt on with additional infrastructure.

The best stack for a Shopify app is the one you'll actually ship with. For most developers, that's Remix. For Elixir developers, it doesn't have to be.

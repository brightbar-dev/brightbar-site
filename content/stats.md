---
title: "Stats"
layout: "single"
summary: "Chrome Web Store user counts for every Bright Bar extension, over time."
ShowToc: false
---

We're building these extensions in public. This page charts each one's weekly user
count, straight from its Chrome Web Store listing, plus the portfolio total. A gap in
a line means Chrome Web Store hid that extension's count below its own display
threshold that week — not zero users, just not shown. A retired extension's history
stays on the chart, dashed, rather than disappearing.

The data is collected by a weekly job and published as a
[static JSON file](/stats/cws-metrics.json) — this page makes no other request.

{{< rawhtml >}}
<div class="stats-page">
  <div class="stats-total">
    <span class="stats-total-label">Current total users</span>
    <span class="stats-total-value" id="stats-total-value">&mdash;</span>
  </div>
  <div class="stats-chart-wrap">
    <svg id="stats-chart" class="stats-chart" aria-label="Weekly Chrome Web Store users per extension, and the portfolio total"></svg>
    <div class="stats-tooltip" id="stats-tooltip" hidden></div>
  </div>
  <ul class="stats-legend" id="stats-legend"></ul>
  <p class="stats-meta" id="stats-meta"></p>

  <h2>Latest snapshot</h2>
  <div class="stats-table-wrap">
    <table class="stats-table" id="stats-table">
      <thead>
        <tr><th>Extension</th><th>Users</th><th>Rating</th><th>Reviews</th><th>Version</th><th>Status</th></tr>
      </thead>
      <tbody></tbody>
    </table>
  </div>
</div>
<script src="/js/stats-chart.js" defer></script>
{{< /rawhtml >}}

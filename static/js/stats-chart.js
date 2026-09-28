/*
 * /stats chart — vanilla JS + SVG, no dependency. Reads /stats/cws-metrics.json
 * (the only network request this page makes) and draws one line per
 * extension plus a bold Total line. `users: null` is a gap, never a zero.
 * Colors are assigned by each product's first appearance in the data, never
 * by name or rank, so a slot never repaints when the product list changes —
 * see assets/css/extended/stats.css for the validated palette.
 */
(function () {
  'use strict';

  var DATA_URL = '/stats/cws-metrics.json';
  var SVGNS = 'http://www.w3.org/2000/svg';
  var PALETTE_SLOTS = 8;
  var MAX_SNAP_GAP_MS = 4 * 24 * 3600 * 1000; // don't attribute a stale point to a far-off hover position

  var svg = document.getElementById('stats-chart');
  if (!svg) return;
  var tooltip = document.getElementById('stats-tooltip');
  var legendEl = document.getElementById('stats-legend');
  var tableBody = document.querySelector('#stats-table tbody');
  var totalValueEl = document.getElementById('stats-total-value');
  var metaEl = document.getElementById('stats-meta');

  function svgEl(name, attrs) {
    var e = document.createElementNS(SVGNS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  function debounce(fn, ms) {
    var t;
    return function () {
      var args = arguments;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(null, args); }, ms);
    };
  }

  // niceStep: a 1-2-5-10 step size so the axis lands on clean numbers
  // (0/10/20/30/40, never 0/13/25/38) for roughly targetTicks gridlines.
  function niceStep(max, targetTicks) {
    if (max <= 0) return 1;
    var raw = max / targetTicks;
    var mag = Math.pow(10, Math.floor(Math.log10(raw)));
    var norm = raw / mag;
    var step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
    return step * mag;
  }

  var fmtTick = new Intl.DateTimeFormat('en-US', { month: 'short', year: '2-digit' });
  var fmtTooltipDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  function formatDate(d) {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(d) + ' UTC';
  }

  fetch(DATA_URL)
    .then(function (r) {
      if (!r.ok) throw new Error('cws-metrics.json: HTTP ' + r.status);
      return r.json();
    })
    .then(init)
    .catch(function (err) {
      var p = document.createElement('p');
      p.className = 'stats-meta';
      p.textContent = 'Could not load the chart data right now.';
      svg.replaceWith(p);
      console.error(err);
    });

  function init(data) {
    var productMeta = {};
    (data.products || []).forEach(function (p) { productMeta[p.id] = p; });

    var byProduct = {};
    var order = []; // first-appearance order, oldest first — the color-slot order
    (data.history || [])
      .slice()
      .sort(function (a, b) { return new Date(a.timestamp) - new Date(b.timestamp); })
      .forEach(function (row) {
        if (!byProduct[row.product_id]) {
          byProduct[row.product_id] = [];
          order.push(row.product_id);
        }
        byProduct[row.product_id].push({
          t: new Date(row.timestamp),
          users: row.users,
          rating: row.rating,
          reviews: row.reviews,
          version: row.version
        });
      });

    var series = order.map(function (id, i) {
      var meta = productMeta[id] || { name: id, status: 'published' };
      return {
        id: id,
        name: meta.name,
        retired: meta.status === 'killed',
        points: byProduct[id],
        color: 'var(--series-' + ((i % PALETTE_SLOTS) + 1) + ')'
      };
    });

    var active = series.filter(function (s) { return !s.retired; });
    var totalPoints = computeTotal(active);

    renderLegend(series);
    renderTable(series);
    totalValueEl.textContent = (typeof data.total_users === 'number') ? data.total_users.toLocaleString() : '—';
    if (data.generated_at) {
      metaEl.textContent = 'Collected weekly, straight from each extension’s Chrome Web Store listing. Last updated ' + formatDate(new Date(data.generated_at)) + '.';
    }

    var allStamps = dedupeSorted(totalPoints.map(function (p) { return p.t.getTime(); }).concat(
      series.reduce(function (acc, s) { return acc.concat(s.points.map(function (p) { return p.t.getTime(); })); }, [])
    ));

    var current = null; // set by render(); read by the hover handlers below

    function draw() { current = render(svg, series, totalPoints); }
    draw();

    var ro = ('ResizeObserver' in window) ? new ResizeObserver(debounce(draw, 120)) : null;
    if (ro) ro.observe(svg);
    window.addEventListener('orientationchange', draw);

    attachHover(svg, tooltip, series, totalPoints, allStamps, function () { return current; });
  }

  // computeTotal: at every timestamp any active product was observed, sum
  // each active product's most recent known non-null value at or before
  // that timestamp (0 before its first observation) — the portfolio total
  // over time, matching --portfolio's carry-forward semantics.
  function computeTotal(active) {
    var stampSet = {};
    active.forEach(function (s) { s.points.forEach(function (p) { stampSet[p.t.getTime()] = true; }); });
    var stamps = Object.keys(stampSet).map(Number).sort(function (a, b) { return a - b; });
    var idx = active.map(function () { return -1; });
    var last = active.map(function () { return 0; });
    return stamps.map(function (ts) {
      var sum = 0;
      active.forEach(function (s, i) {
        while (idx[i] + 1 < s.points.length && s.points[idx[i] + 1].t.getTime() <= ts) {
          idx[i]++;
          if (s.points[idx[i]].users != null) last[i] = s.points[idx[i]].users;
        }
        sum += last[i];
      });
      return { t: new Date(ts), users: sum };
    });
  }

  function dedupeSorted(nums) {
    var seen = {};
    var out = [];
    nums.forEach(function (n) { if (!seen[n]) { seen[n] = true; out.push(n); } });
    out.sort(function (a, b) { return a - b; });
    return out;
  }

  function pathFor(points, xt, y) {
    var d = '';
    var pendingMove = true;
    points.forEach(function (p) {
      if (p.users == null) { pendingMove = true; return; }
      d += (pendingMove ? 'M' : 'L') + xt(p.t.getTime()).toFixed(1) + ',' + y(p.users).toFixed(1) + ' ';
      pendingMove = false;
    });
    return d.trim();
  }

  function lastReal(points) {
    for (var i = points.length - 1; i >= 0; i--) {
      if (points[i].users != null) return points[i];
    }
    return null;
  }

  // render: full rebuild, sized to the SVG's OWN rendered pixel box (viewBox
  // == clientWidth x clientHeight) so text stays a legible fixed pixel size
  // at every width — a uniformly-scaled fixed viewBox would shrink an
  // 11px label to unreadable on a phone. Returns the scale the hover layer
  // needs (kept out of the DOM).
  function render(svg, series, totalPoints) {
    var rect = svg.getBoundingClientRect();
    var W = Math.max(280, Math.round(rect.width));
    var H = Math.max(180, Math.round(rect.height));
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    var margin = { top: 14, right: 12, bottom: 26, left: 38 };
    var innerW = W - margin.left - margin.right;
    var innerH = H - margin.top - margin.bottom;

    var tMin = Infinity, tMax = -Infinity, yMax = 0;
    function scan(points) {
      points.forEach(function (p) {
        var tt = p.t.getTime();
        if (tt < tMin) tMin = tt;
        if (tt > tMax) tMax = tt;
        if (p.users != null && p.users > yMax) yMax = p.users;
      });
    }
    series.forEach(function (s) { scan(s.points); });
    scan(totalPoints);
    if (!isFinite(tMin)) return null;
    if (tMin === tMax) tMax = tMin + 24 * 3600 * 1000;
    var yStep = niceStep(yMax || 1, 4);
    var yTop = Math.max(yStep, Math.ceil((yMax || 1) / yStep) * yStep);

    function xt(ms) { return margin.left + (ms - tMin) / (tMax - tMin) * innerW; }
    function y(v) { return margin.top + innerH - (v / yTop) * innerH; }

    // Gridlines + Y axis (recessive, hairline — marks-and-anatomy.md); clean
    // round steps (0/10/20/30/40), never a mechanical quarter of the max.
    for (var v = 0; v <= yTop; v += yStep) {
      var yy = y(v);
      svg.appendChild(svgEl('line', { class: 'grid-line', x1: margin.left, x2: W - margin.right, y1: yy.toFixed(1), y2: yy.toFixed(1) }));
      var lbl = svgEl('text', { class: 'axis-label', x: margin.left - 8, y: (yy + 4).toFixed(1), 'text-anchor': 'end' });
      lbl.textContent = v.toLocaleString();
      svg.appendChild(lbl);
    }

    // X axis.
    var xTickCount = W < 420 ? 2 : (W < 640 ? 3 : 5);
    for (var i = 0; i <= xTickCount; i++) {
      var tt = tMin + (tMax - tMin) * (i / xTickCount);
      var xx = xt(tt);
      var anchor = i === 0 ? 'start' : (i === xTickCount ? 'end' : 'middle');
      var lbl2 = svgEl('text', { class: 'axis-label', x: xx.toFixed(1), y: (H - margin.bottom + 17).toFixed(1), 'text-anchor': anchor });
      lbl2.textContent = fmtTick.format(new Date(tt));
      svg.appendChild(lbl2);
    }

    // Per-extension lines, oldest-first color order (never by rank).
    series.forEach(function (s) {
      var d = pathFor(s.points, xt, y);
      if (!d) return;
      var path = svgEl('path', { class: 'series-line' + (s.retired ? ' retired' : ''), d: d });
      path.style.stroke = s.color;
      svg.appendChild(path);
      var last = lastReal(s.points);
      if (last) {
        var dot = svgEl('circle', { class: 'series-dot', cx: xt(last.t.getTime()).toFixed(1), cy: y(last.users).toFixed(1), r: 4 });
        dot.style.fill = s.color;
        svg.appendChild(dot);
      }
    });

    // Total — bold, neutral ink: the aggregate, not a peer category.
    var totalD = pathFor(totalPoints, xt, y);
    if (totalD) {
      svg.appendChild(svgEl('path', { class: 'total-line', d: totalD }));
      var lastTotal = totalPoints[totalPoints.length - 1];
      var lx = xt(lastTotal.t.getTime()), ly = y(lastTotal.users);
      var label = svgEl('text', { class: 'direct-label', x: lx.toFixed(1), y: (ly - 8).toFixed(1), 'text-anchor': 'end' });
      label.textContent = 'Total';
      svg.appendChild(label);
    }

    // Crosshair line, drawn last (on top), hidden until the hover layer positions it.
    var crosshair = svgEl('line', { class: 'crosshair', y1: margin.top, y2: H - margin.bottom, x1: -100, x2: -100 });
    svg.appendChild(crosshair);

    // Transparent hit layer on top, sized to the plot area — pointermove needs a target.
    var hit = svgEl('rect', { x: margin.left, y: margin.top, width: Math.max(0, innerW), height: Math.max(0, innerH), fill: 'transparent' });
    svg.appendChild(hit);

    return { W: W, H: H, margin: margin, tMin: tMin, tMax: tMax, xt: xt, y: y, crosshair: crosshair, hit: hit };
  }

  function attachHover(svg, tooltip, series, totalPoints, allStamps, getScale) {
    if (!allStamps.length) return;

    function nearestStamp(tPointer) {
      var lo = 0, hi = allStamps.length - 1;
      if (tPointer <= allStamps[0]) return allStamps[0];
      if (tPointer >= allStamps[hi]) return allStamps[hi];
      while (lo < hi - 1) {
        var mid = (lo + hi) >> 1;
        if (allStamps[mid] < tPointer) lo = mid; else hi = mid;
      }
      return (tPointer - allStamps[lo] <= allStamps[hi] - tPointer) ? allStamps[lo] : allStamps[hi];
    }

    function nearestValue(points, stamp) {
      var best = null, bestDiff = Infinity;
      points.forEach(function (p) {
        var diff = Math.abs(p.t.getTime() - stamp);
        if (diff < bestDiff) { bestDiff = diff; best = p; }
      });
      if (!best || bestDiff > MAX_SNAP_GAP_MS) return null;
      return best;
    }

    function showAt(stamp, clientX, clientY) {
      var scale = getScale();
      if (!scale) return;
      var xx = scale.xt(stamp);
      scale.crosshair.setAttribute('x1', xx.toFixed(1));
      scale.crosshair.setAttribute('x2', xx.toFixed(1));

      var rows = [];
      series.forEach(function (s) {
        var p = nearestValue(s.points, stamp);
        rows.push({ name: s.name + (s.retired ? ' (retired)' : ''), color: s.color, value: p && p.users != null ? p.users : null });
      });
      var totalP = nearestValue(totalPoints, stamp);

      tooltip.innerHTML = '';
      var dateEl = document.createElement('div');
      dateEl.className = 'tt-date';
      dateEl.textContent = fmtTooltipDate.format(new Date(stamp));
      tooltip.appendChild(dateEl);

      function addRow(name, color, value, bold) {
        var row = document.createElement('div');
        row.className = 'tt-row';
        var key = document.createElement('span');
        key.className = 'tt-key';
        key.style.background = color;
        var nameEl = document.createElement('span');
        nameEl.className = 'tt-name';
        nameEl.textContent = name;
        var valEl = document.createElement('span');
        valEl.className = 'tt-value';
        valEl.textContent = value == null ? '—' : value.toLocaleString();
        if (bold) valEl.style.fontWeight = '700';
        row.appendChild(key); row.appendChild(nameEl); row.appendChild(valEl);
        tooltip.appendChild(row);
      }
      addRow('Total', 'var(--total-line)', totalP ? totalP.users : null, true);
      rows.forEach(function (r) { addRow(r.name, r.color, r.value, false); });

      tooltip.hidden = false;
      var svgRect = svg.getBoundingClientRect();
      var left = clientX - svgRect.left + 14;
      var top = clientY - svgRect.top + 14;
      if (left + 220 > svgRect.width) left = clientX - svgRect.left - 234;
      tooltip.style.transform = 'translate(' + Math.max(0, left) + 'px,' + Math.max(0, top) + 'px)';
    }

    function hide() {
      var scale = getScale();
      if (scale) { scale.crosshair.setAttribute('x1', -100); scale.crosshair.setAttribute('x2', -100); }
      tooltip.hidden = true;
    }

    function onMove(evt) {
      var scale = getScale();
      if (!scale) return;
      var svgRect = svg.getBoundingClientRect();
      var px = (evt.clientX - svgRect.left) / svgRect.width * scale.W;
      var tPointer = scale.tMin + (px - scale.margin.left) / Math.max(1, (scale.W - scale.margin.left - scale.margin.right)) * (scale.tMax - scale.tMin);
      var stamp = nearestStamp(tPointer);
      showAt(stamp, evt.clientX, evt.clientY);
    }

    svg.addEventListener('pointermove', onMove);
    svg.addEventListener('pointerleave', hide);

    // Keyboard: the same tooltip content on focus, stepped with the arrow keys.
    svg.setAttribute('tabindex', '0');
    svg.setAttribute('role', 'img');
    var focusIdx = allStamps.length - 1;
    svg.addEventListener('keydown', function (evt) {
      if (evt.key !== 'ArrowLeft' && evt.key !== 'ArrowRight') return;
      evt.preventDefault();
      focusIdx = Math.min(allStamps.length - 1, Math.max(0, focusIdx + (evt.key === 'ArrowRight' ? 1 : -1)));
      var scale = getScale();
      if (!scale) return;
      var xx = scale.xt(allStamps[focusIdx]);
      var svgRect = svg.getBoundingClientRect();
      var clientX = svgRect.left + xx / scale.W * svgRect.width;
      var clientY = svgRect.top + svgRect.height / 2;
      showAt(allStamps[focusIdx], clientX, clientY);
    });
    svg.addEventListener('blur', hide);
  }

  function renderLegend(series) {
    if (!legendEl) return;
    legendEl.innerHTML = '';
    function item(color, name, cls) {
      var li = document.createElement('li');
      var key = document.createElement('span');
      key.className = 'legend-key' + (cls ? ' ' + cls : '');
      key.style.background = color;
      key.style.color = color;
      var nameEl = document.createElement('span');
      nameEl.textContent = name;
      li.appendChild(key); li.appendChild(nameEl);
      legendEl.appendChild(li);
    }
    item('var(--total-line)', 'Total', 'total');
    series.forEach(function (s) {
      item(s.color, s.name + (s.retired ? ' (retired)' : ''), s.retired ? 'retired' : '');
    });
  }

  function renderTable(series) {
    if (!tableBody) return;
    tableBody.innerHTML = '';
    var rows = series.slice().sort(function (a, b) {
      if (a.retired !== b.retired) return a.retired ? 1 : -1;
      return a.name.localeCompare(b.name);
    });
    rows.forEach(function (s) {
      var last = s.points[s.points.length - 1];
      var tr = document.createElement('tr');
      function td(text, cls) {
        var c = document.createElement('td');
        if (cls) c.className = cls;
        c.textContent = text;
        tr.appendChild(c);
      }
      td(s.name);
      td(last && last.users != null ? last.users.toLocaleString() : '—', 'num');
      td(last ? last.rating.toFixed(1) : '—', 'num');
      td(last ? last.reviews.toLocaleString() : '—', 'num');
      td(last ? last.version : '—');
      var statusTd = document.createElement('td');
      if (s.retired) { statusTd.className = 'status-retired'; statusTd.textContent = 'Retired'; }
      tr.appendChild(statusTd);
      tableBody.appendChild(tr);
    });
  }
})();

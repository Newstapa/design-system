/* 뉴스타파 그래픽 엔진 v0.1
 * spec(JSON) + tokens(JSON) → 디자인 가이드가 적용된 그래픽 DOM
 * 색·폰트 크기는 tokens.json에서만 가져온다. spec에서 직접 색을 지정하지 않는다.
 */
(function () {
  'use strict';
  var T, C, F, W, warnings;
  var SVGNS = 'http://www.w3.org/2000/svg';
  var GRID = '#C9C9C9';
  // 글자 크기·색·여백은 tokens.json(1200px 기준)에서 온다.
  // 막대 두께·간격 같은 엔진 내부 치수는 그래픽 너비에 비례한다: u(n) = n × 너비/1000 (1200px이면 1.2배).
  var U = 1;
  function u(n) { return n * U; }

  // ---------- 공통 도우미 ----------
  function warn(msg) { warnings.push(msg); }
  function h(tag, attrs, html) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) { if (k === 'class') e.className = attrs[k]; else if (k === 'style') e.style.cssText = attrs[k]; else e.setAttribute(k, attrs[k]); }
    if (html != null) e.innerHTML = html;
    return e;
  }
  function s(tag, attrs, text) {
    var e = document.createElementNS(SVGNS, tag);
    if (attrs) for (var k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  }
  function esc(t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  var _ctx;
  function measure(text, size, weight) {
    if (!_ctx) _ctx = document.createElement('canvas').getContext('2d');
    _ctx.font = (weight || 400) + ' ' + size + 'px "Pretendard Variable"';
    return _ctx.measureText(String(text)).width;
  }
  function wrap(text, size, weight, maxW) {
    var words = String(text).split(/\s+/), lines = [], cur = '';
    words.forEach(function (w) {
      var t = cur ? cur + ' ' + w : w;
      if (measure(t, size, weight) <= maxW || !cur) cur = t; else { lines.push(cur); cur = w; }
    });
    if (cur) lines.push(cur);
    return lines;
  }
  function decimalsOf(arr) {
    var d = 0; arr.forEach(function (v) { if (v == null) return; var m = String(v).split('.')[1]; if (m) d = Math.max(d, m.length); });
    return Math.min(d, 2);
  }
  function fmt(v, dec, suffix, signed) {
    if (v == null || v === '') return '';
    if (typeof v !== 'number') return String(v);
    var str = Math.abs(v).toLocaleString('ko-KR', { minimumFractionDigits: dec || 0, maximumFractionDigits: dec || 0 });
    var zero = Number(str.replace(/,/g, '')) === 0;
    var sign = v < 0 && !zero ? '−' : (signed && v > 0 && !zero ? '+' : '');
    return sign + str + (suffix || '');
  }
  // 단위는 첫 값(과 강조값)에만 붙인다. suffixAll: true면 모두
  function sfx(spec, i, hl) {
    var suf = spec.valueSuffix || ''; if (!suf) return '';
    return spec.suffixAll || i === 0 || hl ? suf : '';
  }
  // 회색 계열 색을 글자색으로 쓸 때 읽히도록 진하게
  function textColor(col) {
    var map = { '#C4C4C4': '#8A8A8A', '#E0E0E0': '#9A9A9A', '#9A9A9A': '#7A7A7A', '#B8B8B8': '#8A8A8A', '#CFCFCF': '#9A9A9A' };
    if (col === C.point) return C.pointDark;
    return map[String(col).toUpperCase()] || col;
  }
  function niceTicks(min, max, count) {
    if (min === max) { max = min + 1; }
    var span = max - min, step = Math.pow(10, Math.floor(Math.log10(span / count))), err = span / count / step;
    if (err >= 7.5) step *= 10; else if (err >= 3.5) step *= 5; else if (err >= 1.5) step *= 2;
    var lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step, ticks = [];
    for (var v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
    return ticks;
  }
  function svgRoot(w, hgt) { return s('svg', { width: w, height: hgt, viewBox: '0 0 ' + w + ' ' + hgt }); }
  function txt(parent, x, y, str, o) {
    o = o || {};
    if (o.halo) { var hh = s('text', { x: x, y: y, 'font-size': o.size || F.label.size, 'font-weight': o.weight || 400, fill: 'none', stroke: o.halo, 'stroke-width': 5, 'stroke-linejoin': 'round', 'text-anchor': o.anchor || 'start', 'dominant-baseline': o.baseline || 'middle' }, str); parent.appendChild(hh); }
    var t = s('text', {
      x: x, y: y, 'font-size': o.size || F.label.size, 'font-weight': o.weight || 400,
      fill: o.fill || C.text, 'text-anchor': o.anchor || 'start', 'dominant-baseline': o.baseline || 'middle',
      'letter-spacing': o.ls || null
    }, str);
    parent.appendChild(t); return t;
  }
  function isHL(spec, label, item) {
    if (item && item.highlight) return true;
    var hl = spec.highlight; if (!hl) return false;
    if (!Array.isArray(hl)) hl = [hl];
    return hl.indexOf(label) >= 0;
  }
  function legendText(items) {
    var lg = h('div', { class: 'nt-legend text' });
    items.forEach(function (it) { lg.appendChild(h('span', { style: 'color:' + textColor(it.color) }, esc(it.name))); });
    return lg;
  }
  function legend(items) {
    var lg = h('div', { class: 'nt-legend' });
    items.forEach(function (it) {
      lg.appendChild(h('span', null, '<i class="' + (it.line ? 'line' : '') + '" style="background:' + it.color + '"></i>' + esc(it.name)));
    });
    return lg;
  }
  var DARK = ['#2F5C8A', '#3E9C84', '#8A6FB0', '#6B6B6B', '#222222'];
  function onColor(fill) { var f = String(fill).toUpperCase(); return f === C.point.toUpperCase() || f === C.pointDark.toUpperCase() || DARK.indexOf(f) >= 0 || T.palette.sequential.slice(-2).indexOf(f) >= 0 ? '#FFFFFF' : C.ink; }

  // ---------- 막대 그래프 ----------
  function renderBar(spec, body) {
    if (spec.series) return spec.grouped ? renderGrouped(spec, body) : renderStacked(spec, body);
    var data = spec.data.slice();
    if (data.length > T.limits.barMaxItems) warn('막대가 ' + data.length + '개입니다. 15개 이하로 줄이거나 상위 항목만 보여주세요.');
    if (spec.sort === 'desc') data.sort(function (a, b) { return b.value - a.value; });
    if (spec.sort === 'asc') data.sort(function (a, b) { return a.value - b.value; });
    var hlCount = data.filter(function (d) { return isHL(spec, d.label, d); }).length;
    if (hlCount === 0 && spec.highlight !== false) {
      var mx = data.reduce(function (a, b) { return b.value > a.value ? b : a; });
      mx.highlight = true; hlCount = 1;
      warn('강조 항목(highlight)이 없어 최댓값 "' + mx.label + '"을 강조했습니다. 기사 핵심에 맞게 지정하세요.');
    }
    if (hlCount > T.limits.highlightMax) warn('강조 막대가 ' + hlCount + '개입니다. 포인트 컬러는 1~2개에만 쓰세요.');
    var dec = spec.decimals != null ? spec.decimals : decimalsOf(data.map(function (d) { return d.value; }));
    var suf = spec.valueSuffix || '';
    var orient = spec.orientation || 'horizontal';
    return orient === 'vertical' ? barV(spec, body, data, dec, suf) : barH(spec, body, data, dec, suf);
  }

  function barH(spec, body, data, dec, suf) {
    var ls = F.label.size, maxLabelW = u(300);
    var labelLines = data.map(function (d) { return wrap(d.label, ls, 500, maxLabelW); });
    var labelW = Math.min(maxLabelW, Math.max.apply(null, labelLines.map(function (L) { return Math.max.apply(null, L.map(function (l) { return measure(l, ls, 500); })); }))) + u(20);
    var vals = data.map(function (d) { return d.value; });
    var signed = spec.signed != null ? spec.signed : data.some(function (d) { return d.value < 0; });
    var valueW = Math.max.apply(null, data.map(function (d) { return measure(fmt(d.value, dec, suf, signed), F.dataLabel.size, 700); })) + u(14);
    var min = Math.min(0, Math.min.apply(null, vals)), max = Math.max(0, Math.max.apply(null, vals));
    var plotW = W - labelW - valueW - (min < 0 ? valueW : 0);
    var x0 = labelW + (min < 0 ? valueW : 0);
    var scale = function (v) { return (v - min) / (max - min || 1) * plotW; };
    var barH_ = spec.barHeight || u(30), gap = u(18), y = 0, rows = [];
    data.forEach(function (d, i) {
      var lh = labelLines[i].length * ls * 1.32, rowH = Math.max(barH_, lh); rows.push({ y: y, h: rowH }); y += rowH + gap;
    });
    var svgH = y - gap + 4, svg = svgRoot(W, svgH), zx = x0 + scale(0);
    data.forEach(function (d, i) {
      var r = rows[i], cy = r.y + r.h / 2, hl = isHL(spec, d.label, d);
      var xa = x0 + scale(Math.min(0, d.value)), xb = x0 + scale(Math.max(0, d.value));
      svg.appendChild(s('rect', { x: xa, y: cy - barH_ / 2, width: Math.max(1, xb - xa), height: barH_, fill: hl ? C.point : C.base }));
      var L = labelLines[i];
      L.forEach(function (l, k) { txt(svg, labelW - u(20), cy + (k - (L.length - 1) / 2) * ls * 1.32, l, { anchor: 'end', size: ls, weight: hl ? 700 : 500, fill: hl ? C.ink : C.text }); });
      var neg = d.value < 0;
      txt(svg, neg ? xa - u(8) : xb + u(8), cy, fmt(d.value, dec, sfx(spec, i, hl), signed), { anchor: neg ? 'end' : 'start', size: F.dataLabel.size, weight: 700, fill: hl ? C.pointDark : C.baseDark });
    });
    svg.appendChild(s('line', { x1: zx, x2: zx, y1: -4, y2: svgH, stroke: C.rule, 'stroke-width': u(1.5) }));
    body.appendChild(svg);
  }

  function barV(spec, body, data, dec, suf) {
    var n = data.length, vals = data.map(function (d) { return d.value; });
    var min = Math.min(0, Math.min.apply(null, vals)), max = Math.max(0, Math.max.apply(null, vals));
    var showAxis = spec.showAxis != null ? spec.showAxis : n > 12;
    var ticks = niceTicks(min, max, 5); min = Math.min(min, ticks[0]); if (showAxis) max = ticks[ticks.length - 1];
    var axisW = showAxis ? Math.max.apply(null, ticks.map(function (t) { return measure(fmt(t, 0), F.axis.size); })) + u(14) : 0;
    var topPad = F.dataLabel.size * 1.8, plotH = spec.plotHeight || u(400), plotW = W - axisW, band = plotW / n, bw = Math.min(band * 0.62, u(84));
    var lsz = F.label.size - 1;
    var wrapped = data.map(function (d) { return [].concat.apply([], String(d.label).split('\n').map(function (part) { return wrap(part, lsz, 500, band - 10); })); });
    var wrapW = Math.max.apply(null, wrapped.map(function (L) { return Math.max.apply(null, L.map(function (l) { return measure(l, lsz, 500); })); }));
    var fitsWrapped = wrapW <= band - 6 && Math.max.apply(null, wrapped.map(function (l) { return l.length; })) <= 3;
    var labW = Math.max.apply(null, data.map(function (d) { return measure(String(d.label).replace(/\n/g, ' '), F.axis.size, 500); }));
    var every = fitsWrapped ? 1 : Math.max(1, Math.ceil((labW + u(14)) / band));
    var labelLines = data.map(function (d, i) { return every === 1 ? wrapped[i] : [String(d.label).replace(/\n/g, ' ')]; });
    var maxLines = Math.max.apply(null, labelLines.map(function (l) { return l.length; }));
    var svgH = topPad + plotH + u(16) + maxLines * lsz * 1.3 + u(6), svg = svgRoot(W, svgH);
    var sy = function (v) { return topPad + plotH - (v - min) / (max - min || 1) * plotH; };
    if (showAxis) ticks.forEach(function (t) {
      if (t < min || t > max) return;
      svg.appendChild(s('line', { x1: axisW, x2: W, y1: sy(t), y2: sy(t), stroke: GRID, 'stroke-width': 1, 'stroke-dasharray': '2 4' }));
      txt(svg, axisW - u(12), sy(t), fmt(t, 0), { anchor: 'end', size: F.axis.size, fill: C.subtext });
    });
    data.forEach(function (d, i) {
      var hl = isHL(spec, d.label, d), cx = axisW + band * i + band / 2;
      var ya = sy(Math.max(0, d.value)), yb = sy(Math.min(0, d.value));
      svg.appendChild(s('rect', { x: cx - bw / 2, y: ya, width: bw, height: Math.max(1, yb - ya), fill: hl ? C.point : C.base }));
      if (!showAxis || hl) txt(svg, cx, d.value < 0 ? yb + F.dataLabel.size * 0.8 : ya - F.dataLabel.size * 0.8, fmt(d.value, dec, sfx(spec, i, hl), spec.signed), { anchor: 'middle', size: n > 8 ? F.dataLabel.size - 3 : F.dataLabel.size, weight: 700, fill: hl ? C.pointDark : C.baseDark });
      if (i % every === 0 || i === n - 1 && every === 1) labelLines[i].forEach(function (l, k) {
        txt(svg, cx, topPad + plotH + lsz * 1.4 + k * lsz * 1.3, l, { anchor: 'middle', size: every === 1 ? F.label.size - 1 : F.axis.size, weight: hl ? 700 : 500, fill: hl ? C.ink : C.text });
      });
    });
    svg.appendChild(s('line', { x1: axisW, x2: W, y1: sy(0), y2: sy(0), stroke: C.rule, 'stroke-width': u(1.5) }));
    body.appendChild(svg);
  }

  // ---------- 누적 막대 ----------
  function seriesColors(spec, series) {
    var hlNames = series.filter(function (sr) { return sr.highlight || isHL(spec, sr.name); });
    if (hlNames.length) {
      var greys = T.palette.focus.slice(1), gi = 0;
      return series.map(function (sr) { return (sr.highlight || isHL(spec, sr.name)) ? C.point : greys[gi++ % greys.length]; });
    }
    return series.map(function (sr, i) { return T.palette.categorical[i % T.palette.categorical.length]; });
  }
  function renderStacked(spec, body) {
    var series = spec.series, cats = spec.labels.slice(), pct = !!spec.percent;
    var colors = seriesColors(spec, series);
    var refIdx = spec.reference != null ? cats.indexOf(spec.reference) : -1;
    var order = cats.map(function (_, i) { return i; });
    if (refIdx > 0) { order.splice(refIdx, 1); order.unshift(refIdx); }
    var totals = cats.map(function (_, ci) { return series.reduce(function (a, sr) { return a + (sr.values[ci] || 0); }, 0); });
    var dec = spec.decimals != null ? spec.decimals : decimalsOf([].concat.apply([], series.map(function (s) { return s.values; })));
    var suf = spec.valueSuffix || '';
    var labelW = Math.min(u(260), Math.max.apply(null, cats.map(function (c) { return measure(c, F.label.size, 600); }))) + u(20);
    var totalW = pct ? 0 : Math.max.apply(null, totals.map(function (t) { return measure(fmt(t, dec, suf), F.dataLabel.size, 700); })) + u(14);
    var plotW = W - labelW - totalW, maxT = pct ? 100 : Math.max.apply(null, totals);
    var segW = function (ci, si) { var v = series[si].values[ci] || 0; return (pct ? v / (totals[ci] || 1) * 100 : v) / maxT * plotW; };
    // 범례: 첫 행 구간 위에 색 글자로. 겹치면 범례 줄로 대체
    var first = order[0], x = labelW, heads = [], fits = true;
    series.forEach(function (sr, si) {
      var w = segW(first, si), tw = measure(sr.name, F.legend.size, 700);
      heads.push({ x: x + w / 2, w: tw }); x += w;
    });
    heads.forEach(function (hd, i) {
      if (i === 0 && hd.x - hd.w / 2 < labelW - 10) hd.x = labelW + hd.w / 2;
      if (i === heads.length - 1 && hd.x + hd.w / 2 > W) hd.x = W - hd.w / 2;
      if (i > 0 && heads[i - 1].x + heads[i - 1].w / 2 + u(14) > hd.x - hd.w / 2) fits = false;
    });
    if (!fits || spec.legend === 'row') body.appendChild(legendText(series.map(function (sr, i) { return { name: sr.name, color: colors[i] }; })));
    var bh = Math.max(u(40), F.dataLabel.size * 1.7), gap = u(20), top = fits && spec.legend !== 'row' ? F.legend.size * 2 : 0, sep = refIdx >= 0 ? u(26) : 0;
    var svgH = top + cats.length * (bh + gap) - gap + sep + 2, svg = svgRoot(W, svgH);
    if (top) heads.forEach(function (hd, si) { txt(svg, hd.x, F.legend.size * 0.75, series[si].name, { anchor: 'middle', size: F.legend.size, weight: 700, fill: textColor(colors[si]) }); });
    order.forEach(function (ci, k) {
      var y = top + k * (bh + gap) + (refIdx >= 0 && k > 0 ? sep : 0), x = labelW, cy = y + bh / 2, c = cats[ci];
      txt(svg, labelW - u(20), cy, c, { anchor: 'end', size: F.label.size, weight: ci === refIdx || isHL(spec, c) ? 700 : 500, fill: C.text });
      series.forEach(function (sr, si) {
        var v = sr.values[ci] || 0, w = segW(ci, si);
        svg.appendChild(s('rect', { x: x, y: y, width: Math.max(0, w - 1.5), height: bh, fill: colors[si] }));
        var lab = fmt(pct && spec.normalize ? v / totals[ci] * 100 : v, dec);
        if (w > measure(lab, F.dataLabel.size - 2, 700) + u(12)) txt(svg, x + w / 2, cy, lab, { anchor: 'middle', size: F.dataLabel.size - 2, weight: 700, fill: onColor(colors[si]) });
        x += w;
      });
      if (!pct) txt(svg, x + u(8), cy, fmt(totals[ci], dec, sfx(spec, k, false)), { size: F.dataLabel.size, weight: 700, fill: C.baseDark });
      if (refIdx >= 0 && k === 0) svg.appendChild(s('line', { x1: 0, x2: W, y1: y + bh + gap / 2 + sep / 2, y2: y + bh + gap / 2 + sep / 2, stroke: GRID, 'stroke-dasharray': '2 4' }));
    });
    body.appendChild(svg);
  }

  // ---------- 묶음·양방향 막대 ----------
  function renderGrouped(spec, body) {
    var series = spec.series, cats = spec.labels, colors = seriesColors(spec, series);
    body.appendChild(legendText(series.map(function (sr, i) { return { name: sr.name, color: colors[i] }; })));
    var all = [].concat.apply([], series.map(function (sr) { return sr.values; })).filter(function (v) { return v != null; });
    var dec = spec.decimals != null ? spec.decimals : decimalsOf(all), suf = spec.valueSuffix || '';
    var signed = spec.signed != null ? spec.signed : all.some(function (v) { return v < 0; });
    var min = Math.min(0, Math.min.apply(null, all)), max = Math.max(0, Math.max.apply(null, all));
    var labelLines = cats.map(function (c) { return wrap(c, F.label.size, 500, u(240)); });
    var labelW = Math.max.apply(null, labelLines.map(function (L) { return Math.max.apply(null, L.map(function (l) { return measure(l, F.label.size, 500); })); })) + u(24);
    var vw = Math.max.apply(null, all.map(function (v) { return measure(fmt(v, dec, suf, signed), F.dataLabel.size - 1, 700); })) + u(12);
    var plotW = W - labelW - vw - (min < 0 ? vw : 0), x0 = labelW + (min < 0 ? vw : 0);
    var sx = function (v) { return x0 + (v - min) / (max - min || 1) * plotW; };
    var bh = Math.max(u(24), F.dataLabel.size * 1.15), inner = u(6), gpad = u(16), gh = series.length * bh + (series.length - 1) * inner;
    var svgH = cats.length * (gh + gpad * 2), svg = svgRoot(W, svgH);
    cats.forEach(function (c, ci) {
      var gy = ci * (gh + gpad * 2) + gpad;
      labelLines[ci].forEach(function (l, k) { txt(svg, labelW - u(24), gy + gh / 2 + (k - (labelLines[ci].length - 1) / 2) * F.label.size * 1.3, l, { anchor: 'end', size: F.label.size, weight: isHL(spec, c) ? 700 : 500, fill: C.text }); });
      series.forEach(function (sr, si) {
        var v = sr.values[ci]; if (v == null) return;
        var y = gy + si * (bh + inner), xa = sx(Math.min(0, v)), xb = sx(Math.max(0, v));
        svg.appendChild(s('rect', { x: xa, y: y, width: Math.max(1.5, xb - xa), height: bh, fill: colors[si] }));
        txt(svg, v < 0 ? xa - u(8) : xb + u(8), y + bh / 2, fmt(v, dec, ci === 0 && si === 0 || spec.suffixAll ? suf : '', signed), { anchor: v < 0 ? 'end' : 'start', size: F.dataLabel.size - 1, weight: 700, fill: textColor(colors[si]) });
      });
      if (ci < cats.length - 1) svg.appendChild(s('line', { x1: 0, x2: W, y1: gy + gh + gpad, y2: gy + gh + gpad, stroke: GRID, 'stroke-dasharray': '2 4' }));
    });
    svg.appendChild(s('line', { x1: sx(0), x2: sx(0), y1: 0, y2: svgH, stroke: C.rule, 'stroke-width': u(1.5) }));
    body.appendChild(svg);
  }

  // ---------- 화살표 점 그래프 (전→후) ----------
  function renderDot(spec, body) {
    var rows = spec.data, fromName = spec.fromLabel || '이전', toName = spec.toLabel || '이후';
    var FROM = '#B5B5B5', TO = C.baseDark, LG = Math.round(F.legend.size * 0.8);
    if (!rows.some(function (r) { return isHL(spec, r.label, r); })) warn('강조 행(highlight)이 없습니다. 변화가 가장 중요한 항목을 지정하세요.');
    var all = [].concat.apply([], rows.map(function (r) { return [r.from, r.to]; }));
    var dec = spec.decimals != null ? spec.decimals : decimalsOf(all), suf = spec.valueSuffix || '';
    var ticks = niceTicks(spec.xMin != null ? spec.xMin : Math.min.apply(null, all), spec.xMax != null ? spec.xMax : Math.max.apply(null, all), 5);
    var lo = ticks[0], hi = ticks[ticks.length - 1];
    var labelLines = rows.map(function (r) { return wrap(r.label, F.label.size, 500, u(220)); });
    var labelW = Math.max.apply(null, labelLines.map(function (L) { return Math.max.apply(null, L.map(function (l) { return measure(l, F.label.size, 500); })); })) + u(28);
    var vw = Math.max.apply(null, all.map(function (v) { return measure(fmt(v, dec, suf), F.dataLabel.size - 1, 700); })) + u(22);
    var plotX0 = labelW + vw, plotW = W - plotX0 - vw;
    var sx = function (v) { return plotX0 + (v - lo) / (hi - lo || 1) * plotW; };
    var lgd = h('div', { class: 'nt-legend text' });
    lgd.appendChild(h('span', { style: 'color:#8A8A8A' }, '<i style="width:' + LG + 'px;height:' + LG + 'px;border-radius:50%;background:#E6E6E6;border:2px solid ' + FROM + '"></i>' + esc(fromName)));
    lgd.appendChild(h('span', { style: 'color:' + TO }, '<i style="width:' + LG + 'px;height:' + LG + 'px;border-radius:50%;background:' + TO + '"></i>' + esc(toName)));
    lgd.appendChild(h('span', { style: 'color:' + C.ink + ';font-weight:500' }, '<b style="font-weight:700;margin-right:6px">→</b>변화'));
    body.appendChild(lgd);
    var tdec = decimalsOf(ticks);
    var rh = Math.max(u(58), F.label.size * 2.4, Math.max.apply(null, labelLines.map(function (l) { return l.length * F.label.size * 1.3 + u(12); })));
    var svgH = rows.length * rh + F.axis.size * 2.6, svg = svgRoot(W, svgH);
    var defs = s('defs'); svg.appendChild(defs);
    function marker(id, col) { var m = s('marker', { id: id, viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }); m.appendChild(s('path', { d: 'M0,0 L10,5 L0,10 z', fill: col })); defs.appendChild(m); }
    marker('ah', C.ink); marker('ahp', C.pointDark);
    ticks.forEach(function (t) { svg.appendChild(s('line', { x1: sx(t), x2: sx(t), y1: 0, y2: rows.length * rh, stroke: GRID, 'stroke-dasharray': '2 4' })); txt(svg, sx(t), rows.length * rh + F.axis.size * 1.4, fmt(t, tdec), { anchor: 'middle', size: F.axis.size, fill: C.subtext }); });
    rows.forEach(function (r, i) {
      var cy = i * rh + rh / 2, hl = isHL(spec, r.label, r), xf = sx(r.from), xt = sx(r.to), R = u(10), dir = xt >= xf ? 1 : -1;
      svg.appendChild(s('line', { x1: 0, x2: W, y1: cy, y2: cy, stroke: '#EDEDED' }));
      labelLines[i].forEach(function (l, k) { txt(svg, labelW - u(28), cy + (k - (labelLines[i].length - 1) / 2) * F.label.size * 1.3, l, { anchor: 'end', size: F.label.size, weight: hl ? 700 : 500, fill: hl ? C.ink : C.text }); });
      if (Math.abs(xt - xf) > 2 * R + 10) svg.appendChild(s('line', { x1: xf + dir * (R + 2), x2: xt - dir * (R + 4), y1: cy, y2: cy, stroke: hl ? C.pointDark : C.ink, 'stroke-width': u(1.6), 'marker-end': 'url(#' + (hl ? 'ahp' : 'ah') + ')' }));
      svg.appendChild(s('circle', { cx: xf, cy: cy, r: R, fill: '#E6E6E6', stroke: FROM, 'stroke-width': u(2) }));
      svg.appendChild(s('circle', { cx: xt, cy: cy, r: R, fill: hl ? C.point : TO, stroke: C.background, 'stroke-width': 1.5 }));
      var uu = i === 0 || spec.suffixAll ? suf : '';
      var leftIsFrom = xf <= xt;
      txt(svg, (leftIsFrom ? xf : xt) - R - u(8), cy, fmt(leftIsFrom ? r.from : r.to, dec, uu), { anchor: 'end', size: F.dataLabel.size - 1, weight: leftIsFrom ? 500 : 700, fill: leftIsFrom ? '#8A8A8A' : (hl ? C.pointDark : TO) });
      txt(svg, (leftIsFrom ? xt : xf) + R + u(8), cy, fmt(leftIsFrom ? r.to : r.from, dec, uu), { size: F.dataLabel.size - 1, weight: leftIsFrom ? 700 : 500, fill: leftIsFrom ? (hl ? C.pointDark : TO) : '#8A8A8A' });
    });
    body.appendChild(svg);
  }

  // ---------- 기울기 그래프 (시작·끝) ----------
  function renderSlope(spec, body) {
    var series = spec.series, xl = spec.x || ['', ''];
    var hasHL = series.some(function (sr) { return sr.highlight || isHL(spec, sr.name); });
    if (!hasHL) warn('강조할 선(highlight)이 없습니다.');
    var greys = ['#6B6B6B', '#9A9A9A', '#B8B8B8', '#CFCFCF'], gi = 0;
    var colors = series.map(function (sr) { return (sr.highlight || isHL(spec, sr.name)) ? C.point : greys[gi++ % greys.length]; });
    var all = [].concat.apply([], series.map(function (sr) { return sr.values; }));
    var dec = spec.decimals != null ? spec.decimals : decimalsOf(all), suf = spec.valueSuffix || '';
    var lo = Math.min.apply(null, all), hi = Math.max.apply(null, all);
    var leftW = Math.max.apply(null, series.map(function (sr, i) { return measure(fmt(sr.values[0], dec, i === 0 ? suf : ''), F.dataLabel.size, 700); })) + u(16);
    var rightW = Math.max.apply(null, series.map(function (sr, i) { return measure(fmt(sr.values[1], dec, i === 0 ? suf : '') + '  ' + sr.name, F.dataLabel.size, 700); })) + u(16);
    var plotW = Math.min(W - leftW - rightW, u(560)), x0 = leftW + Math.max(0, (W - leftW - rightW - plotW) / 2) * 0.4, x1 = x0 + plotW;
    var plotH = spec.plotHeight || u(440), top = u(20), svgH = top + plotH + F.label.size * 2.6, svg = svgRoot(W, svgH);
    var sy = function (v) { return top + plotH - (v - lo) / (hi - lo || 1) * plotH; };
    [x0, x1].forEach(function (x, k) { svg.appendChild(s('line', { x1: x, x2: x, y1: top - 10, y2: top + plotH + 10, stroke: GRID, 'stroke-dasharray': '2 4' })); txt(svg, x, top + plotH + F.label.size * 1.7, xl[k], { anchor: 'middle', size: F.label.size, weight: 700, fill: C.text }); });
    var order = series.map(function (_, i) { return i; }).sort(function (a, b) { return (colors[a] === C.point) - (colors[b] === C.point); });
    function relax(arr) { arr.sort(function (a, b) { return a.y - b.y; }); for (var it = 0; it < 40; it++) for (var k = 1; k < arr.length; k++) { var ov = arr[k - 1].y + F.dataLabel.size * 1.25 - arr[k].y; if (ov > 0) { arr[k - 1].y -= ov / 2; arr[k].y += ov / 2; } } }
    var L = [], Rr = [];
    order.forEach(function (i) {
      var sr = series[i], hl = colors[i] === C.point, a = sy(sr.values[0]), b = sy(sr.values[1]);
      svg.appendChild(s('line', { x1: x0, y1: a, x2: x1, y2: b, stroke: colors[i], 'stroke-width': hl ? u(4.5) : u(2.5), 'stroke-linecap': 'round' }));
      [[x0, a], [x1, b]].forEach(function (p) { svg.appendChild(s('circle', { cx: p[0], cy: p[1], r: hl ? u(7) : u(5.5), fill: C.background, stroke: colors[i], 'stroke-width': hl ? u(3.5) : u(2.5) })); });
      L.push({ y: a, i: i }); Rr.push({ y: b, i: i });
    });
    relax(L); relax(Rr);
    L.forEach(function (e) { var sr = series[e.i]; txt(svg, x0 - u(14), e.y, fmt(sr.values[0], dec, e.i === 0 || spec.suffixAll ? suf : ''), { anchor: 'end', size: F.dataLabel.size, weight: 700, fill: textColor(colors[e.i]) }); });
    Rr.forEach(function (e) { var sr = series[e.i], t = txt(svg, x1 + u(14), e.y, '', { size: F.dataLabel.size, weight: 700, fill: textColor(colors[e.i]) });
      t.appendChild(s('tspan', null, fmt(sr.values[1], dec, e.i === 0 || spec.suffixAll ? suf : '') + '  '));
      t.appendChild(s('tspan', { 'font-weight': 600 }, sr.name)); });
    body.appendChild(svg);
  }

  // ---------- 꺾은선 그래프 ----------
  function renderLine(spec, body) {
    var xs = spec.x, series = spec.series;
    if (series.length > T.limits.lineMaxSeries) warn('선이 ' + series.length + '개입니다. 5개 이하로 줄이세요.');
    var hasHL = series.some(function (sr) { return sr.highlight || isHL(spec, sr.name); });
    if (!hasHL && series.length > 1) warn('강조할 선(highlight)이 없습니다. 기사 핵심 계열 하나를 highlight로 지정하면 읽기 쉬워집니다.');
    var greys = ['#6B6B6B', '#9A9A9A', '#B8B8B8', '#CFCFCF'], gi = 0;
    var colors = series.map(function (sr, i) {
      if (series.length === 1) return C.point;
      if (hasHL) return (sr.highlight || isHL(spec, sr.name)) ? C.point : greys[gi++ % greys.length];
      return T.palette.categorical[i % T.palette.categorical.length];
    });
    var all = [].concat.apply([], series.map(function (sr) { return sr.values.filter(function (v) { return v != null; }); }));
    var dec = spec.decimals != null ? spec.decimals : decimalsOf(all), suf = spec.valueSuffix || '';
    var lo = spec.yMin != null ? spec.yMin : Math.min.apply(null, all), hi = spec.yMax != null ? spec.yMax : Math.max.apply(null, all);
    if (spec.yMin == null && lo > 0 && lo / hi < 0.35) lo = 0;
    var ticks = niceTicks(lo, hi, 5); lo = ticks[0]; hi = ticks[ticks.length - 1];
    var axisW = Math.max.apply(null, ticks.map(function (t) { return measure(fmt(t, 0), F.axis.size); })) + u(14);
    var endW = series.length > 1 || spec.endLabel !== false ? Math.max.apply(null, series.map(function (sr) {
      return Math.max(measure(series.length > 1 ? sr.name : '', F.legend.size, 700), measure(fmt(sr.values[sr.values.length - 1], dec, suf), F.dataLabel.size, 700));
    })) + u(22) : u(10);
    endW = Math.min(endW, u(190) * F.dataLabel.size / 24);
    var topPad = spec.annotations ? F.axis.size * 3.2 : F.dataLabel.size * 1.2, plotH = spec.plotHeight || u(400), plotW = W - axisW - endW;
    var svgH = topPad + plotH + F.axis.size * 2.8, svg = svgRoot(W, svgH), n = xs.length;
    var sx = function (i) { return axisW + u(8) + (n === 1 ? plotW / 2 : i / (n - 1) * (plotW - u(16))); };
    var sy = function (v) { return topPad + plotH - (v - lo) / (hi - lo || 1) * plotH; };
    ticks.forEach(function (t, k) {
      svg.appendChild(s('line', { x1: axisW, x2: axisW + plotW, y1: sy(t), y2: sy(t), stroke: k === 0 ? C.rule : GRID, 'stroke-width': k === 0 ? u(1.5) : 1, 'stroke-dasharray': k === 0 ? null : '2 4' }));
      txt(svg, axisW - u(12), sy(t), fmt(t, 0), { anchor: 'end', size: F.axis.size, fill: C.subtext });
    });
    var maxLab = Math.max.apply(null, xs.map(function (x) { return measure(x, F.axis.size); }));
    var every = Math.max(1, Math.ceil((maxLab + u(24)) / ((plotW - u(16)) / Math.max(1, n - 1))));
    xs.forEach(function (x, i) {
      if (i % every !== 0 && i !== n - 1) return;
      if (i !== n - 1 && n - 1 - i < every && i % every === 0 && i !== 0) return;
      svg.appendChild(s('line', { x1: sx(i), x2: sx(i), y1: sy(lo), y2: sy(lo) + u(6), stroke: C.rule }));
      txt(svg, sx(i), sy(lo) + F.axis.size * 1.55, x, { anchor: 'middle', size: F.axis.size, fill: C.subtext });
    });
    (spec.annotations || []).forEach(function (a) {
      var i = xs.indexOf(a.x); if (i < 0) return;
      svg.appendChild(s('line', { x1: sx(i), x2: sx(i), y1: topPad - F.axis.size * 1.1, y2: sy(lo), stroke: C.subtext, 'stroke-width': u(1.2), 'stroke-dasharray': '4 4' }));
      var anchor = sx(i) > W * 0.7 ? 'end' : 'start';
      txt(svg, sx(i) + (anchor === 'end' ? -u(8) : u(8)), topPad - F.axis.size * 1.8, a.text, { anchor: anchor, size: F.axis.size, weight: 600, fill: C.text });
    });
    var order = series.map(function (sr, i) { return i; }).sort(function (a, b) { return (colors[a] === C.point) - (colors[b] === C.point); });
    var ends = [];
    order.forEach(function (si) {
      var sr = series[si], hl = colors[si] === C.point && series.length > 1 || series.length === 1, d = '', pen = false;
      var dashI = spec.dashedFrom != null ? xs.indexOf(String(spec.dashedFrom)) : -1, d2 = '';
      sr.values.forEach(function (v, i) {
        if (v == null) { pen = false; return; }
        var pt = sx(i).toFixed(1) + ',' + sy(v).toFixed(1);
        if (dashI >= 0 && i >= dashI) { d2 += (d2 ? 'L' : 'M') + pt; if (i === dashI) { /* 이어지게 */ } }
        if (dashI < 0 || i <= dashI) { d += (pen ? 'L' : 'M') + pt; pen = true; }
      });
      if (dashI > 0 && sr.values[dashI - 1] != null) d2 = 'M' + sx(dashI - 1).toFixed(1) + ',' + sy(sr.values[dashI - 1]).toFixed(1) + d2.replace(/^M/, 'L');
      svg.appendChild(s('path', { d: d, fill: 'none', stroke: colors[si], 'stroke-width': hl ? u(4) : u(2.5), 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
      if (d2) svg.appendChild(s('path', { d: d2, fill: 'none', stroke: colors[si], 'stroke-width': hl ? u(4) : u(2.5), 'stroke-dasharray': '2 9', 'stroke-linecap': 'round' }));
      if (hl && n <= 16) sr.values.forEach(function (v, i) { if (v != null) svg.appendChild(s('circle', { cx: sx(i), cy: sy(v), r: u(5), fill: C.background, stroke: colors[si], 'stroke-width': u(3) })); });
      if (hl && spec.showValues) {
        // 값 라벨: 10개 이하면 전부, 많으면 처음·최고·최저·지정값만
        var vv = sr.values, idx = [];
        if (vv.filter(function (v) { return v != null; }).length <= 10) vv.forEach(function (v, i) { if (v != null) idx.push(i); });
        else {
          var nn = vv.map(function (v, i) { return v == null ? null : i; }).filter(function (i) { return i != null; });
          var imax = nn.reduce(function (a, b) { return vv[b] > vv[a] ? b : a; }), imin = nn.reduce(function (a, b) { return vv[b] < vv[a] ? b : a; });
          idx = [nn[0], imax, imin].concat((spec.labelX || []).map(function (x) { return xs.indexOf(String(x)); }).filter(function (i) { return i >= 0; }));
        }
        idx.filter(function (i, k, arr) { return arr.indexOf(i) === k && i !== n - 1; }).forEach(function (i) {
          var v = vv[i], prev = vv[i - 1], next = vv[i + 1];
          var below = (prev != null && prev > v) && (next == null || next > v) || (prev == null && next != null && next > v);
          txt(svg, sx(i), sy(v) + (below ? F.axis.size * 1.5 : -F.axis.size * 1.3), fmt(v, dec, suf), { anchor: 'middle', size: F.axis.size + 1, weight: 700, fill: C.pointDark });
        });
      }
      var li = sr.values.length - 1; while (li > 0 && sr.values[li] == null) li--;
      svg.appendChild(s('circle', { cx: sx(li), cy: sy(sr.values[li]), r: hl ? u(6.5) : u(5), fill: colors[si] }));
      ends.push({ y: sy(sr.values[li]), x: sx(li), si: si, v: sr.values[li], hl: hl });
    });
    // 끝 라벨 겹침 방지
    var lh = series.length > 1 ? (F.legend.size + F.dataLabel.size) * 1.15 : F.dataLabel.size * 1.3;
    ends.sort(function (a, b) { return a.y - b.y; });
    for (var it = 0; it < 30; it++) for (var k = 1; k < ends.length; k++) {
      var ov = ends[k - 1].y + lh - ends[k].y; if (ov > 0) { ends[k - 1].y -= ov / 2; ends[k].y += ov / 2; }
    }
    if (spec.endLabel !== false) ends.forEach(function (e) {
      var col = textColor(colors[e.si]), x = axisW + plotW + u(10);
      if (series.length > 1) {
        txt(svg, x, e.y - F.legend.size * 0.6, series[e.si].name, { size: F.legend.size - 1, weight: 700, fill: col });
        txt(svg, x, e.y + F.dataLabel.size * 0.6, fmt(e.v, dec, suf), { size: F.dataLabel.size - 1, weight: 700, fill: col });
      } else txt(svg, x, e.y, fmt(e.v, dec, suf), { size: F.dataLabel.size, weight: 700, fill: C.pointDark });
    });
    body.appendChild(svg);
  }

  // ---------- 원그래프(도넛) ----------
  function renderPie(spec, body) {
    var data = spec.data.slice();
    var sortable = data.filter(function (d) { return d.label !== '기타'; }).sort(function (a, b) { return b.value - a.value; });
    var other = data.filter(function (d) { return d.label === '기타'; });
    data = sortable.concat(other);
    if (data.length > T.limits.pieMaxSlices) {
      var keep = data.slice(0, T.limits.pieMaxSlices - 1), rest = data.slice(T.limits.pieMaxSlices - 1);
      warn('조각이 ' + data.length + '개라 하위 ' + rest.length + '개를 "기타"로 묶었습니다.');
      data = keep.concat([{ label: '기타', value: rest.reduce(function (a, d) { return a + d.value; }, 0) }]);
    }
    var total = data.reduce(function (a, d) { return a + d.value; }, 0);
    if (!data.some(function (d) { return isHL(spec, d.label, d); })) { data[0].highlight = true; warn('강조 조각이 없어 가장 큰 "' + data[0].label + '"을 강조했습니다.'); }
    var greys = T.palette.focus.slice(1), gi = 0;
    var colors = data.map(function (d) { return isHL(spec, d.label, d) ? C.point : greys[gi++ % greys.length]; });
    var dec = spec.decimals != null ? spec.decimals : decimalsOf(data.map(function (d) { return d.value; })), suf = spec.valueSuffix || '';
    var R = u(200), r = u(112), cx = R + u(10), cy = R + u(10), rowH = F.label.size * 3.6, svgH = Math.max(2 * R + u(20), data.length * rowH), svg = svgRoot(W, svgH);
    cy = svgH / 2;
    var a0 = -Math.PI / 2;
    var pdec = spec.percentDecimals != null ? spec.percentDecimals : (data.every(function (d) { return Math.abs(d.value / total * 100 - Math.round(d.value / total * 100)) < 0.05; }) ? 0 : 1);
    data.forEach(function (d, i) {
      var a1 = a0 + d.value / total * Math.PI * 2, large = a1 - a0 > Math.PI ? 1 : 0;
      var p = function (a, rr) { return (cx + rr * Math.cos(a)).toFixed(2) + ',' + (cy + rr * Math.sin(a)).toFixed(2); };
      var path = data.length === 1 ? null : 'M' + p(a0, R) + 'A' + R + ',' + R + ' 0 ' + large + ' 1 ' + p(a1, R) + 'L' + p(a1, r) + 'A' + r + ',' + r + ' 0 ' + large + ' 0 ' + p(a0, r) + 'Z';
      if (path) svg.appendChild(s('path', { d: path, fill: colors[i], stroke: C.background, 'stroke-width': u(3) }));
      a0 = a1;
    });
    var hi = data.findIndex(function (d, i) { return colors[i] === C.point; });
    if (hi >= 0) {
      var pct = data[hi].value / total * 100;
      txt(svg, cx, cy - 4, fmt(pct, pdec) + '%', { anchor: 'middle', size: Math.round(F.kpiValue.size * 0.93), weight: 800, fill: C.point, ls: '-0.02em' });
      txt(svg, cx, cy + F.kpiValue.size * 0.75, data[hi].label, { anchor: 'middle', size: F.label.size, weight: 600, fill: C.text });
    }
    var lx = cx + R + u(70), ly = cy - (data.length * rowH) / 2 + rowH / 2;
    data.forEach(function (d, i) {
      var y = ly + i * rowH, hl = colors[i] === C.point, pct = d.value / total * 100;
      svg.appendChild(s('rect', { x: lx, y: y - F.label.size * 0.45, width: F.label.size * 0.9, height: F.label.size * 0.9, rx: u(3), fill: colors[i] }));
      txt(svg, lx + F.label.size * 1.6, y - F.label.size * 0.62, d.label, { size: F.label.size + 1, weight: hl ? 700 : 500, fill: hl ? C.ink : C.text });
      txt(svg, lx + F.label.size * 1.6, y + F.label.size * 0.78, fmt(d.value, dec, suf) + '  ·  ' + fmt(pct, pdec) + '%', { size: F.dataLabel.size - 1, weight: 700, fill: hl ? C.pointDark : C.baseDark });
    });
    body.appendChild(svg);
  }

  // ---------- 표 ----------
  function renderTable(spec, body) {
    var cols = spec.columns.map(function (c) { return typeof c === 'string' ? { label: c } : c; });
    var rows = spec.rows;
    var tbl = h('table', { class: 'nt-table' });
    if (spec.fontSize) tbl.style.fontSize = spec.fontSize + 'px';
    var thead = h('thead'), tr = h('tr');
    cols.forEach(function (c) {
      var th = h('th', { class: 'al-' + (c.align || 'center') }, esc(c.label));
      if (c.width) th.style.width = c.width; tr.appendChild(th);
    });
    thead.appendChild(tr); tbl.appendChild(thead);
    var tb = h('tbody'), hlRows = spec.highlightRows || [];
    if (hlRows.length > 3) warn('강조 행이 ' + hlRows.length + '개입니다. 핵심 행만 강조하세요.');
    rows.forEach(function (row, ri) {
      var r = h('tr'); if (hlRows.indexOf(ri) >= 0 || (row && row._highlight)) r.className = 'hl';
      var cells = Array.isArray(row) ? row : cols.map(function (c) { return row[c.key]; });
      cells.forEach(function (cell, ci) {
        var c = cols[ci] || {}, v = cell, sub = null, em = false;
        if (cell && typeof cell === 'object') { v = cell.v; sub = cell.sub; em = !!cell.em; }
        var str = typeof v === 'number' ? fmt(v, c.decimals || 0, c.suffix || '') : esc(v == null ? '' : v).replace(/\n/g, '<br>');
        var td = h('td', { class: 'al-' + (c.align || (typeof v === 'number' ? 'right' : 'center')) + (em ? ' em' : '') }, str + (sub ? '<span class="sub">' + esc(sub) + '</span>' : ''));
        r.appendChild(td);
      });
      tb.appendChild(r);
    });
    tbl.appendChild(tb); body.appendChild(tbl);
    if (rows.length > 40) warn('표가 ' + rows.length + '행입니다. 이미지가 매우 길어집니다. 나눠서 만드는 것을 검토하세요.');
  }

  // ---------- 타임라인 ----------
  function renderTimeline(spec, body) {
    var ev = spec.events;
    var dw = Math.max.apply(null, ev.map(function (e) { return measure(e.date || '', F.body.size, 700); })) + u(8);
    var box = h('div', { class: 'nt-tl', style: '--tl-date-w:' + Math.ceil(dw) + 'px' });
    var hlN = 0;
    ev.forEach(function (e) {
      if (e.group) { box.appendChild(h('div', { class: 'nt-tl-group' }, esc(e.group))); }
      if (!e.text && !e.title) return;
      var hl = !!e.highlight; if (hl) hlN++;
      var row = h('div', { class: 'nt-tl-row' + (hl ? ' hl' : '') });
      row.appendChild(h('div', { class: 'nt-tl-date' }, esc(e.date || '')));
      row.appendChild(h('div', { class: 'nt-tl-axis' }, '<span class="nt-tl-dot"></span>'));
      row.appendChild(h('div', { class: 'nt-tl-text' }, (hl ? '<b>' : '') + esc(e.title || e.text) + (hl ? '</b>' : '') + (e.desc ? '<span class="d">' + esc(e.desc) + '</span>' : '')));
      box.appendChild(row);
    });
    if (hlN === 0) warn('타임라인에 강조 사건(highlight)이 없습니다. 핵심 사건 1~3개를 지정하세요.');
    if (hlN > 4) warn('강조 사건이 ' + hlN + '개입니다. 너무 많으면 강조 효과가 사라집니다.');
    body.appendChild(box);
  }

  // ---------- 지도 (시·도) ----------
  var SIDO = {
    // [정식 명칭, 라벨 경도, 라벨 위도, 콜아웃 여부, 기준점 경도, 기준점 위도]
    '서울': ['서울특별시', 125.55, 38.0, true, 126.98, 37.56], '인천': ['인천광역시', 125.55, 37.42, true, 126.68, 37.45], '경기': ['경기도', 127.45, 37.62],
    '강원': ['강원도', 128.3, 37.65], '충북': ['충청북도', 127.78, 36.8], '충남': ['충청남도', 126.75, 36.45],
    '세종': ['세종특별자치시', 125.55, 37.0, true, 127.26, 36.56], '대전': ['대전광역시', 125.55, 35.95, true, 127.39, 36.35], '전북': ['전라북도', 127.1, 35.76],
    '전남': ['전라남도', 126.92, 34.93], '광주': ['광주광역시', 125.55, 35.35, true, 126.85, 35.16], '경북': ['경상북도', 128.78, 36.35],
    '대구': ['대구광역시', 130.05, 35.98, true, 128.6, 35.86], '경남': ['경상남도', 128.2, 35.33], '울산': ['울산광역시', 130.05, 35.5, true, 129.27, 35.55],
    '부산': ['부산광역시', 130.05, 35.02, true, 129.06, 35.18], '제주': ['제주특별자치도', 126.55, 33.37]
  };
  function shortName(n) {
    for (var k in SIDO) if (n === k || n === SIDO[k][0] || SIDO[k][0].indexOf(n) === 0) return k;
    var alias = { '강원특별자치도': '강원', '전북특별자치도': '전북' }; return alias[n] || null;
  }
  function renderMap(spec, body) {
    var geo = window.NT_GEO_KOREA; if (!geo) { warn('지도 데이터가 없습니다.'); return; }
    var mode = spec.mode || (spec.values ? 'choropleth' : 'highlight');
    var values = {}; Object.keys(spec.values || {}).forEach(function (k) { var sn = shortName(k); if (!sn) warn('지역명 인식 실패: ' + k); else values[sn] = spec.values[k]; });
    var hl = (spec.highlight || []).map(shortName);
    var dec = spec.decimals != null ? spec.decimals : decimalsOf(Object.values(values)), suf = spec.valueSuffix || '';
    var k = Math.cos(36 * Math.PI / 180), lon0 = 124.95, lon1 = 130.75, lat0 = 33.05, lat1 = 38.65;
    var mapH = u(760), sc = mapH / (lat1 - lat0), mapW = (lon1 - lon0) * k * sc;
    var ox = spec.legendPosition === 'none' ? (W - mapW) / 2 : 0;
    var px = function (lon, lat) { return [ox + (lon - lon0) * k * sc, (lat1 - lat) * sc]; };
    var svg = svgRoot(W, mapH);
    var bins = null, binColors = T.palette.sequential.slice(1);
    if (mode === 'choropleth') {
      var vs = Object.values(values), mn = Math.min.apply(null, vs), mx = Math.max.apply(null, vs);
      bins = spec.bins || (function () { var t = niceTicks(mn, mx, 5); return t; })();
      if (bins.length - 1 > binColors.length) bins = bins.filter(function (_, i) { return i % 2 === 0 || i === bins.length - 1; });
      var nb = bins.length - 1, off = binColors.length - nb; binColors = binColors.slice(Math.max(0, off - 1), Math.max(0, off - 1) + nb);
    }
    function colorOf(sn) {
      if (mode === 'highlight') return hl.indexOf(sn) >= 0 ? C.point : '#E3E3E3';
      var v = values[sn]; if (v == null) return '#F0F0F0';
      for (var i = 0; i < bins.length - 1; i++) if (v <= bins[i + 1]) return binColors[i];
      return binColors[binColors.length - 1];
    }
    var cent = {};
    geo.features.forEach(function (f) {
      var sn = shortName(f.properties.name), d = '';
      var polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
      polys.forEach(function (poly) { poly.forEach(function (ring) { ring.forEach(function (c, i) { var p = px(c[0], c[1]); d += (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1); }); d += 'Z'; }); });
      svg.appendChild(s('path', { d: d, fill: colorOf(sn), stroke: C.background, 'stroke-width': u(1.4), 'stroke-linejoin': 'round' }));
      // 대표점: 가장 큰 고리의 평균
      var big = polys.map(function (p) { return p[0]; }).sort(function (a, b) { return b.length - a.length; })[0];
      var sxv = 0, syv = 0; big.forEach(function (c) { sxv += c[0]; syv += c[1]; }); cent[sn] = [sxv / big.length, syv / big.length];
    });
    var showLabels = spec.labels !== false, MN = F.legend.size * 0.95, MV = F.legend.size;
    Object.keys(SIDO).forEach(function (sn) {
      var info = SIDO[sn], has = mode === 'highlight' ? hl.indexOf(sn) >= 0 : values[sn] != null;
      if (!showLabels || !has && mode === 'highlight') return;
      var lp = px(info[1], info[2]), callout = info[3];
      var fill = colorOf(sn), dark = mode === 'highlight' || binColors.indexOf(fill) >= binColors.length - 3;
      var col = callout ? C.ink : (dark && fill !== '#F0F0F0' && fill !== '#E3E3E3' && binColors.indexOf(fill) >= binColors.length - 2 || mode === 'highlight' ? '#FFFFFF' : C.ink);
      if (callout) {
        var cp = px(info[4], info[5]), right = info[1] > 128;
        svg.appendChild(s('line', { x1: cp[0], y1: cp[1], x2: lp[0] + (right ? -u(6) : u(6)), y2: lp[1], stroke: C.baseDark, 'stroke-width': u(1) }));
        svg.appendChild(s('circle', { cx: cp[0], cy: cp[1], r: u(3), fill: C.ink }));
        var anc = right ? 'start' : 'end';
        txt(svg, lp[0], lp[1] - (values[sn] != null ? MN * 0.62 : 0), sn, { anchor: anc, size: MN, weight: 600, fill: C.text, halo: C.background });
        if (values[sn] != null) txt(svg, lp[0], lp[1] + MV * 0.66, fmt(values[sn], dec, suf), { anchor: anc, size: MV, weight: 700, fill: hl.indexOf(sn) >= 0 ? C.pointDark : C.ink, halo: C.background });
      } else {
        txt(svg, lp[0], lp[1] - (values[sn] != null ? MN * 0.62 : 0), sn, { anchor: 'middle', size: MN, weight: 600, fill: col });
        if (values[sn] != null) txt(svg, lp[0], lp[1] + MV * 0.66, fmt(values[sn], dec, suf), { anchor: 'middle', size: MV, weight: 700, fill: col });
      }
    });
    if (mode === 'choropleth' && spec.legendPosition !== 'none') {
      var lx = mapW + u(60), ly = u(80);
      if (spec.legendTitle) txt(svg, lx, ly, spec.legendTitle, { size: F.legend.size, weight: 700, fill: C.ink });
      binColors.slice().reverse().forEach(function (bc, i) {
        var bi = binColors.length - 1 - i, y = ly + F.legend.size * 2 + i * F.legend.size * 2.2;
        svg.appendChild(s('rect', { x: lx, y: y, width: F.legend.size * 1.9, height: F.legend.size * 1.55, fill: bc }));
        txt(svg, lx + F.legend.size * 2.6, y + F.legend.size * 0.78, fmt(bins[bi], dec) + ' ~ ' + fmt(bins[bi + 1], dec) + suf, { size: F.legend.size, weight: 500, fill: C.text });
      });
    }
    if (mode === 'highlight' && spec.sideNote) {
      var nx = mapW + u(60), ny = u(100);
      spec.sideNote.forEach(function (line, i) { txt(svg, nx, ny + i * F.label.size * 1.6, line, { size: F.label.size + 1, weight: i === 0 ? 700 : 500, fill: i === 0 ? C.pointDark : C.text }); });
    }
    body.appendChild(svg);
  }

  // ---------- 숫자 카드 ----------
  function renderStat(spec, body) {
    var k = spec.items || spec.kpis;
    var box = h('div', { class: 'nt-stats', style: 'grid-template-columns:repeat(' + k.length + ',1fr)' });
    if (k.length > 4) warn('숫자 카드가 ' + k.length + '개입니다. 4개 이하를 권장합니다.');
    var colW = (W - u(16)) / k.length - u(28);
    k.forEach(function (it) {
      var vtxt = String(typeof it.value === 'number' ? fmt(it.value, it.decimals || 0) : it.value);
      var vw = measure(vtxt, F.kpiValue.size, 800) + (it.unit ? measure(it.unit, F.kpiValue.size * 0.55, 700) + 4 : 0);
      var vsize = vw > colW ? Math.max(F.kpiValue.size * 0.55, Math.floor(F.kpiValue.size * colW / vw)) : F.kpiValue.size;
      var unit = it.unit ? '<small>' + esc(it.unit) + '</small>' : '';
      box.appendChild(h('div', { class: 'nt-stat' + (it.highlight ? ' hl' : '') },
        '<div class="l">' + esc(it.label) + '</div><div class="v" style="font-size:' + vsize + 'px">' + esc(typeof it.value === 'number' ? fmt(it.value, it.decimals || 0) : it.value) + unit + '</div>' + (it.sub ? '<div class="s">' + esc(it.sub) + '</div>' : '')));
    });
    body.appendChild(box);
  }

  // ---------- 조합 ----------
  function renderStack(spec, body) {
    spec.blocks.forEach(function (b, i) {
      var wrapEl = h('div', { style: i ? 'margin-top:' + u(36) + 'px' : '' });
      if (b.heading) wrapEl.appendChild(h('div', { style: 'font-size:' + F.label.size * 1.15 + 'px;font-weight:700;margin-bottom:' + u(16) + 'px;color:' + C.ink }, esc(b.heading)));
      RENDER[b.type](b, wrapEl); body.appendChild(wrapEl);
    });
  }

  var RENDER = { dot: renderDot, slope: renderSlope, bar: renderBar, line: renderLine, pie: renderPie, table: renderTable, timeline: renderTimeline, map: renderMap, stat: renderStat, stack: renderStack };

  // ---------- 진입점 ----------
  function render(spec, tokens, mount) {
    T = JSON.parse(JSON.stringify(tokens)); C = T.color; F = T.font; warnings = [];
    // 강조색 세트 적용 (tokens.accents 에 등록된 것만)
    var accKey = spec.accent || T.defaultAccent || 'orange', acc = (T.accents || {})[accKey];
    if (!acc) { warn('등록되지 않은 강조색 "' + spec.accent + '" — 기본색으로 그렸습니다. 쓸 수 있는 값: ' + Object.keys(T.accents || {}).join(', ')); acc = (T.accents || {})[T.defaultAccent]; }
    if (acc) {
      C.point = acc.point; C.pointDark = acc.pointDark; C.pointTint = acc.pointTint; C.pointTintLight = acc.pointTintLight || acc.pointTint;
      T.palette.sequential = acc.sequential; T.palette.focus[0] = acc.point; T.palette.categorical[0] = acc.point;
    }
    var pad = T.canvas.padding, cw = spec.width || T.canvas.width;
    W = cw - pad.side * 2;
    U = cw / 1000;
    if (!F.body) F.body = { size: F.tableCell.size + 1 };
    var root = document.documentElement.style;
    root.setProperty('--font', F.family); root.setProperty('--bg', C.background);
    ['point', 'pointDark', 'pointTint', 'ink', 'text', 'subtext', 'baseDark', 'divider', 'rule', 'panel'].forEach(function (k) { root.setProperty('--' + k, C[k]); });
    root.setProperty('--title-size', F.title.size + 'px'); root.setProperty('--title-weight', F.title.weight);
    root.setProperty('--title-lh', F.title.lineHeight); root.setProperty('--title-ls', F.title.letterSpacing);
    root.setProperty('--subtitle-size', F.subtitle.size + 'px'); root.setProperty('--subtitle-weight', F.subtitle.weight);
    root.setProperty('--axis-size', F.axis.size + 'px'); root.setProperty('--source-size', F.source.size + 'px');
    root.setProperty('--legend-size', F.legend.size + 'px'); root.setProperty('--thead-size', F.tableHead.size + 'px');
    root.setProperty('--cell-size', F.tableCell.size + 'px'); root.setProperty('--kpiValue-size', F.kpiValue.size + 'px');
    root.setProperty('--kpiLabel-size', F.kpiLabel.size + 'px');
    root.setProperty('--body-size', F.body.size + 'px'); root.setProperty('--label-size', F.label.size + 'px');
    root.setProperty('--u', U);

    if (!spec.title) warn('제목(title)이 없습니다.');
    else if (spec.title.replace(/\n/g, '').length > T.limits.titleMaxChars) warn('제목이 ' + spec.title.length + '자입니다. ' + T.limits.titleMaxChars + '자 이내로 줄이거나 부제로 나누세요.');
    if (!spec.source) warn('출처(source)가 없습니다. 반드시 넣으세요.');
    if (!RENDER[spec.type]) throw new Error('지원하지 않는 type: ' + spec.type + ' (bar, line, slope, dot, pie, table, timeline, map, stat, stack)');

    var frame = h('div', { class: 'nt-frame', id: 'nt-frame', style: 'width:' + cw + 'px;padding:' + pad.top + 'px ' + pad.side + 'px ' + pad.bottom + 'px;--pad-side:' + pad.side + 'px' });
    if (spec.logo !== false) {
      var lg = h('img', { class: 'nt-logo', src: window.NT_LOGO_SRC, style: 'width:' + T.logo.width + 'px;opacity:' + T.logo.opacity + ';right:' + pad.side + 'px;top:' + (pad.top + u(2) + u(24) + F.title.size * 0.08) + 'px' });
      frame.appendChild(lg);
    }
    frame.appendChild(h('div', { class: 'nt-rule-top' }));
    var header = h('div', { class: 'nt-header' });
    header.appendChild(h('div', { class: 'nt-title' }, esc(spec.title || '').replace(/\n/g, '<br>')));
    if (spec.subtitle) header.appendChild(h('div', { class: 'nt-subtitle' }, esc(spec.subtitle)));
    frame.appendChild(header);
    var body = h('div', { class: 'nt-body' });
    if (spec.unit) body.appendChild(h('div', { class: 'nt-unit' }, '단위: ' + esc(spec.unit)));
    frame.appendChild(body);
    mount.appendChild(frame);
    RENDER[spec.type](spec, body);
    var foot = h('div', { class: 'nt-footer' }), notes = [].concat(spec.notes || spec.note || []);
    notes.forEach(function (n) { foot.appendChild(h('p', null, '* ' + esc(n))); });
    var src = Array.isArray(spec.source) ? spec.source.filter(Boolean).join(', ') : spec.source;
    if (src) foot.appendChild(h('p', null, '* 출처 : ' + esc(src)));
    if (foot.childNodes.length) frame.appendChild(foot);
    frame.appendChild(h('div', { class: 'nt-rule-bottom' }));
    // 넘침 검사
    var fr = frame.getBoundingClientRect();
    frame.querySelectorAll('svg, table, .nt-stats, .nt-tl').forEach(function (e) { if (e.getBoundingClientRect().right > fr.right - pad.side + 2) warn('본문 요소가 오른쪽 여백을 넘었습니다. 라벨을 줄이세요.'); });
    return warnings;
  }
  window.NT = { render: render };
})();

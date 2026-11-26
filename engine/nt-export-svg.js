/* 뉴스타파 그래픽 → 일러스트레이터 편집용 SVG
 * 화면에 그려진 그래픽(#nt-frame)을 글자·선·면이 모두 개별 SVG 요소인 파일로 바꾼다.
 * - HTML 글자는 줄 단위 <text>로, 배경·테두리는 <rect>·<line>으로 옮긴다.
 * - 차트 부분(이미 SVG)은 위치만 맞춰 그대로 넣는다.
 * - 글꼴은 일러스트레이터가 알아보는 PostScript 이름(Pretendard-Bold 등)으로 적는다.
 *   맥에 Pretendard가 설치돼 있으면 일러스트레이터에서 글자를 바로 고칠 수 있다.
 */
(function () {
  'use strict';
  var PS = { 100: 'Thin', 200: 'ExtraLight', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold', 900: 'Black' };
  var ASCENT = 0.952; // Pretendard 글꼴의 기준선 위치 (em)

  function fontFamily(weight) {
    var w = Math.min(900, Math.max(100, Math.round((parseInt(weight, 10) || 400) / 100) * 100));
    return 'Pretendard-' + PS[w] + ', Pretendard, \'Pretendard Variable\', \'Apple SD Gothic Neo\', sans-serif';
  }
  function hex(c) {
    var m = String(c).match(/rgba?\(([^)]+)\)/); if (!m) return { hex: c, a: 1 };
    var p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    var h = '#' + p.slice(0, 3).map(function (v) { return ('0' + Math.round(v).toString(16)).slice(-2); }).join('').toUpperCase();
    return { hex: h, a: p.length > 3 ? p[3] : 1 };
  }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function n(v) { return Math.round(v * 100) / 100; }
  function fillAttr(c) { var h = hex(c); return 'fill="' + h.hex + '"' + (h.a < 1 ? ' fill-opacity="' + n(h.a) + '"' : ''); }
  function visible(cs) { return cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0; }
  function transparent(c) { return !c || c === 'transparent' || /rgba\([^)]*,\s*0\)$/.test(c); }

  function toSVG(frame, scale) {
    scale = scale || 1;
    var F = frame.getBoundingClientRect(), W = Math.round(F.width), H = Math.round(F.height);
    var out = [];
    var X = function (v) { return n(v - F.left); }, Y = function (v) { return n(v - F.top); };

    function box(el, cs) {
      var r = el.getBoundingClientRect(); if (!r.width && !r.height) return;
      if (!transparent(cs.backgroundColor)) {
        var rad = parseFloat(cs.borderTopLeftRadius) || 0; if (String(cs.borderTopLeftRadius).indexOf('%') > 0) rad = r.width * parseFloat(cs.borderTopLeftRadius) / 100;
        out.push('<rect x="' + X(r.left) + '" y="' + Y(r.top) + '" width="' + n(r.width) + '" height="' + n(r.height) + '"' + (rad ? ' rx="' + n(Math.min(rad, r.width / 2)) + '"' : '') + ' ' + fillAttr(cs.backgroundColor) + '/>');
      }
      // 형광펜 밑줄 (linear-gradient 배경)
      var bi = cs.backgroundImage;
      if (bi && bi.indexOf('linear-gradient') >= 0) {
        var cm = bi.match(/rgba?\([^)]+\)\s*(\d+)%\s*\)?$/) || bi.match(/(rgba?\([^)]+\))\s+(\d+)%\)/g);
        var col = (bi.match(/rgba?\([^)]+\)/g) || []).pop(), stop = parseFloat((bi.match(/(\d+)%\s*\)\s*$/) || [0, 55])[1]) / 100;
        Array.prototype.forEach.call(el.getClientRects(), function (lr) {
          var top = lr.top + lr.height * stop;
          out.push('<rect x="' + X(lr.left) + '" y="' + Y(top) + '" width="' + n(lr.width) + '" height="' + n(lr.bottom - top) + '" ' + fillAttr(col) + '/>');
        });
      }
      // 테두리
      var round = parseFloat(cs.borderTopLeftRadius) > 0;
      if (round && parseFloat(cs.borderTopWidth) > 0) {
        var bw = parseFloat(cs.borderTopWidth), rr = String(cs.borderTopLeftRadius).indexOf('%') > 0 ? r.width / 2 : parseFloat(cs.borderTopLeftRadius);
        out.push('<rect x="' + X(r.left + bw / 2) + '" y="' + Y(r.top + bw / 2) + '" width="' + n(r.width - bw) + '" height="' + n(r.height - bw) + '" rx="' + n(Math.min(rr, (r.width - bw) / 2)) + '" fill="none" stroke="' + hex(cs.borderTopColor).hex + '" stroke-width="' + n(bw) + '"/>');
        return;
      }
      [['Top', r.left, r.top, r.right, r.top, 1], ['Bottom', r.left, r.bottom, r.right, r.bottom, -1], ['Left', r.left, r.top, r.left, r.bottom, 1], ['Right', r.right, r.top, r.right, r.bottom, -1]].forEach(function (s) {
        var w = parseFloat(cs['border' + s[0] + 'Width']), st = cs['border' + s[0] + 'Style'];
        if (!w || st === 'none' || st === 'hidden') return;
        var off = w / 2 * s[5], horiz = s[0] === 'Top' || s[0] === 'Bottom';
        var x1 = s[1], y1 = s[2], x2 = s[3], y2 = s[4];
        if (horiz) { y1 += off; y2 += off; } else { x1 += off; x2 += off; }
        var dash = st === 'dotted' ? ' stroke-dasharray="' + n(w) + ' ' + n(w * 2) + '"' : st === 'dashed' ? ' stroke-dasharray="' + n(w * 3) + ' ' + n(w * 2) + '"' : '';
        out.push('<line x1="' + X(x1) + '" y1="' + Y(y1) + '" x2="' + X(x2) + '" y2="' + Y(y2) + '" stroke="' + hex(cs['border' + s[0] + 'Color']).hex + '" stroke-width="' + n(w) + '"' + dash + '/>');
      });
    }

    function pseudo(el, which) {
      var cs = getComputedStyle(el, which);
      if (!cs || cs.content === 'none' || cs.content === 'normal' || transparent(cs.backgroundColor)) return;
      var r = el.getBoundingClientRect();
      var left = parseFloat(cs.left) || 0, top = parseFloat(cs.top) || 0, w = parseFloat(cs.width), h = parseFloat(cs.height);
      if (!h || isNaN(h)) h = r.height - top - (parseFloat(cs.bottom) || 0);
      if (!w || isNaN(w)) w = r.width - left - (parseFloat(cs.right) || 0);
      if (h <= 0 || w <= 0) return;
      out.push('<rect x="' + X(r.left + left) + '" y="' + Y(r.top + top) + '" width="' + n(w) + '" height="' + n(h) + '" ' + fillAttr(cs.backgroundColor) + '/>');
    }

    function text(node) {
      var s = node.nodeValue; if (!s || !s.trim()) return;
      var el = node.parentElement, cs = getComputedStyle(el); if (!visible(cs)) return;
      var size = parseFloat(cs.fontSize), weight = cs.fontWeight, col = hex(cs.color);
      var ls = cs.letterSpacing === 'normal' ? 0 : parseFloat(cs.letterSpacing);
      var rng = document.createRange(), lines = [], cur = null;
      for (var i = 0; i < s.length; i++) {
        rng.setStart(node, i); rng.setEnd(node, i + 1);
        var rects = rng.getClientRects(); if (!rects.length) continue;
        var rc = rects[0], top = Math.round(rc.top);
        if (!cur || Math.abs(top - cur.top) > size * 0.5) { cur = { top: top, rTop: rc.top, h: rc.height, x: rc.left, str: '' }; lines.push(cur); }
        if (!cur.str && /\s/.test(s[i])) { cur.x = rc.right; continue; }
        cur.str += s[i];
      }
      lines.forEach(function (L) {
        var str = L.str.replace(/\s+$/, ''); if (!str) return;
        var base = L.rTop + (L.h - size * 1.193) / 2 + size * ASCENT;
        out.push('<text x="' + X(L.x) + '" y="' + Y(base) + '" font-family="' + esc(fontFamily(weight)) + '" font-size="' + n(size) + '" font-weight="' + weight + '" ' + fillAttr(cs.color) + (ls ? ' letter-spacing="' + n(ls) + '"' : '') + ' xml:space="preserve">' + esc(str) + '</text>');
      });
    }

    function svgChild(svg) {
      var r = svg.getBoundingClientRect(), clone = svg.cloneNode(true);
      clone.querySelectorAll('text, tspan').forEach(function (t) {
        var w = t.getAttribute('font-weight') || (t.parentNode && t.parentNode.getAttribute && t.parentNode.getAttribute('font-weight')) || 400;
        t.setAttribute('font-family', fontFamily(w));
        if (t.tagName.toLowerCase() === 'text') {
          // dominant-baseline=middle 은 일러스트레이터가 무시하므로 기준선 위치로 바꿔 둔다
          if (t.getAttribute('dominant-baseline') === 'middle') {
            var fs = parseFloat(t.getAttribute('font-size')) || 16;
            t.setAttribute('y', n(parseFloat(t.getAttribute('y')) + fs * 0.35)); t.removeAttribute('dominant-baseline');
          }
        }
      });
      var inner = Array.prototype.map.call(clone.childNodes, function (c) { return c.outerHTML || ''; }).join('');
      out.push('<g transform="translate(' + X(r.left) + ',' + Y(r.top) + ')">' + inner + '</g>');
    }

    function img(el, cs) {
      var r = el.getBoundingClientRect(), c = document.createElement('canvas');
      c.width = el.naturalWidth; c.height = el.naturalHeight; c.getContext('2d').drawImage(el, 0, 0);
      var op = parseFloat(cs.opacity);
      out.push('<image x="' + X(r.left) + '" y="' + Y(r.top) + '" width="' + n(r.width) + '" height="' + n(r.height) + '"' + (op < 1 ? ' opacity="' + n(op) + '"' : '') + ' href="' + c.toDataURL('image/png') + '"/>');
    }

    function walk(el) {
      var cs = getComputedStyle(el); if (!visible(cs)) return;
      var tag = el.tagName.toLowerCase();
      if (tag === 'svg') { svgChild(el); return; }
      if (tag === 'img') { img(el, cs); return; }
      box(el, cs); pseudo(el, '::before'); pseudo(el, '::after');
      Array.prototype.forEach.call(el.childNodes, function (c) {
        if (c.nodeType === 3) text(c); else if (c.nodeType === 1) walk(c);
      });
    }

    out.push('<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="#FFFFFF"/>');
    walk(frame);
    var SW = Math.round(W * scale), SH = Math.round(H * scale);
    return '<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="' + SW + '" height="' + SH + '" viewBox="0 0 ' + SW + ' ' + SH + '">\n' + (scale !== 1 ? '<g transform="scale(' + scale + ')">\n' : '') + out.join('\n') + (scale !== 1 ? '\n</g>' : '') + '\n</svg>\n';
  }

  window.NTExport = { toSVG: toSVG };
})();

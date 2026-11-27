/* 디자인 조정 패널
 * - 모든 그래픽 공통 값(글자 크기·색·여백 등)을 화면에서 바꿔 보고, 바뀐 값만 복사해 tokens.json에 반영할 수 있게 한다.
 * - "이 그래픽만" 값(막대 두께·그래프 높이·표 글자)은 JSON(spec)에 직접 써 넣는다.
 * 바꾼 값은 이 브라우저에 저장돼 새로고침해도 남는다.
 */
(function () {
  'use strict';
  var STORE = 'nt-tuner-overrides-v1';

  // 공통 디자인 값. path는 tokens.json 안의 위치. {ACC}는 지금 고른 강조색 이름으로 바뀐다.
  var GROUPS = [
    { title: '글자 크기', note: '가로 1200px 그래픽 기준', rows: [
      { label: '제목', path: 'font.title.size', min: 30, max: 80, step: 1, unit: 'px' },
      { label: '제목 굵기', path: 'font.title.weight', min: 500, max: 900, step: 100 },
      { label: '부제', path: 'font.subtitle.size', min: 16, max: 44, step: 1, unit: 'px' },
      { label: '본문(타임라인)', path: 'font.body.size', min: 16, max: 40, step: 1, unit: 'px' },
      { label: '항목 라벨', path: 'font.label.size', min: 14, max: 36, step: 1, unit: 'px' },
      { label: '값 라벨', path: 'font.dataLabel.size', min: 14, max: 40, step: 1, unit: 'px' },
      { label: '축 눈금', path: 'font.axis.size', min: 12, max: 32, step: 1, unit: 'px' },
      { label: '범례', path: 'font.legend.size', min: 14, max: 34, step: 1, unit: 'px' },
      { label: '표 머리', path: 'font.tableHead.size', min: 14, max: 34, step: 1, unit: 'px' },
      { label: '표 본문', path: 'font.tableCell.size', min: 14, max: 36, step: 1, unit: 'px' },
      { label: '숫자 카드 값', path: 'font.kpiValue.size', min: 36, max: 100, step: 1, unit: 'px' },
      { label: '숫자 카드 이름', path: 'font.kpiLabel.size', min: 14, max: 36, step: 1, unit: 'px' },
      { label: '출처·주석', path: 'font.source.size', min: 12, max: 32, step: 1, unit: 'px' }
    ] },
    { title: '색', note: '강조색은 지금 고른 강조색 세트에 적용', rows: [
      { label: '그래픽 배경', path: 'color.background', type: 'color' },
      { label: '숫자 카드 상자', path: 'color.panel', type: 'color' },
      { label: '텍스트 강조 상자', path: 'color.surface', type: 'color' },
      { label: '강조', path: 'accents.{ACC}.point', type: 'color' },
      { label: '강조 글자', path: 'accents.{ACC}.pointDark', type: 'color' },
      { label: '강조 배경', path: 'accents.{ACC}.pointTint', type: 'color' },
      { label: '기본 데이터(회색 막대)', path: 'color.base', type: 'color' },
      { label: '제목·본문 글자', path: 'color.ink', type: 'color' },
      { label: '부제·축·출처 글자', path: 'color.subtext', type: 'color' }
    ] },
    { title: '위아래 선', note: '끄면 선만 빠지고 간격은 그대로', rows: [
      { label: '위 선', path: 'rules.top.visible', type: 'toggle' },
      { label: '위 선 두께', path: 'rules.top.width', min: 0.5, max: 10, step: 0.5, unit: 'px' },
      { label: '아래 선', path: 'rules.bottom.visible', type: 'toggle' },
      { label: '아래 선 두께', path: 'rules.bottom.width', min: 0.5, max: 10, step: 0.5, unit: 'px' },
      { label: '선 색', path: 'color.rule', type: 'color' }
    ] },
    { title: '여백·크기', note: '저장 가로 = 그래픽 너비 × 저장 배율', rows: [
      { label: '저장 배율', path: 'canvas.scale', min: 1, max: 3, step: 0.1, unit: '×' },
      { label: '그래픽 너비', path: 'canvas.width', min: 800, max: 1600, step: 10, unit: 'px' },
      { label: '위 여백', path: 'canvas.padding.top', min: 0, max: 120, step: 2, unit: 'px' },
      { label: '좌우 여백', path: 'canvas.padding.side', min: 0, max: 120, step: 2, unit: 'px' },
      { label: '아래 여백', path: 'canvas.padding.bottom', min: 0, max: 120, step: 2, unit: 'px' },
      { label: '로고 너비', path: 'logo.width', min: 60, max: 240, step: 2, unit: 'px' },
      { label: '로고 오른쪽 여백', path: 'logo.right', min: 0, max: 120, step: 2, unit: 'px' },
      { label: '로고 진하기', path: 'logo.opacity', min: 0.1, max: 1, step: 0.02 }
    ] }
  ];

  // 이 그래픽만 (JSON에 기록)
  function specRows(spec, eff) {
    if (!spec || !spec.type) return [];
    var t = spec.type, rows = [];
    if (t === 'bar' && !spec.series && spec.orientation !== 'vertical') rows.push({ label: '막대 두께', key: 'barHeight', min: 16, max: 72, step: 1, def: 36, unit: 'px' });
    if ((t === 'bar' && spec.orientation === 'vertical') || t === 'line') rows.push({ label: '그래프 높이', key: 'plotHeight', min: 240, max: 960, step: 10, def: 480, unit: 'px' });
    if (t === 'slope') rows.push({ label: '그래프 높이', key: 'plotHeight', min: 240, max: 960, step: 10, def: 528, unit: 'px' });
    if (t === 'table') rows.push({ label: '표 글자 크기', key: 'fontSize', min: 14, max: 36, step: 1, def: eff.font.tableCell.size, unit: 'px' });
    return rows;
  }

  var base = null, overrides = {}, onChange = null, getAccent = null, specApi = null;
  var root = null, countEl = null, specBox = null;

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function getPath(o, p) { return p.split('.').reduce(function (a, k) { return a == null ? undefined : a[k]; }, o); }
  function setPath(o, p, v) { var ks = p.split('.'), last = ks.pop(); ks.reduce(function (a, k) { if (typeof a[k] !== 'object' || a[k] === null) a[k] = {}; return a[k]; }, o)[last] = v; }
  function delPath(o, p) {
    var ks = p.split('.'), stack = [o];
    for (var i = 0; i < ks.length - 1; i++) { if (!stack[i][ks[i]]) return; stack.push(stack[i][ks[i]]); }
    delete stack[stack.length - 1][ks[ks.length - 1]];
    for (var j = ks.length - 2; j >= 0; j--) { if (Object.keys(stack[j + 1]).length === 0) delete stack[j][ks[j]]; else break; }
  }
  function merge(a, b) { Object.keys(b).forEach(function (k) { if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k])) { if (typeof a[k] !== 'object' || !a[k]) a[k] = {}; merge(a[k], b[k]); } else a[k] = b[k]; }); return a; }
  function flat(o, pre, out) { out = out || []; Object.keys(o).forEach(function (k) { var p = pre ? pre + '.' + k : k; if (o[k] && typeof o[k] === 'object' && !Array.isArray(o[k])) flat(o[k], p, out); else out.push(p); }); return out; }
  function save() { try { localStorage.setItem(STORE, JSON.stringify(overrides)); } catch (e) {} }
  function load() { try { return JSON.parse(localStorage.getItem(STORE) || '{}') || {}; } catch (e) { return {}; } }

  function effective() {
    var eff = merge(clone(base), overrides);
    // 강조 배경을 바꾸면 옅은 배경도 같이 맞춘다
    Object.keys(overrides.accents || {}).forEach(function (k) { if (overrides.accents[k].pointTint) eff.accents[k].pointTintLight = overrides.accents[k].pointTint; });
    return eff;
  }
  function resolve(path) { return path.replace('{ACC}', getAccent()); }
  function changedCount() { return flat(overrides).length; }

  function labelOf(path) {
    var acc = path.match(/^accents\.([^.]+)\.(.+)$/);
    for (var g = 0; g < GROUPS.length; g++) for (var r = 0; r < GROUPS[g].rows.length; r++) {
      var row = GROUPS[g].rows[r];
      if (row.path === path) return row.label;
      if (acc && row.path === 'accents.{ACC}.' + acc[2]) return row.label + ' · ' + String((base.accents[acc[1]] || {}).label || acc[1]).replace(/\s*\(.*\)/, '') + ' 세트';
    }
    return path;
  }

  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

  function rowUI(row) {
    var path = resolve(row.path), wrap = el('div', 'tune-row'), baseVal = getPath(base, path);
    var cur = getPath(effective(), path), changed = getPath(overrides, path) !== undefined;
    wrap.appendChild(el('label', 'tune-label', row.label));
    var ctl = el('div', 'tune-ctl');
    if (row.type === 'toggle') {
      var sw = el('label', 'tune-switch'), cb = el('input'); cb.type = 'checkbox'; cb.checked = cur !== false;
      sw.appendChild(cb); sw.appendChild(el('span', 'tune-switch-ui')); sw.appendChild(el('span', 'tune-switch-txt', cb.checked ? '넣기' : '빼기'));
      cb.addEventListener('change', function () { sw.lastChild.textContent = cb.checked ? '넣기' : '빼기'; apply(path, cb.checked, baseVal); });
      ctl.appendChild(sw); ctl.appendChild(el('span', 'tune-fill'));
    } else if (row.type === 'color') {
      var pick = el('input'); pick.type = 'color'; pick.value = cur;
      var hex = el('input', 'tune-num tune-hex'); hex.value = String(cur).toUpperCase(); hex.maxLength = 7; hex.spellcheck = false;
      pick.addEventListener('input', function () { hex.value = pick.value.toUpperCase(); apply(path, pick.value.toUpperCase(), baseVal); });
      hex.addEventListener('change', function () { if (/^#[0-9a-f]{6}$/i.test(hex.value)) { pick.value = hex.value; apply(path, hex.value.toUpperCase(), baseVal); } else hex.value = String(getPath(effective(), path)).toUpperCase(); });
      ctl.appendChild(pick); ctl.appendChild(hex); ctl.appendChild(el('span', 'tune-fill'));
    } else {
      var rng = el('input'); rng.type = 'range'; rng.min = row.min; rng.max = row.max; rng.step = row.step; rng.value = cur;
      var num = el('input', 'tune-num'); num.type = 'number'; num.min = row.min; num.max = row.max; num.step = row.step; num.value = cur;
      rng.addEventListener('input', function () { num.value = rng.value; apply(path, Number(rng.value), baseVal); });
      num.addEventListener('change', function () { var v = Math.min(row.max, Math.max(row.min, Number(num.value))); num.value = v; rng.value = v; apply(path, v, baseVal); });
      ctl.appendChild(rng); ctl.appendChild(num);
      ctl.appendChild(el('span', 'tune-unit', row.unit || ''));
    }
    var rst = el('button', 'tune-reset' + (changed ? ' on' : ''), '↺'); rst.type = 'button'; rst.title = '기본값(' + baseVal + ')으로';
    rst.addEventListener('click', function () { delPath(overrides, path); save(); build(); onChange(); });
    ctl.appendChild(rst);
    wrap.appendChild(ctl);
    if (changed) wrap.classList.add('changed');
    return wrap;
  }

  var applyTimer = null;
  function apply(path, v, baseVal) {
    if (v === baseVal) delPath(overrides, path); else setPath(overrides, path, v);
    save(); updateCount();
    clearTimeout(applyTimer); applyTimer = setTimeout(function () { markChanged(); onChange(); }, 60);
  }
  function markChanged() {
    root.querySelectorAll('.tune-row[data-path]').forEach(function (r) {
      var ch = getPath(overrides, r.getAttribute('data-path')) !== undefined;
      r.classList.toggle('changed', ch); r.querySelector('.tune-reset').classList.toggle('on', ch);
    });
  }
  function updateCount() { var n = changedCount(); countEl.textContent = n ? '바뀐 값 ' + n + '개' : '기본값 그대로'; countEl.classList.toggle('on', n > 0); }

  function build() {
    // 다시 그려도 스크롤 위치가 튀지 않게 패널·페이지 위치를 기억했다 되돌린다
    var keepPanel = root.scrollTop, keepX = window.scrollX, keepY = window.scrollY;
    root.querySelectorAll('.tune-group.common').forEach(function (g) { g.remove(); });
    var anchor = root.querySelector('.tune-actions');
    GROUPS.forEach(function (g) {
      var box = el('section', 'tune-group common');
      box.appendChild(el('h3', null, g.title + (g.note ? ' <small>' + g.note + '</small>' : '')));
      g.rows.forEach(function (row) { var r = rowUI(row); r.setAttribute('data-path', resolve(row.path)); box.appendChild(r); });
      root.insertBefore(box, anchor);
    });
    updateCount();
    root.scrollTop = keepPanel; window.scrollTo(keepX, keepY);
  }

  // 이 그래픽만
  function refreshSpec(spec) {
    if (!specBox) return;
    specBox.innerHTML = '';
    var eff = effective(), rows = specRows(spec, eff);
    specBox.appendChild(el('h3', null, '이 그래픽만 <small>JSON에 바로 기록, 지침에는 반영 안 됨</small>'));
    if (!rows.length) { specBox.appendChild(el('p', 'tune-empty', spec && spec.type ? '이 유형은 따로 조정할 값이 없습니다.' : 'JSON을 붙여넣으면 이 그래픽에 맞는 조정 항목이 나옵니다.')); return; }
    rows.forEach(function (row) {
      var wrap = el('div', 'tune-row'), cur = spec[row.key] != null ? spec[row.key] : (row.def != null ? row.def : row.min);
      wrap.appendChild(el('label', 'tune-label', row.label));
      var ctl = el('div', 'tune-ctl');
      var rng = el('input'); rng.type = 'range'; rng.min = row.min; rng.max = row.max; rng.step = row.step; rng.value = cur;
      var num = el('input', 'tune-num'); num.type = 'number'; num.min = row.min; num.max = row.max; num.step = row.step; num.value = cur;
      var t = null;
      var push = function (v) { clearTimeout(t); t = setTimeout(function () { var s = specApi.get(); if (!s) return; s[row.key] = v; specApi.set(s); }, 120); };
      rng.addEventListener('input', function () { num.value = rng.value; push(Number(rng.value)); });
      num.addEventListener('change', function () { var v = Math.min(row.max, Math.max(row.min, Number(num.value))); num.value = v; rng.value = v; push(v); });
      ctl.appendChild(rng); ctl.appendChild(num); ctl.appendChild(el('span', 'tune-unit', row.unit || ''));
      var rst = el('button', 'tune-reset' + (spec[row.key] != null ? ' on' : ''), '↺'); rst.type = 'button'; rst.title = '기본값으로';
      rst.addEventListener('click', function () { var s = specApi.get(); if (!s) return; delete s[row.key]; specApi.set(s); });
      ctl.appendChild(rst);
      if (spec[row.key] != null) wrap.classList.add('changed');
      wrap.appendChild(ctl); specBox.appendChild(wrap);
    });
  }

  function copyText() {
    var paths = flat(overrides);
    if (!paths.length) return null;
    var lines = paths.map(function (p) { return '- ' + labelOf(p) + ': ' + getPath(base, p) + ' → ' + getPath(overrides, p) + '   (' + p + ')'; });
    return 'Tapa Chart에서 화면을 보며 조정한 디자인 값입니다.\n' +
      'Newstapa/design-system 저장소의 assets/tokens.json에 아래 값을 반영하고, guide.md의 색·글자 크기 표도 같이 맞춰 주세요. CHANGELOG에 적고 tokens.json의 version도 올려 주세요.\n\n' +
      '바꾼 값:\n' + lines.join('\n') + '\n\n' +
      'tokens.json에 덮어쓸 값(JSON 병합):\n' + JSON.stringify(overrides, null, 2) + '\n';
  }

  function init(opts) {
    base = opts.base; onChange = opts.onChange; getAccent = opts.getAccent; specApi = opts.spec;
    overrides = load();
    root = opts.root;
    root.innerHTML = '';
    var head = el('div', 'tune-head');
    head.appendChild(el('p', 'tune-intro', '값을 바꾸면 미리보기에 바로 반영됩니다. 마음에 들면 이미지를 저장하고, 앞으로도 이렇게 쓰려면 <b>변경값 복사</b>로 지침에 반영하세요.'));
    countEl = el('span', 'tune-count'); head.appendChild(countEl);
    root.appendChild(head);
    specBox = el('section', 'tune-group spec'); root.appendChild(specBox);
    var actions = el('div', 'tune-actions');
    var bCopy = el('button', 'btn primary', '변경값 복사 (지침 반영용)'); bCopy.type = 'button';
    var bReset = el('button', 'btn outline', '모두 되돌리기'); bReset.type = 'button';
    actions.appendChild(bCopy); actions.appendChild(bReset);
    root.appendChild(actions);
    bCopy.addEventListener('click', function () { var t = copyText(); opts.copy(t); });
    bReset.addEventListener('click', function () { overrides = {}; save(); build(); onChange(); });
    build();
  }

  window.NTTuner = { init: init, effective: effective, refreshSpec: refreshSpec, rebuild: function () { if (root) build(); }, copyText: copyText };
})();

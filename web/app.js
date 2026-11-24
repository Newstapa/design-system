/* 뉴스타파 그래픽 렌더러 (A안: 페이지에 AI 없음)
 * 1) tokens.json을 읽는다  2) 붙여넣은 JSON을 엔진(NT.render)으로 그린다  3) html-to-image로 JPG 저장
 * 모든 처리는 브라우저 안에서 일어나며 서버로 보내는 데이터는 없다.
 */
(function () {
  'use strict';
  var BASE = '../';
  var EXAMPLES = [
    ['bar-horizontal', '가로 막대'], ['bar-vertical', '세로 막대'], ['bar-stacked', '누적 비율 막대'],
    ['bar-diverging', '양방향 막대'], ['line', '꺾은선'], ['line-multi', '꺾은선 여러 개'],
    ['slope', '기울기'], ['dot', '화살표 점'], ['pie', '원그래프'], ['table', '표'],
    ['timeline', '타임라인'], ['map', '지도'], ['stat-table', '숫자 카드 + 표']
  ];
  var SPEC_URL = 'https://raw.githubusercontent.com/Newstapa/design-system/main/for-ai/json-spec.md';
  var SHORT_PROMPT = '아래 주소의 뉴스타파 그래픽 지침을 읽고, 그 형식에 맞는 JSON을 만들어 주세요.\n' + SPEC_URL + '\n\n[기사]\n';
  var PROMPT_TAIL = '\n\n---\n위 지침에 따라 아래 기사(또는 데이터)로 그래픽 JSON을 만들어 주세요.\n\n[기사]\n';

  var $ = function (id) { return document.getElementById(id); };
  var specEl = $('spec'), msgEl = $('messages'), mount = $('mount'), scaler = $('scaler'), stage = $('stage');
  var saveBtn = $('save'), emptyEl = $('empty');
  var tokens = null, geo = null, timer = null, lastTitle = 'graphic';

  window.NT_LOGO_SRC = BASE + 'assets/logo.png';

  function toast(msg) {
    var t = $('toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(t._h); t._h = setTimeout(function () { t.classList.remove('show'); }, 2200);
  }
  function esc(s) { return String(s).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }

  // AI 답변에 설명 문장이나 ```json 이 섞여 있어도 JSON 부분만 꺼낸다
  function extractJSON(text) {
    var fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) text = fence[1];
    var a = text.indexOf('{'), b = text.lastIndexOf('}');
    if (a < 0 || b < a) throw new Error('JSON을 찾지 못했습니다. { 로 시작하는 내용을 붙여넣어 주세요.');
    var body = text.slice(a, b + 1);
    try { return JSON.parse(body); }
    catch (e) {
      var m = String(e.message).match(/position (\d+)/), where = '';
      if (m) { var pos = +m[1], line = body.slice(0, pos).split('\n').length; where = ' (' + line + '번째 줄 근처)'; }
      throw new Error('JSON 형식 오류' + where + ': 쉼표·따옴표·괄호가 빠졌는지 확인하세요.');
    }
  }

  function showMessages(err, warns) {
    if (err) { msgEl.innerHTML = '<div class="err">' + esc(err) + '</div>'; return; }
    if (!warns.length) { msgEl.innerHTML = '<div class="ok">경고 없음 — 숫자와 출처를 확인한 뒤 저장하세요.</div>'; return; }
    msgEl.innerHTML = '<div class="warn-title">확인할 점 ' + warns.length + '개</div><ul>' + warns.map(function (w) { return '<li>' + esc(w) + '</li>'; }).join('') + '</ul>';
  }

  function needsMap(spec) { return spec.type === 'map' || (spec.blocks || []).some(function (b) { return b.type === 'map'; }); }

  function fit() {
    var frame = mount.firstElementChild; if (!frame) { stage.style.height = ''; return; }
    var avail = stage.clientWidth - 32, w = frame.offsetWidth, s = Math.min(1, avail / w);
    scaler.style.width = w + 'px';
    scaler.style.transform = 'scale(' + s + ')';
    stage.style.height = (frame.offsetHeight * s + 32) + 'px';
  }

  async function render() {
    var text = specEl.value.trim();
    if (!text) { mount.innerHTML = ''; emptyEl.hidden = false; saveBtn.disabled = true; msgEl.innerHTML = ''; fit(); return; }
    var spec;
    try { spec = extractJSON(text); } catch (e) { showMessages(e.message); saveBtn.disabled = true; return; }
    try {
      if (needsMap(spec) && !geo) { geo = await (await fetch(BASE + 'assets/maps/korea-sido.geo.json')).json(); window.NT_GEO_KOREA = geo; }
      scaler.style.transform = 'none';          // 엔진의 넘침 검사가 실제 크기로 이뤄지도록
      mount.innerHTML = '';
      var warns = NT.render(spec, tokens, mount);
      emptyEl.hidden = true; saveBtn.disabled = false;
      lastTitle = (spec.title || 'graphic').replace(/\n/g, ' ');
      showMessages(null, warns);
    } catch (e) {
      mount.innerHTML = ''; emptyEl.hidden = false; saveBtn.disabled = true;
      showMessages('그리기 오류: ' + (e && e.message || e));
    }
    fit();
  }

  async function save() {
    var frame = mount.firstElementChild; if (!frame) return;
    saveBtn.disabled = true; saveBtn.textContent = '저장 중…';
    try {
      var url = await htmlToImage.toJpeg(frame, { quality: tokens.canvas.quality / 100, pixelRatio: tokens.canvas.scale, backgroundColor: '#FFFFFF', cacheBust: false });
      var d = new Date(), ymd = d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
      var name = ymd + '_' + lastTitle.replace(/[\\/:*?"<>|'\s]+/g, '_').slice(0, 40) + '.jpg';
      var blob = await (await fetch(url)).blob(), href = URL.createObjectURL(blob);
      var a = document.createElement('a'); a.href = href; a.download = name; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(href); }, 5000);
      toast('저장했습니다: ' + name);
    } catch (e) {
      toast('저장 실패: ' + (e && e.message || e));
    }
    saveBtn.disabled = false; saveBtn.textContent = 'JPG 저장';
  }

  async function copyText(txt) {
    if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(txt);
    else { var ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); }
  }
  async function copyPrompt() {
    try { await copyText(SHORT_PROMPT); toast('요청문을 복사했습니다. AI 대화창에 붙여넣고 기사를 덧붙이세요.'); }
    catch (e) { toast('복사 실패: ' + (e && e.message || e)); }
  }
  async function copyFull() {
    try {
      var txt = await (await fetch(BASE + 'for-ai/json-spec.md')).text();
      await copyText(txt + PROMPT_TAIL);
      toast('전체 지침을 복사했습니다. AI 대화창에 붙여넣고 기사를 덧붙이세요.');
    } catch (e) { toast('복사 실패: ' + (e && e.message || e)); }
  }

  async function loadExample(name) {
    if (!name) return;
    var txt = await (await fetch(BASE + 'examples/' + name + '.json')).text();
    specEl.value = txt; render();
  }

  async function init() {
    var sel = $('example');
    EXAMPLES.forEach(function (e) { var o = document.createElement('option'); o.value = e[0]; o.textContent = e[1]; sel.appendChild(o); });
    sel.addEventListener('change', function () { loadExample(sel.value); });
    specEl.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(render, 300); });
    saveBtn.addEventListener('click', save);
    $('copyPrompt').addEventListener('click', copyPrompt);
    $('copyFull').addEventListener('click', copyFull);
    window.addEventListener('resize', fit);
    tokens = await (await fetch(BASE + 'assets/tokens.json')).json();
    await document.fonts.load('700 20px "Pretendard Variable"');
    await document.fonts.ready;
    window.NT_APP_READY = true;
  }
  init().catch(function (e) { showMessages('초기화 오류: ' + (e && e.message || e) + ' — 웹 서버로 열었는지 확인하세요 (파일을 직접 열면 동작하지 않습니다).'); });
})();

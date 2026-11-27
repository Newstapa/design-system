# 뉴스타파 그래픽 렌더러 (웹)

AI가 만든 JSON을 붙여넣으면 뉴스타파 디자인 가이드대로 그래픽을 그리고 JPG·SVG·JSON으로 저장하는 정적 웹 페이지입니다.
페이지 안에 AI가 없고, 모든 처리는 브라우저에서 일어납니다. 서버나 API 키가 필요 없습니다.

## 디자이너 모드

'디자인 조정' 탭, '디자인 가이드'·'GitHub' 버튼은 디자이너 모드에서만 보입니다.
왼쪽 위 **뉴스타파 로고를 2초 동안 길게 누르면** 켜지고, 한 번 더 길게 누르면 꺼집니다. 켠 상태는 새로고침해도 유지되고, 탭이나 창을 닫으면 꺼집니다.
디자이너 모드가 꺼져 있으면 '디자인 조정'에서 바꾼 값도 적용하지 않고 기본 디자인으로 그립니다(기자에게 보이는 화면과 같음).
화면에서 숨기는 것일 뿐 접근 제한(보안)은 아닙니다.

## 구조

```
design-system/
├─ web/index.html, app.js, app.css   ← 이 페이지
├─ web/vendor/html-to-image.js       ← 화면을 JPG로 바꾸는 라이브러리 (MIT)
├─ engine/                           ← 그래픽을 그리는 엔진 (스킬과 같은 파일)
├─ assets/tokens.json                ← 색·글자 크기 원본. 여기만 고치면 전체 반영
├─ assets/fonts, logo.png, maps/
├─ examples/                         ← '예시 불러오기' 목록
└─ for-ai/json-spec.md               ← 'AI 지침 복사' 버튼이 복사하는 내용
```

## 로컬에서 열기

파일을 더블클릭하면 동작하지 않습니다(브라우저 보안 때문에 tokens.json을 못 읽음). 간단한 웹 서버로 엽니다.

```
cd design-system
python3 -m http.server 8000
```

브라우저에서 http://localhost:8000/web/ 접속.

## 배포

저장소 설정 → Pages에서 `main` 브랜치 `/ (root)`를 켜면 https://newstapa.github.io/design-system/web/ 으로 열립니다. 수정 후 캐시 때문에 바로 안 바뀌면 index.html의 `?v=` 숫자를 올립니다.

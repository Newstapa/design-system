# AGENTS.md

이 저장소를 받은 AI 코딩 도구(Codex, Cursor, Gemini CLI, Claude Code 등)를 위한 안내입니다.

## 그래픽을 만들어 달라는 요청이면

1. `guide.md`를 읽습니다.
2. `for-ai/json-spec.md`에 따라 spec JSON을 씁니다. `examples/`에 유형별 예시가 있습니다.
3. `python3 scripts/render.py spec.json -o out.jpg`로 렌더링합니다. (필요: `pip install playwright && playwright install chromium`)
4. 경고가 없어질 때까지 spec을 고칩니다. 결과 이미지를 직접 열어 확인합니다.
5. 기사에 없는 숫자를 만들지 않습니다.

## 이 저장소를 고치는 요청이면

- 색·크기는 `assets/tokens.json`에서만 정합니다. 엔진에 색 값을 새로 하드코딩하지 않습니다.
- 엔진은 의존성 없는 JavaScript(ES5 문법, 빌드 없음)입니다. TypeScript나 번들러를 들이지 않습니다.
- 엔진을 고치면 `examples/` 전체를 렌더링해 결과 이미지를 확인합니다:
  `for f in examples/*.json; do python3 scripts/render.py "$f" -o "/tmp/$(basename "$f" .json).jpg"; done`
- Tapa Chart(`web/`)를 고치면 데스크톱과 모바일 너비에서 화면을 확인합니다.
- 바꾼 내용은 `CHANGELOG.md`에 적고 `assets/tokens.json`의 `version`을 올립니다.

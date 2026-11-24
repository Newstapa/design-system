# 뉴스타파 디자인 시스템

디자이너가 아닌 기자도 AI로 뉴스타파 디자인 가이드에 맞는 그래픽을 만들 수 있게 하는 저장소입니다.
이 저장소 하나가 **원본**입니다. AI(스킬·맞춤형 GPT·Gem)는 매번 여기서 지침을 읽어 갑니다.

## 기자가 쓰는 법

AI에 기사나 데이터를 붙여넣고 **"시각화해줘"** 라고 쓰면 됩니다. AI별 준비는 한 번만 합니다.

| 쓰는 AI | 한 번만 할 준비 | 결과 |
|---|---|---|
| Claude (Cowork, Claude Code, claude.ai) | `newstapa-graphics` 스킬 설치 (관리자가 조직 스킬로 등록) | 엔진이 그린 JPG. 디자인 완전 일치 |
| ChatGPT, Gemini 등 | [`for-ai/custom-instructions.md`](for-ai/custom-instructions.md)의 문구를 맞춤형 GPT·Gem 지침에 붙여넣기 | AI가 가이드를 보고 직접 그림. 색·구성은 맞지만 세부는 조금 다를 수 있음 |
| 정확히 같은 디자인이 필요할 때 | 없음 | AI가 준 JSON을 [웹 렌더러](https://newstapa.github.io/design-system/web/)에 붙여넣어 JPG 저장 |

## 구성

```
guide.md                     디자인 가이드 (사람·AI 공용, 가장 먼저 읽는 문서)
assets/tokens.json           색·글자 크기·여백 원본. 디자인 수치는 여기만 고친다
for-ai/json-spec.md          엔진용 JSON 작성법 (Claude 스킬, 웹 렌더러)
for-ai/draw-yourself.md      엔진을 못 쓰는 AI가 직접 그릴 때의 규칙
for-ai/custom-instructions.md  ChatGPT·Gemini 지침 칸에 붙여넣을 문구
engine/                      그래픽 엔진 (JavaScript)
scripts/render.py            JSON → JPG 렌더링 (Python + Playwright)
scripts/build-skill.sh       Claude 스킬 zip 만들기
skills/newstapa-graphics/    Claude 스킬 (GitHub 최신본을 받아 씀)
web/                         웹 렌더러 (GitHub Pages)
examples/                    유형별 JSON 예시
assets/fonts, logo.png, maps/  Pretendard 글꼴, 로고, 한국 시·도 지도
```

## 고치는 법

| 바꾸고 싶은 것 | 고칠 파일 | 다시 배포할 것 |
|---|---|---|
| 색, 글자 크기, 여백 | `assets/tokens.json` | 없음 (push하면 바로 반영) |
| 디자인 원칙, 문구 | `guide.md`, `for-ai/*.md` | 없음 |
| 그래픽 모양, 새 유형 | `engine/`, `examples/` | 없음. 웹 렌더러는 `web/index.html`의 `?v=` 숫자를 올림 |
| 스킬 동작 순서 | `skills/newstapa-graphics/SKILL.md` | `bash scripts/build-skill.sh` 후 zip을 다시 등록 |

수정 내역은 [CHANGELOG.md](CHANGELOG.md)에 적습니다. `assets/tokens.json`의 `version`도 올립니다.

## 직접 실행해 보기

```bash
# JSON → JPG
pip install playwright && playwright install chromium
python3 scripts/render.py examples/bar-horizontal.json -o out.jpg

# 웹 렌더러
python3 -m http.server 8000   # http://localhost:8000/web/
```

## 라이선스

- Pretendard: SIL Open Font License 1.1
- html-to-image: MIT
- 한국 시·도 경계: southkorea/southkorea-maps (통계청 2013 기준)
- 뉴스타파 로고는 뉴스타파의 자산입니다. 뉴스타파 기사 그래픽 외 용도로 쓰지 마세요.

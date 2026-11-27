# 뉴스타파 디자인 시스템

디자이너가 아닌 기자도 AI로 뉴스타파 디자인 가이드에 맞는 그래픽을 만들 수 있게 하는 저장소입니다.
이 저장소 하나가 **원본**입니다. AI(스킬·맞춤형 GPT·Gem)는 매번 여기서 지침을 읽어 갑니다.

## 바로가기

| 무엇 | 주소 |
|---|---|
| Tapa Chart (JSON → JPG·SVG·JSON) | https://newstapa.github.io/design-system/web/ |
| Claude 스킬 (zip) | https://newstapa.github.io/design-system/downloads/newstapa-graphics.zip |
| 디자인 가이드 | https://github.com/Newstapa/design-system/blob/main/guide.md |
| AI가 읽는 지침 (원문) | https://raw.githubusercontent.com/Newstapa/design-system/main/guide.md |
| ChatGPT·Gemini 지침 칸에 넣을 문구 | https://github.com/Newstapa/design-system/blob/main/for-ai/custom-instructions.md |

> Tapa Chart 주소는 저장소 Settings → Pages에서 `main` / `(root)`를 켜야 열립니다.

## 기자가 쓰는 법

AI에 기사나 데이터를 붙여넣고 **"시각화해줘"** 라고 쓰면 됩니다. AI별 준비는 한 번만 합니다.

| 쓰는 AI | 한 번만 할 준비 | 결과 |
|---|---|---|
| Claude (Cowork, Claude Code, claude.ai) | `newstapa-graphics` 스킬 설치 (관리자가 조직 스킬로 등록) | 엔진이 그린 JPG. 디자인 완전 일치 |
| ChatGPT, Gemini 등 | [`for-ai/custom-instructions.md`](for-ai/custom-instructions.md)의 문구를 맞춤형 GPT·Gem 지침에 붙여넣기 | AI가 가이드를 보고 직접 그림. 색·구성은 맞지만 세부는 조금 다를 수 있음 |
| 정확히 같은 디자인이 필요할 때 | 없음 | AI가 준 JSON을 [Tapa Chart](https://newstapa.github.io/design-system/web/)에 붙여넣어 다운로드(JPG·SVG·JSON) |

## 구성

```
guide.md                     디자인 가이드 (사람·AI 공용, 가장 먼저 읽는 문서)
assets/tokens.json           색·글자 크기·여백 원본. 디자인 수치는 여기만 고친다
for-ai/json-spec.md          엔진용 JSON 작성법 (Claude 스킬, Tapa Chart)
for-ai/draw-yourself.md      엔진을 못 쓰는 AI가 직접 그릴 때의 규칙
for-ai/custom-instructions.md  ChatGPT·Gemini 지침 칸에 붙여넣을 문구
engine/                      그래픽 엔진 (JavaScript). nt-export-svg.js는 일러스트용 SVG 변환
scripts/render.py            JSON → JPG·SVG·PDF 렌더링 (Python + Playwright)
scripts/build-skill.sh       Claude 스킬 zip 만들기
skills/newstapa-graphics/    Claude 스킬 (GitHub 최신본을 받아 씀)
web/                         Tapa Chart (GitHub Pages)
examples/                    유형별 JSON 예시
assets/fonts, logo.png, maps/  Pretendard 글꼴, 로고, 한국 시·도 지도
```

## 고치는 법

| 바꾸고 싶은 것 | 고칠 파일 | 다시 배포할 것 |
|---|---|---|
| 색, 글자 크기, 여백 | `assets/tokens.json` | 없음 (push하면 바로 반영) |
| 화면을 보며 값 찾기 | Tapa Chart '디자인 조정' 탭 → '변경값 복사'를 Claude에 붙여넣어 반영 | 없음 |
| 강조색 추가·수정 | `assets/tokens.json`의 `accents` + `guide.md` 색 표 | 없음 |
| 디자인 원칙, 문구 | `guide.md`, `for-ai/*.md` | 없음 |
| 그래픽 모양, 새 유형 | `engine/`, `examples/` | 없음. Tapa Chart는 `web/index.html`의 `?v=` 숫자를 올림 |
| 스킬 동작 순서 | `skills/newstapa-graphics/SKILL.md` | `bash scripts/build-skill.sh` 후 zip을 다시 등록 |

수정 내역은 [CHANGELOG.md](CHANGELOG.md)에 적습니다. `assets/tokens.json`의 `version`도 올립니다.

## 일러스트레이터에서 고치기

Tapa Chart의 '다운로드' 버튼(JPG·SVG·JSON이 함께 저장됨), 또는 `render.py --svg`로 받은 SVG를 일러스트레이터에서 엽니다.
글자는 줄 단위 텍스트, 막대·선은 개별 도형으로 들어 있어 바로 고칠 수 있습니다.

- 맥에 **Pretendard 글꼴을 설치**해야 글자가 제대로 보입니다: https://github.com/orioncactus/pretendard/releases
- 지도의 지역 이름은 흰 테두리용 글자와 본 글자가 겹쳐 두 개씩 들어 있습니다. 고칠 때 둘 다 고칩니다.

## 직접 실행해 보기

```bash
# JSON → JPG
pip install playwright && playwright install chromium
python3 scripts/render.py examples/bar-horizontal.json -o out.jpg --svg out.svg

# Tapa Chart
python3 -m http.server 8000   # http://localhost:8000/web/
```

## 라이선스

- Pretendard: SIL Open Font License 1.1
- html-to-image: MIT
- 한국 시·도 경계: southkorea/southkorea-maps (통계청 2013 기준)
- 뉴스타파 로고는 뉴스타파의 자산입니다. 뉴스타파 기사 그래픽 외 용도로 쓰지 마세요.

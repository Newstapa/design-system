---
name: newstapa-graphics
description: 뉴스타파 기사용 그래픽(막대·꺾은선·원그래프, 표, 숫자 카드)을 뉴스타파 디자인 가이드에 맞춘 JPG로 만든다. 기사나 데이터를 주고 "시각화해줘", "그래프/표로 만들어줘", "기사 이미지 만들어줘"라고 할 때 사용. 지도·타임라인 등 지원하지 않는 유형을 요청받으면 디자이너 문의를 안내한다.
---

# 뉴스타파 그래픽

디자인 지침과 그래픽 엔진의 원본은 GitHub에 있습니다: https://github.com/Newstapa/design-system
**매번 최신본을 받아서 씁니다.** 받을 수 없을 때만 이 스킬에 들어 있는 사본(`bundle/`)을 씁니다.

## 1. 최신본 준비

```bash
set -o pipefail
DS=/tmp/newstapa-design-system
rm -rf "$DS" && mkdir -p "$DS"
if curl -fsSL --max-time 20 https://codeload.github.com/Newstapa/design-system/tar.gz/refs/heads/main \
   | tar xz -C "$DS" --strip-components=1; then
  echo "최신본 사용: $(python3 -c "import json;print(json.load(open('$DS/assets/tokens.json'))['version'])")"
else
  rm -rf "$DS"; cp -R "<이 SKILL.md가 있는 폴더>/bundle" "$DS"
  echo "GitHub에 연결할 수 없어 스킬 내장 사본 사용"
fi
```

내장 사본을 썼다면 결과를 전할 때 "최신 지침이 아닐 수 있다"고 한 줄 알립니다.

## 2. 지침 읽기

`$DS/guide.md`(디자인 가이드)와 `$DS/for-ai/json-spec.md`(그래픽 JSON 작성법)를 읽습니다.
지침 내용은 이 SKILL.md보다 GitHub 문서가 우선입니다.

## 3. 만들기

1. 기사에서 핵심 메시지 한 문장 → `title`. 유형과 강조 항목(1~2개)을 정합니다.
2. 기사에 없는 숫자는 쓰지 않습니다. 숫자·출처가 부족하면 기자에게 먼저 묻습니다.
3. `$DS/examples/`에서 같은 유형 예시를 참고해 spec JSON을 작성합니다. 색·글꼴은 지정하지 않습니다.
4. 렌더링:
   ```bash
   python3 "$DS/scripts/render.py" spec.json -o 결과.jpg
   ```
   Playwright가 없으면: `pip install playwright && playwright install chromium`
   기자가 일러스트레이터에서 고칠 원본을 원하면 `--svg 결과.svg`(또는 `--pdf 결과.pdf`)를 함께 붙입니다.
5. 출력된 **경고가 없어질 때까지** spec을 고쳐 다시 렌더링합니다.
6. 이미지를 직접 열어 글자 겹침·잘림이 없는지 확인합니다.
7. 기자에게 JPG(요청 시 SVG도)와 함께 "무엇을 강조했는지" 한 줄을 전합니다.
   처음엔 기본 주황으로 만들고, "빨강·파랑·초록 강조색 버전도 가능하다"고 한 줄 덧붙입니다. 기자가 고르면 spec에 `"accent"`를 넣어 다시 렌더링합니다.

누적 비율 막대, 묶음·양방향 막대(+/− 값이 섞인 막대 포함), 기울기, 화살표 점, 지도, 타임라인, 흐름도·관계도·사진 비교는 만들지 않습니다. 엔진도 이 유형은 그리지 않습니다. 기자에게 "이 그래픽(○○)은 디자이너 작업이 필요한 유형입니다. 뉴스타파 디자이너에게 문의해 주세요."라고 안내하고, 막대·꺾은선·원·표·숫자 카드로 전달할 수 있는 다른 숫자가 있으면 그것을 제안합니다.

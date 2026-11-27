#!/usr/bin/env bash
# 저장소 내용으로 Claude 스킬 zip을 만든다.
#   bash scripts/build-skill.sh   →  downloads/newstapa-graphics.zip (Tapa Chart '스킬 다운로드' 버튼이 이 파일을 받는다)
# 스킬은 실행할 때 GitHub 최신본을 먼저 받으므로, 지침만 고쳤다면 다시 만들 필요가 없다.
# SKILL.md를 고쳤거나, 오프라인용 내장 사본(bundle/)을 최신으로 맞추고 싶을 때만 다시 만든다.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/downloads"
TMP="$(mktemp -d)"
SK="$TMP/newstapa-graphics"
mkdir -p "$SK/bundle" "$OUT"

cp "$ROOT/skills/newstapa-graphics/SKILL.md" "$SK/"
cp -R "$ROOT/guide.md" "$ROOT/assets" "$ROOT/engine" "$ROOT/examples" "$ROOT/for-ai" "$SK/bundle/"
mkdir -p "$SK/bundle/scripts" && cp "$ROOT/scripts/render.py" "$SK/bundle/scripts/"

rm -f "$OUT/newstapa-graphics.zip"
(cd "$TMP" && zip -qr "$OUT/newstapa-graphics.zip" newstapa-graphics)
rm -rf "$TMP"
echo "만들었습니다: downloads/newstapa-graphics.zip"

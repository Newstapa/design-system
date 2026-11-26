#!/usr/bin/env python3
"""뉴스타파 그래픽 렌더러: spec JSON → JPG

사용법:
  python3 scripts/render.py spec.json -o out.jpg [--svg out.svg] [--pdf out.pdf] [--html out.html] [--scale 1.2]

- 저장 가로 크기 = tokens.json의 canvas.width(설계 기준 1000) × canvas.scale(1.2) = 1200px

- --svg: 어도비 일러스트레이터에서 글자·도형을 고칠 수 있는 SVG (맥에 Pretendard 설치 필요)
- --pdf: 같은 내용의 벡터 PDF

- 색·폰트·여백은 assets/tokens.json에서만 가져온다.
- 엔진 경고(강조 누락, 출처 누락, 넘침 등)를 출력한다. 경고가 있으면 spec을 고치고 다시 렌더한다.
"""
import argparse, base64, json, pathlib, sys, tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent


def build_html(spec: dict) -> str:
    tokens = json.loads((ROOT / "assets/tokens.json").read_text(encoding="utf-8"))
    css = (ROOT / "engine/nt-graphic.css").read_text(encoding="utf-8")
    font_uri = (ROOT / "assets/fonts/PretendardVariable.woff2").as_uri()
    css = css.replace("../assets/fonts/PretendardVariable.woff2", font_uri)
    js = (ROOT / "engine/nt-graphic.js").read_text(encoding="utf-8")
    js += "\n" + (ROOT / "engine/nt-export-svg.js").read_text(encoding="utf-8")
    logo = base64.b64encode((ROOT / "assets/logo.png").read_bytes()).decode()
    geo = ""
    if spec.get("type") == "map" or any(b.get("type") == "map" for b in spec.get("blocks", [])):
        geo = "window.NT_GEO_KOREA=" + (ROOT / "assets/maps/korea-sido.geo.json").read_text(encoding="utf-8") + ";"
    return f"""<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8">
<style>{css}</style></head><body><div id="mount"></div>
<script>window.NT_LOGO_SRC='data:image/png;base64,{logo}';{geo}</script>
<script>{js}</script>
<script>
window.__NT_TOKENS={json.dumps(tokens, ensure_ascii=False)};
window.__NT_SPEC={json.dumps(spec, ensure_ascii=False)};
document.fonts.load('700 20px "Pretendard Variable"').then(function(){{return document.fonts.ready}}).then(function(){{
  try {{ window.__NT_WARN = NT.render(window.__NT_SPEC, window.__NT_TOKENS, document.getElementById('mount')); }}
  catch(e) {{ window.__NT_ERR = String(e && e.stack || e); }}
  window.__NT_DONE = true;
}});
</script></body></html>"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("spec")
    ap.add_argument("-o", "--out", required=True)
    ap.add_argument("--html", help="중간 HTML도 저장")
    ap.add_argument("--svg", help="일러스트레이터 편집용 SVG도 저장")
    ap.add_argument("--pdf", help="벡터 PDF도 저장")
    ap.add_argument("--scale", type=float, default=None)
    a = ap.parse_args()

    spec = json.loads(pathlib.Path(a.spec).read_text(encoding="utf-8"))
    tokens = json.loads((ROOT / "assets/tokens.json").read_text(encoding="utf-8"))
    scale = a.scale or tokens["canvas"]["scale"]
    html = build_html(spec)
    tmp = pathlib.Path(tempfile.mkdtemp()) / "graphic.html"
    tmp.write_text(html, encoding="utf-8")
    if a.html:
        pathlib.Path(a.html).write_text(html, encoding="utf-8")

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        sys.exit("playwright가 없습니다: pip install playwright && playwright install chromium")

    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={"width": (spec.get("width") or tokens["canvas"]["width"]) + 40, "height": 800}, device_scale_factor=scale)
        pg.goto(tmp.as_uri())
        pg.wait_for_function("window.__NT_DONE === true", timeout=20000)
        err = pg.evaluate("window.__NT_ERR || null")
        if err:
            b.close(); sys.exit("렌더 오류: " + err)
        warns = pg.evaluate("window.__NT_WARN || []")
        out = pathlib.Path(a.out)
        el = pg.locator("#nt-frame")
        if out.suffix.lower() in (".jpg", ".jpeg"):
            el.screenshot(path=str(out), type="jpeg", quality=tokens["canvas"]["quality"])
        else:
            el.screenshot(path=str(out))
        box = el.bounding_box()
        if a.svg:
            pathlib.Path(a.svg).write_text(pg.evaluate(f"NTExport.toSVG(document.getElementById('nt-frame'), {scale})"), encoding="utf-8")
            print(f"저장: {a.svg}")
        if a.pdf:
            pg.add_style_tag(content="html,body{margin:0;padding:0} #mount{width:max-content}")
            pg.pdf(path=a.pdf, width=f"{int(box['width'] * scale)}px", height=f"{int(box['height'] * scale) + 1}px", print_background=True, page_ranges="1", scale=min(2, scale))
            print(f"저장: {a.pdf}")
        b.close()

    print(f"저장: {out}  ({int(box['width']*scale)}×{int(box['height']*scale)}px)")
    if warns:
        print("경고:")
        for w in warns:
            print("  -", w)
    else:
        print("경고 없음")


if __name__ == "__main__":
    main()

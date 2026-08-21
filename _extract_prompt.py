# gem_탐방설계_시험기.md §2 코드펜스를 gem-prompt.js 로 추출한다.
from pathlib import Path
import json

src = Path(__file__).resolve().parents[1] / "재설계" / "실습" / "gem_탐방설계_시험기.md"
out = Path(__file__).with_name("gem-prompt.js")
lines = src.read_text(encoding="utf-8").splitlines()
start_i = end_i = None
in_section = False
fence = "`" * 3
for i, line in enumerate(lines):
    if line.startswith("## 2. Instructions"):
        in_section = True
    if in_section and line.strip() == fence:
        if start_i is None:
            start_i = i
        else:
            end_i = i
            break
if start_i is None or end_i is None:
    raise SystemExit("instructions fence not found")
body = "\n".join(lines[start_i + 1:end_i]) + "\n"
header = "/* 3일차 Gem Instructions. SSOT: 재설계/실습/gem_탐방설계_시험기.md §2. 이 파일은 추출본이다. */\n"
out.write_text(
    header + "window.GEM_INSTRUCTIONS = " + json.dumps(body, ensure_ascii=False) + ";\n",
    encoding="utf-8",
)
print("wrote", out.name, "chars", len(body), "lines", body.count("\n"))
print("head", body[:40].replace("\n", " / "))

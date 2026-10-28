from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1] / "site"
KEYFRAMES = re.compile(
    r"@keyframes\s+[\w-]+\s*\{(?:[^{}]|\{[^{}]*\})*\}",
    re.S,
)
FONTFACE = re.compile(r"@font-face\s*\{[^{}]*\}", re.S)


def wrap(css: str) -> str:
    fonts = FONTFACE.findall(css)
    frames = KEYFRAMES.findall(css)
    rest = css
    for block in fonts + frames:
        rest = rest.replace(block, "")
    rest = rest.replace(":root", "&")
    rest = rest.strip()
    parts = []
    if fonts:
        parts.append("\n\n".join(fonts))
    if frames:
        parts.append("\n\n".join(frames))
    if rest:
        parts.append(f".cedar-site {{\n{rest}\n}}")
    return "\n\n".join(parts).strip() + "\n"


def main() -> None:
    for path in ROOT.rglob("*.css"):
        original = path.read_text(encoding="utf-8")
        if path.name == "index.css":
            continue
        if original.lstrip().startswith(".cedar-site {") and "@keyframes" not in original[:200]:
            continue
        updated = wrap(original)
        if updated != original:
            path.write_text(updated, encoding="utf-8")
            print(path.relative_to(ROOT))


if __name__ == "__main__":
    main()

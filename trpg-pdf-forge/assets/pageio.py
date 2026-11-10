"""Small shared layer for page JSON and project JSON files."""
from __future__ import annotations

import json
from pathlib import Path


def read_json(path, fallback=None):
    try:
        return json.loads(Path(path).read_text(encoding="utf-8-sig"))
    except Exception:
        if fallback is not None:
            return fallback
        raise


def write_json(path, value):
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def load_specs(pages_dir) -> list[dict]:
    specs = []
    for file in sorted(Path(pages_dir).glob("*.json")):
        if file.name.startswith("_"):
            continue
        try:
            spec = read_json(file)
        except Exception:
            continue
        if isinstance(spec, dict):
            spec["_file"] = file.name
            specs.append(spec)
    specs.sort(key=lambda item: (min(item.get("src") or [10**9]), item.get("_file", "")))
    return specs


def page_sources(specs: list[dict]) -> dict[int, list[str]]:
    rows: dict[int, list[str]] = {}
    for spec in specs:
        for page in spec.get("src") or []:
            if isinstance(page, (int, float)):
                rows.setdefault(int(page), []).append(spec.get("_file", "?"))
    return rows


def spec_pages(spec: dict) -> set[int]:
    return {int(page) for page in (spec.get("src") or []) if isinstance(page, (int, float))}


def iter_blocks(spec: dict):
    for key in ("top", "col1", "col2", "bottom"):
        for index, block in enumerate(spec.get(key) or []):
            if isinstance(block, dict):
                yield f"{key}[{index}]", block


def iter_text_fields(spec: dict):
    """Yield (path, text) for every string value that is display text."""
    metadata = {
        "src", "kind", "type", "eyebrow", "h1", "h2", "h3", "h4", "perPage",
        "widths", "align", "class", "style", "height", "fullBleed", "noToc",
        "dense", "id", "portrait", "file", "name", "alt", "href", "download", "url",
    }

    def walk(value, path=""):
        if isinstance(value, dict):
            for key, item in value.items():
                if key in metadata:
                    continue
                yield from walk(item, f"{path}/{key}")
        elif isinstance(value, list):
            for index, item in enumerate(value):
                yield from walk(item, f"{path}[{index}]")
        elif isinstance(value, str):
            yield path, value

    yield from walk(spec)

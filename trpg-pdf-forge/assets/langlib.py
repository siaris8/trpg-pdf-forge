"""Language profiles and source-text normalization for German/Polish/English input."""
from __future__ import annotations

import re
import unicodedata

PROFILES = {
    "en": {
        "code": "en",
        "name": "English",
        "latin": True,
        "keywords": [
            "pregenerated characters", "ready-to-play", "sample characters",
            "quickstart characters", "characters", "cast", "npcs",
        ],
    },
    "de": {
        "code": "de",
        "name": "Deutsch",
        "latin": True,
        "keywords": [
            "vorgefertigte charaktere", "spielfertige charaktere",
            "schnellstart-charaktere", "beispielcharaktere", "charaktere",
            "besetzung", "nsc", "gegner",
        ],
    },
    "pl": {
        "code": "pl",
        "name": "Polski",
        "latin": True,
        "keywords": [
            "gotowe postacie", "postacie gotowe do gry", "postacie startowe",
            "przykładowe postacie", "szybki start", "bohaterowie", "postacie",
            "nsc", "przeciwnicy",
        ],
    },
    "zh-CN": {
        "code": "zh-CN",
        "name": "中文",
        "latin": False,
        "keywords": ["预设角色", "预设卡", "快速开始角色", "人物卡", "角色", "NPC"],
    },
}

GERMAN_REPLACEMENTS = {
    "\ufb01": "fi", "\ufb02": "fl", "\ufb00": "ff", "\ufb03": "ffi", "\ufb04": "ffl",
    "\u00ad": "", "\u200b": "", "\u200c": "", "\u200d": "",
}

POLISH_CHARS = "ąćęłńóśźżĄĆĘŁŃÓŚŹŻ"


def resolve(code: str | None) -> dict:
    value = (code or "en").strip().lower().replace("_", "-")
    if value.startswith("de"):
        return PROFILES["de"]
    if value.startswith("pl"):
        return PROFILES["pl"]
    if value.startswith("zh"):
        return PROFILES["zh-CN"]
    return PROFILES["en"]


def normalize_text(text: str, lang: str | None = "de") -> str:
    value = text or ""
    for old, new in GERMAN_REPLACEMENTS.items():
        value = value.replace(old, new)
    value = unicodedata.normalize("NFC", value)
    if resolve(lang)["latin"]:
        # Keep diacritics (ä ö ü ß / ą ć ę ł ń ó ś ź ż); only normalize line wraps.
        value = value.replace("\r\n", "\n").replace("\r", "\n")
        value = re.sub(r"(\w)-\n(\w)", r"\1\2", value)
    return value


def is_latin(lang: str | None) -> bool:
    return bool(resolve(lang).get("latin"))


def pregen_keywords(lang: str | None) -> list[str]:
    return list(resolve(lang).get("keywords") or [])


def special_chars(lang: str | None) -> str:
    code = resolve(lang)["code"]
    if code == "de":
        return "äöüßÄÖÜ"
    if code == "pl":
        return POLISH_CHARS
    return ""

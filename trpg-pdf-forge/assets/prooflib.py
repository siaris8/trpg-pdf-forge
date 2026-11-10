"""PROOF.json contract: digest, freshness and structural validation."""
from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

from pageio import load_specs, read_json

PROOF_SCHEMA_VERSION = 1
PROOF_CHECKS = [
    "omissions", "terms", "names", "numbers",
    "tables", "fluency", "placeholders", "layout",
]


def batch_pages(batch: dict) -> set[int]:
    start, end = batch.get("pages") or [1, 1]
    return set(range(int(start), int(end) + 1))


def batch_page_files(root, batch: dict) -> list[Path]:
    pages = batch_pages(batch)
    directory = Path(root) / "work" / "pages"
    files = []
    for file in sorted(directory.glob("*.json")):
        try:
            spec = read_json(file)
        except Exception:
            continue
        if any(int(page) in pages for page in spec.get("src") or [] if isinstance(page, (int, float))):
            files.append(file)
    return files


def page_digest(files: list[Path]) -> str:
    digest = hashlib.sha256()
    for file in sorted(files, key=lambda item: item.name):
        digest.update(file.name.encode("utf-8"))
        digest.update(b"\0")
        digest.update(file.read_bytes())
    return "sha256:" + digest.hexdigest()


def page_names(files: list[Path]) -> list[str]:
    return [file.name for file in files]


def proof_status(root, batch: dict, plan: dict | None = None) -> dict:
    files = batch_page_files(root, batch)
    target = Path(root) / "work" / "batches" / batch["id"] / "PROOF.json"
    digest = page_digest(files)
    result = {
        "exists": target.exists(),
        "ok": False,
        "stale": False,
        "digest": digest,
        "files": page_names(files),
        "errors": [],
        "reviewer": "",
        "reviewedAt": "",
        "checks": {},
    }
    if not files:
        result["errors"].append(f"批次 {batch['id']} 还没有页 JSON，无法校对")
        return result
    if not target.exists():
        result["errors"].append(f"缺少 {target.name}（先运行 proof.py init 并完成校对）")
        return result
    try:
        proof = json.loads(target.read_text(encoding="utf-8-sig"))
    except Exception as error:  # noqa: BLE001
        result["errors"].append(f"PROOF.json 不是有效 JSON：{error}")
        return result

    result["reviewer"] = str(proof.get("reviewer") or "")
    result["reviewedAt"] = str(proof.get("reviewedAt") or "")
    checks = proof.get("checks") if isinstance(proof.get("checks"), dict) else {}
    result["checks"] = {name: checks.get(name) is True for name in PROOF_CHECKS}
    if proof.get("batch") != batch["id"]:
        result["errors"].append(f"PROOF 批次不匹配：{proof.get('batch')} != {batch['id']}")
    if proof.get("sourcePages") != list(batch.get("pages") or []):
        result["errors"].append("PROOF.sourcePages 与批次范围不一致")
    if sorted(proof.get("files") or []) != sorted(page_names(files)):
        result["errors"].append("PROOF.files 与当前批次页 JSON 清单不一致")
    if proof.get("pageDigest") != digest:
        result["errors"].append("PROOF.pageDigest 已过期（页 JSON 被修改过）")
        result["stale"] = True
    if proof.get("ok") is not True:
        result["errors"].append("PROOF.ok 不是 true")
    for name in PROOF_CHECKS:
        if proof.get("checks", {}).get(name) is not True:
            result["errors"].append(f"PROOF 校对项未完成：{name}")
    if not result["reviewer"]:
        result["errors"].append("PROOF.reviewer 为空")
    if not result["reviewedAt"]:
        result["errors"].append("PROOF.reviewedAt 为空")
    issues = proof.get("issues")
    if isinstance(issues, list) and issues:
        result["errors"].append(f"PROOF.issues 仍有 {len(issues)} 条未解决")
    if result["reviewer"] == "translator":
        result["errors"].append("reviewer 不能是 translator；校对必须是独立第二遍")
    result["ok"] = not result["errors"]
    return result


def proof_template(batch: dict, files: list[Path], reviewer: str) -> dict:
    return {
        "schemaVersion": PROOF_SCHEMA_VERSION,
        "batch": batch["id"],
        "sourcePages": list(batch.get("pages") or []),
        "files": page_names(files),
        "pageDigest": page_digest(files),
        "reviewer": reviewer,
        "reviewedAt": datetime.now(timezone.utc).isoformat(),
        "ok": False,
        "checks": {name: False for name in PROOF_CHECKS},
        "issues": [],
        "fixed": [],
    }

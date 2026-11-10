"""Shared helpers for the batch pipeline (plan, build, check)."""
from __future__ import annotations

from pathlib import Path

from pageio import read_json, write_json
from prooflib import proof_status


def load_page_sources(pages_dir) -> dict[str, list[int]]:
    """Map page-JSON filename -> sorted distinct source pages."""
    result: dict[str, list[int]] = {}
    directory = Path(pages_dir)
    if not directory.exists():
        return result
    for file in sorted(directory.glob("*.json")):
        try:
            spec = read_json(file)
        except Exception:
            continue
        if not isinstance(spec, dict):
            continue
        values = sorted({
            int(number) for number in (spec.get("src") or [])
            if isinstance(number, (int, float)) and int(number) > 0
        })
        if values:
            result[file.name] = values
    return result


def batch_pages(batch) -> list[int]:
    start, end = batch.get("pages") or [1, 1]
    return list(range(int(start), int(end) + 1))


def compute_progress(plan, sources, root=None) -> dict:
    covered: set[int] = set()
    for values in sources.values():
        covered.update(values)
    total = int(plan.get("totalSourcePages") or (max(covered) if covered else 0))
    covered &= set(range(1, total + 1))

    checks: dict[str, bool] = {}
    proofs: dict[str, dict] = {}
    if root:
        for batch in plan.get("batches", []):
            check = Path(root) / "work" / "batches" / batch["id"] / "CHECK.json"
            if check.exists():
                try:
                    checks[batch["id"]] = bool(read_json(check).get("ok"))
                except Exception:
                    checks[batch["id"]] = False
            proofs[batch["id"]] = proof_status(root, batch)

    rows = []
    for batch in plan.get("batches", []):
        pages = batch_pages(batch)
        hit = [page for page in pages if page in covered]
        checked = bool(checks.get(batch["id"]))
        proof = proofs.get(batch["id"]) or {"ok": False, "stale": False, "reviewer": ""}
        proofed = bool(proof.get("ok"))
        status = "done" if len(hit) == len(pages) and checked else "partial" if hit else "pending"
        rows.append({
            "id": batch["id"],
            "title": batch.get("title", ""),
            "kind": batch.get("kind", "chapter"),
            "pages": [pages[0], pages[-1]],
            "total": len(pages),
            "covered": len(hit),
            "status": status,
            "checked": checked,
            "proofed": proofed,
            "proofStale": bool(proof.get("stale")),
            "reviewer": proof.get("reviewer") or "",
        })

    current = next((row for row in rows if row["status"] != "done"), None)
    missing = sorted(set(range(1, total + 1)) - covered)
    gaps: list[list[int]] = []
    for page in missing:
        if gaps and page == gaps[-1][1] + 1:
            gaps[-1][1] = page
        else:
            gaps.append([page, page])

    proofed = sum(1 for row in rows if row["proofed"])
    current_proof = current["id"] if current else None
    return {
        "version": 2,
        "total": total,
        "translated": len(covered),
        "proofed": proofed,
        "proofTotal": len(rows),
        "proofPercent": round(proofed / len(rows), 4) if rows else 0.0,
        "percent": round(len(covered) / total, 4) if total else 0.0,
        "current": current["id"] if current else None,
        "currentProof": current_proof,
        "batches": rows,
        "gaps": gaps[:80],
    }


def page_overlaps(batch, sources) -> bool:
    pages = set(batch_pages(batch))
    return any(pages & set(values) for values in sources.values())

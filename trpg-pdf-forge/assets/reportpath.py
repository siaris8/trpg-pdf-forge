#!/usr/bin/env python
"""Report-safe paths.

Every JSON report (*-qa.json, IMAGE-CHECK.json, manifest.json, BOOKMARKS.json,
LAYOUT.json ...) records the files it was built from. Writing an absolute path
there leaks the machine-local directory layout into each project, into the
shipped demo artifacts and into anything the user shares.

`display()` keeps reports portable: a POSIX-style path relative to the working
directory when the file lives under it, otherwise just the file name. Reports
therefore stay readable ("out/book.pdf", "assets/demo/source.en.pdf") without
ever exposing D:\\... or /home/... prefixes.
"""
from __future__ import annotations

import os
from pathlib import Path


def display(path: str | os.PathLike[str]) -> str:
    """Return a report-safe path for `path` (relative to CWD, else its name)."""
    candidate = Path(os.fspath(path))
    try:
        resolved = candidate.resolve()
        return resolved.relative_to(Path.cwd().resolve()).as_posix()
    except (OSError, ValueError):
        return candidate.name

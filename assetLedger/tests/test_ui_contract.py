#!/usr/bin/env python3
"""Static UI contract test: all referenced form controls exist exactly once."""
import re
from pathlib import Path

root = Path(__file__).resolve().parents[1]
html = (root / "static/page.php").read_text(encoding="utf-8")
js = (root / "static/page.js").read_text(encoding="utf-8")
css = (root / "static/page.css").read_text(encoding="utf-8")

ids = re.findall(r'\bid="([^"]+)"', html)
duplicates = sorted({x for x in ids if ids.count(x) > 1})
referenced = set(re.findall(r"\$\('([^']+)'\)", js))
missing = sorted(referenced - set(ids))
assert not duplicates, f"Duplicate HTML IDs: {duplicates}"
assert not missing, f"JavaScript references missing HTML elements: {missing}"
assert ">关联 Wallos 项<" not in html, "Redundant Wallos text field visible"
assert 'id="legacyWallosBox" hidden' in html, "Legacy Wallos notes must be conditional"
assert "$('legacyWallosBox').hidden=!r.wallosRef" in js, "Legacy Wallos notes must appear for prior records"
assert 'id="assetVaultUrl"' in html, "Missing Bitwarden deep link field"
assert "wallosId" in js and "wallosRef" in js, "Wallos subscription and legacy note must coexist"
assert "[hidden]{display:none!important}" in css, "Hidden attributes must override display styling"
print("UI CONTRACT TESTS PASSED")

#!/usr/bin/env python3
"""Build a Kodbox plugin install ZIP with the plugin folder at archive root.

Only runtime files are packaged. Tests and user-specific data are excluded.
Usage: python3 tools/package_plugin.py assetLedger dist/assetLedger-v1.0.0.zip
"""
import json
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
KNOWN_PLUGINS = {"assetLedger", "aiRagLite"}
ALLOWED_TOP_LEVEL = {"app.php", "package.json", "readme.md"}
ALLOWED_DIRS = {"lib", "static"}
FORBIDDEN_NAMES = {".env", ".env.local", "id_rsa", "id_ed25519"}


def build(plugin_name: str, output_path: Path) -> None:
    if plugin_name not in KNOWN_PLUGINS:
        raise ValueError(f"Unknown plugin: {plugin_name}")
    plugin_dir = ROOT / plugin_name
    manifest = json.loads((plugin_dir / "package.json").read_text(encoding="utf-8"))
    if manifest.get("id") != plugin_name:
        raise ValueError("Plugin directory and package.json ID differ")

    sources = []
    for path in sorted(plugin_dir.rglob("*")):
        if path.is_symlink():
            raise ValueError(f"Symlink forbidden in release: {path}")
        if not path.is_file():
            continue
        relative = path.relative_to(plugin_dir)
        parts = relative.parts
        if len(parts) == 1:
            included = relative.name in ALLOWED_TOP_LEVEL
        else:
            included = parts[0] in ALLOWED_DIRS and not any(p.startswith(".") for p in parts)
        if not included:
            continue
        if any(part in FORBIDDEN_NAMES for part in parts) or path.suffix.lower() in {".key", ".pem", ".p12", ".pfx"}:
            raise ValueError(f"Sensitive filename in release: {path}")
        sources.append((path, Path(plugin_name) / relative))

    required = {"app.php", "package.json"}
    if not required.issubset({a.parts[-1] for _, a in sources}):
        raise ValueError("Required plugin files missing")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(output_path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for source, archive_name in sources:
            archive.write(source, archive_name.as_posix())

    with zipfile.ZipFile(output_path) as archive:
        if archive.testzip() is not None:
            raise RuntimeError("ZIP integrity check failed")
    print(f"Built {output_path.name} with {len(sources)} runtime files for {plugin_name}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("Usage: package_plugin.py PLUGIN OUTPUT.zip")
    build(sys.argv[1], Path(sys.argv[2]).resolve())

#!/usr/bin/env python3
"""Validate a MyServers marketplace plugin release without external dependencies."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path


SEMVER = re.compile(r"^[0-9]+\.[0-9]+\.[0-9]+(?:[-+][0-9A-Za-z.-]+)?$")
SHA256 = re.compile(r"^sha256:[0-9a-f]{64}$")
PLUGIN_ID = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def fail(message: str) -> None:
    raise ValueError(message)


def load_json(path: Path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        fail(f"missing file: {path}")
    except json.JSONDecodeError as exc:
        fail(f"invalid JSON in {path}: {exc}")


def validate_demo_cards(cards, where: str) -> None:
    if cards is None:
        return
    if not isinstance(cards, list):
        fail(f"{where}.demo_cards must be an array")
    allowed_kinds = {"badge", "progress", "circular_progress", "value", "line", "bar", "area", "donut", "gauge"}
    for card_index, card in enumerate(cards):
        label = f"{where}.demo_cards[{card_index}]"
        if not isinstance(card, dict):
            fail(f"{label} must be an object")
        colors = card.get("background_colors")
        hero = card.get("hero")
        if not isinstance(colors, list) or not colors or not all(isinstance(v, str) for v in colors):
            fail(f"{label}.background_colors must be a non-empty string array")
        if not isinstance(hero, dict) or not isinstance(hero.get("icon"), str) or not isinstance(hero.get("title"), str):
            fail(f"{label}.hero requires string icon and title")
        for component_index, component in enumerate(card.get("components", [])):
            kind = component.get("kind") if isinstance(component, dict) else None
            if kind not in allowed_kinds:
                fail(f"{label}.components[{component_index}] has unsupported kind: {kind}")


def validate_release(repo: Path, entry: dict, requested_version: str | None) -> None:
    plugin_id = entry.get("id")
    version = requested_version or entry.get("latest_version")
    if not isinstance(plugin_id, str) or not PLUGIN_ID.fullmatch(plugin_id):
        fail(f"invalid plugin id: {plugin_id}")
    if not isinstance(version, str) or not SEMVER.fullmatch(version):
        fail(f"invalid version for {plugin_id}: {version}")

    expected_manifest = Path("plugins") / plugin_id / version / "manifest.json"
    manifest_path = repo / expected_manifest
    manifest = load_json(manifest_path)
    if manifest.get("id") != plugin_id:
        fail(f"manifest id mismatch in {manifest_path}")
    if manifest.get("version") != version:
        fail(f"manifest version mismatch in {manifest_path}")
    main_entry = manifest.get("entrypoints", {}).get("main")
    if main_entry != "main.js":
        fail(f"{manifest_path}: entrypoints.main must be main.js")

    assets = manifest.get("assets")
    if not isinstance(assets, list) or not any(asset.get("path") == "main.js" for asset in assets if isinstance(asset, dict)):
        fail(f"{manifest_path}: assets must include main.js")
    main_path = manifest_path.parent / "main.js"
    if not main_path.is_file():
        fail(f"missing main.js: {main_path}")

    checksums = manifest.get("checksums")
    expected_checksum = checksums.get("main.js") if isinstance(checksums, dict) else None
    if not isinstance(expected_checksum, str) or not SHA256.fullmatch(expected_checksum):
        fail(f"{manifest_path}: checksums.main.js must be sha256:<64 lowercase hex>")
    actual = "sha256:" + hashlib.sha256(main_path.read_bytes()).hexdigest()
    if actual != expected_checksum:
        fail(f"checksum mismatch for {main_path}: expected {expected_checksum}, actual {actual}")

    node = subprocess.run(["node", "--check", str(main_path)], capture_output=True, text=True)
    if node.returncode != 0:
        fail(f"JavaScript syntax error in {main_path}:\n{node.stderr.strip()}")
    validate_demo_cards(manifest.get("demo_cards"), str(manifest_path))

    if requested_version is None:
        expected_index_path = expected_manifest.as_posix()
        if entry.get("manifest_path") != expected_index_path:
            fail(f"index manifest_path for {plugin_id} must be {expected_index_path}")

    print(f"ok {plugin_id}@{version}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", default=".", help="myservers-plugins repository root")
    parser.add_argument("--plugin", help="validate only one plugin id")
    parser.add_argument("--version", help="validate a specific version directory")
    args = parser.parse_args()

    repo = Path(args.repo).expanduser().resolve()
    index_path = repo / "plugins" / "index.json"
    index = load_json(index_path)
    if not isinstance(index, list):
        fail(f"{index_path} must contain an array")

    entries = [entry for entry in index if isinstance(entry, dict)]
    ids = [entry.get("id") for entry in entries]
    if len(ids) != len(set(ids)):
        fail("plugins/index.json contains duplicate plugin ids")
    for entry in entries:
        for field in ("id", "name", "description", "icon", "latest_version", "manifest_path"):
            if not isinstance(entry.get(field), str) or not entry[field]:
                fail(f"index entry is missing string field {field}: {entry.get('id')}")
        validate_demo_cards(entry.get("demo_cards"), f"index[{entry.get('id')}]")

    if args.plugin:
        selected = [entry for entry in entries if entry.get("id") == args.plugin]
        if not selected:
            fail(f"plugin not found in index: {args.plugin}")
    else:
        selected = entries

    for entry in selected:
        validate_release(repo, entry, args.version)
    print(f"validated {len(selected)} plugin(s)")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (ValueError, OSError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        raise SystemExit(1)

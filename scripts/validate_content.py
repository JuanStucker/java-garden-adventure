#!/usr/bin/env python3
"""Validate Java Garden's static content without third-party dependencies."""

from __future__ import annotations

import json
import re
import sys
from collections import Counter
from pathlib import Path
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parents[1]
WORLD_PATH = ROOT / "data" / "worlds.json"
QUEST_PATH = ROOT / "data" / "quests.json"

VALID_ENERGY = {"low", "medium", "high"}
VALID_TYPES = {
    "discover",
    "guided",
    "make-it-yours",
    "solo",
    "teach",
    "boss",
}
ID_PATTERN = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*-v[0-9]+$")


def load_json(path: Path):
    try:
        with path.open(encoding="utf-8-sig") as handle:
            return json.load(handle)
    except (OSError, json.JSONDecodeError) as error:
        raise ValueError(f"{path.relative_to(ROOT)} could not be read: {error}") from error


def duplicates(values):
    return sorted(value for value, count in Counter(values).items() if count > 1)


def valid_https_url(value):
    if not isinstance(value, str):
        return False
    parsed = urlparse(value)
    return parsed.scheme == "https" and bool(parsed.netloc)


def validate():
    problems = []
    worlds = load_json(WORLD_PATH)
    quests = load_json(QUEST_PATH)

    if not isinstance(worlds, list) or not worlds:
        return ["data/worlds.json must contain a non-empty list."]
    if not isinstance(quests, list) or not quests:
        return ["data/quests.json must contain a non-empty list."]

    world_ids = [world.get("id") for world in worlds if isinstance(world, dict)]
    quest_ids = [quest.get("id") for quest in quests if isinstance(quest, dict)]
    world_id_set = set(world_ids)
    quest_id_set = set(quest_ids)

    for duplicate in duplicates(world_ids):
        problems.append(f"Duplicate world ID: {duplicate}")
    for duplicate in duplicates(quest_ids):
        problems.append(f"Duplicate quest ID: {duplicate}")

    world_orders = []
    for index, world in enumerate(worlds):
        label = world.get("id", f"world at index {index}")
        required = ("id", "order", "name", "officialTopic", "description", "accent", "symbol", "sourceUrl")
        for field in required:
            if field not in world or world[field] in ("", None):
                problems.append(f"{label}: missing {field}")
        if not isinstance(world.get("order"), int) or world.get("order", 0) < 1:
            problems.append(f"{label}: order must be a positive integer")
        else:
            world_orders.append(world["order"])
        if not valid_https_url(world.get("sourceUrl")):
            problems.append(f"{label}: sourceUrl must be an HTTPS URL")

    for duplicate in duplicates(world_orders):
        problems.append(f"Duplicate world order: {duplicate}")

    orders_by_world = {}
    for index, quest in enumerate(quests):
        label = quest.get("id", f"quest at index {index}")
        required = (
            "id",
            "worldId",
            "order",
            "topic",
            "title",
            "type",
            "energy",
            "difficulty",
            "estimatedMinutes",
            "xp",
            "prerequisites",
            "description",
            "instructions",
            "evidenceChecks",
            "minEvidence",
            "hints",
            "mascotMessage",
            "sourceUrl",
        )
        for field in required:
            if field not in quest or quest[field] in ("", None):
                problems.append(f"{label}: missing {field}")

        quest_id = quest.get("id")
        if not isinstance(quest_id, str) or not ID_PATTERN.fullmatch(quest_id):
            problems.append(f"{label}: ID must be lowercase, descriptive, and end in -v<number>")
        if quest.get("worldId") not in world_id_set:
            problems.append(f"{label}: references missing world {quest.get('worldId')}")
        if quest.get("energy") not in VALID_ENERGY:
            problems.append(f"{label}: invalid energy {quest.get('energy')}")
        if quest.get("type") not in VALID_TYPES:
            problems.append(f"{label}: invalid type {quest.get('type')}")
        if quest.get("difficulty") not in {1, 2, 3}:
            problems.append(f"{label}: difficulty must be 1, 2, or 3")
        if not isinstance(quest.get("estimatedMinutes"), int) or quest.get("estimatedMinutes", 0) < 1:
            problems.append(f"{label}: estimatedMinutes must be a positive integer")
        if not isinstance(quest.get("xp"), int) or quest.get("xp", 0) < 1:
            problems.append(f"{label}: xp must be a positive integer")
        if not isinstance(quest.get("order"), int) or quest.get("order", 0) < 1:
            problems.append(f"{label}: order must be a positive integer")
        else:
            orders_by_world.setdefault(quest.get("worldId"), []).append(quest["order"])

        prerequisites = quest.get("prerequisites")
        if not isinstance(prerequisites, list):
            problems.append(f"{label}: prerequisites must be a list")
            prerequisites = []
        for prerequisite in prerequisites:
            if prerequisite not in quest_id_set:
                problems.append(f"{label}: missing prerequisite {prerequisite}")
            if prerequisite == quest_id:
                problems.append(f"{label}: cannot require itself")

        instructions = quest.get("instructions")
        evidence = quest.get("evidenceChecks")
        hints = quest.get("hints")
        if not isinstance(instructions, list) or not instructions:
            problems.append(f"{label}: instructions must be a non-empty list")
        if not isinstance(evidence, list) or not evidence:
            problems.append(f"{label}: evidenceChecks must be a non-empty list")
            evidence = []
        if not isinstance(hints, list) or not (1 <= len(hints) <= 4):
            problems.append(f"{label}: hints must contain between one and four items")

        minimum = quest.get("minEvidence")
        if not isinstance(minimum, int) or minimum < 1 or minimum > len(evidence):
            problems.append(f"{label}: minEvidence must fit the evidenceChecks list")
        if not valid_https_url(quest.get("sourceUrl")):
            problems.append(f"{label}: sourceUrl must be an HTTPS URL")

    for world_id, orders in orders_by_world.items():
        for duplicate in duplicates(orders):
            problems.append(f"{world_id}: duplicate quest order {duplicate}")

    quest_map = {quest.get("id"): quest for quest in quests}
    visiting = set()
    visited = set()

    def visit(quest_id, path):
        if quest_id in visiting:
            cycle = " -> ".join((*path, quest_id))
            problems.append(f"Circular prerequisite: {cycle}")
            return
        if quest_id in visited:
            return
        visiting.add(quest_id)
        quest = quest_map.get(quest_id, {})
        for prerequisite in quest.get("prerequisites", []):
            if prerequisite in quest_map:
                visit(prerequisite, (*path, quest_id))
        visiting.remove(quest_id)
        visited.add(quest_id)

    for quest_id in quest_id_set:
        visit(quest_id, ())

    expected_local_files = [
        "index.html",
        "css/styles.css",
        "js/storage.js",
        "js/recommendations.js",
        "js/app.js",
        "assets/momo.svg",
        "assets/garden.svg",
    ]
    for relative_path in expected_local_files:
        if not (ROOT / relative_path).is_file():
            problems.append(f"Missing application file: {relative_path}")

    return problems


def main():
    try:
        problems = validate()
    except ValueError as error:
        print(f"Content validation failed:\n- {error}", file=sys.stderr)
        return 1

    if problems:
        print("Content validation failed:", file=sys.stderr)
        for problem in problems:
            print(f"- {problem}", file=sys.stderr)
        return 1

    worlds = load_json(WORLD_PATH)
    quests = load_json(QUEST_PATH)
    print(f"Content valid: {len(worlds)} worlds, {len(quests)} quests, no dependency cycles.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

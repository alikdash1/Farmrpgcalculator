#!/usr/bin/env python3
"""Rebuild data/personal-tower.js from a Farm RPG Mastery History export.

The CSV has one column per capture, newest last, and names carry the Tower
floor: "Salt 294", "Water Lily 300", "Leather Belt 304/335". Those suffixes are
three digits, while a genuine part of a name is two ("Bone 02", "Runestone 27",
"Ram Skull 01"), which is what tells them apart.

    python3 tools/build-personal-tower.py "Farm RPG Mastery History (2).csv"
    python3 tools/build-personal-tower.py <csv> "9/6/2026 5:31:24 PM"

With no column named, the last one wins. Values are capped at 1,000,000: the
export keeps counting past a Mega Mastery and the planner only cares that it is
finished.
"""

import csv
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MEGA = 1000000

# " 294" and " 304/335" are floors. " 02" is part of the name.
FLOOR = re.compile(r"\s+\d{3}(?:\s*/\s*\d{3})*\s*$")


def clean(name):
    return FLOOR.sub("", (name or "").strip()).strip()


def main(path, column=None):
    with open(path, encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.reader(handle))
    header = rows[0]
    captures = header[2:]
    if column is None:
        column = captures[-1]
    if column not in captures:
        sys.exit("column %r not in the file. Available: %s" % (column, captures))
    index = 2 + captures.index(column)

    masteries = {}
    skipped = 0
    for row in rows[1:]:
        if len(row) <= index or not row[1].strip():
            continue
        name = clean(row[1])
        raw = row[index].strip()
        if not raw:
            skipped += 1
            continue
        try:
            value = int(float(raw))
        except ValueError:
            skipped += 1
            continue
        # A later row for the same cleaned name should not walk it backwards.
        masteries[name] = min(MEGA, max(value, masteries.get(name, 0)))

    out_path = os.path.join(ROOT, "data", "personal-tower.js")
    with open(out_path, encoding="utf8") as handle:
        text = handle.read()
    previous = json.loads(text[text.index("{"): text.rindex("}") + 1])

    payload = dict(previous)
    payload["source"] = os.path.basename(path)
    payload["sourceColumn"] = column
    payload["capturedAt"] = _iso(column)
    payload["masteries"] = dict(sorted(masteries.items(), key=lambda kv: -kv[1]))

    with open(out_path, "w", encoding="utf8", newline="\n") as handle:
        handle.write("window.FRPG_PERSONAL_TOWER = " + json.dumps(payload, indent=2) + ";\n")

    grew = sum(1 for k, v in masteries.items() if v > previous["masteries"].get(k, 0))
    added = sum(1 for k in masteries if k not in previous["masteries"])
    print(
        "wrote data/personal-tower.js from column %s: %d masteries (%d moved, %d new, %d blank cells skipped)"
        % (column, len(masteries), grew, added, skipped)
    )


def _iso(column):
    # "9/6/2026 5:31:24 PM" -> "2026-09-06T17:31:24"
    match = re.match(r"(\d+)/(\d+)/(\d{4})\s+(\d+):(\d+):(\d+)\s*(AM|PM)?", column.strip())
    if not match:
        return column
    month, day, year, hour, minute, second, meridiem = match.groups()
    hour = int(hour)
    if meridiem == "PM" and hour != 12:
        hour += 12
    if meridiem == "AM" and hour == 12:
        hour = 0
    return "%s-%02d-%02dT%02d:%s:%s" % (year, int(month), int(day), hour, minute, second)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit("usage: build-personal-tower.py <csv> [column]")
    main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None)

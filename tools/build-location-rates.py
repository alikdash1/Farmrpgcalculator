#!/usr/bin/env python3
"""Build data/location-rates.js from raw/drop_rates.json.

tools/build-data.mjs already turns that file's drop_rates and manual_fish_rates
into data/data.js, but it drops iron_depot_rates on the floor. Those are the
same community logs re-counted with Iron and Nails removed from the drop table,
which is what happens when a player owns Iron Depot — every other item lands
more often. The Places page uses them when Setup says the player has it.

This writes a small separate file rather than touching data/data.js, because
data/data.js is no longer purely generated: it carries hand-added values
(mushroom_mastery_bonus, the Glass Bottle route rule) that re-running
build-data.mjs would silently delete.

    python3 tools/build-location-rates.py
"""

import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def main():
    with open(os.path.join(ROOT, "raw", "drop_rates.json"), encoding="utf-8-sig") as handle:
        records = json.load(handle)

    iron = {}
    for record in records:
        table = record.get("iron_depot_rates") or {}
        rates = {
            name: value
            for name, value in sorted(table.items())
            if isinstance(value, (int, float)) and value > 0
        }
        if rates:
            iron[record["location"]] = rates

    payload = {
        "schema": "farmrpg-location-rates-v1",
        "note": (
            "Iron Depot fills Iron and Nails with silver, so they stop taking up drop slots "
            "and everything else at that location lands more often. These are the same "
            "community logs as the explores-per-drop denominators in data/data.js, "
            "re-counted with Iron and Nails removed. Same unit: explores per drop."
        ),
        "unit": "explores per drop",
        "source": "raw/drop_rates.json iron_depot_rates",
        "ironDepot": iron,
    }

    header = (
        "// Alternate drop denominators for players who own Iron Depot.\n"
        "// Generated from raw/drop_rates.json - see tools/build-location-rates.py.\n"
    )
    body = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    out = os.path.join(ROOT, "data", "location-rates.js")
    with open(out, "w", encoding="utf-8", newline="\n") as handle:
        handle.write(header + "window.FRPG_LOCATION_RATES = " + body + ";\n")

    print("wrote data/location-rates.js: %d locations" % len(iron))


if __name__ == "__main__":
    main()

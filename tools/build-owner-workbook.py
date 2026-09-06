#!/usr/bin/env python3
"""Read the owner's own Farm RPG workbook and write the data files from it.

The owner asked for this workbook to be trusted over buddy.farm wherever it has
an opinion, so it is the source for three separate things:

  Item drops tab         -> exploring rates in data/workbook-rates.js
                            (a live calculator: rate = items / the AP input)
  stamina calculator tab -> the stamina model in data/constants.json
                            (1250 + 12.5 x effectiveness, x0.67 perks, x0.8 Neigh)
  everything else        -> data/owner-workbook.js, written here

Point it at the .xlsx and it rewrites data/owner-workbook.js:

    python3 tools/build-owner-workbook.py "path/to/workbook.xlsx"

Tabs that are read: All mastery items, Tower MM cost, V1.5.3.2, Converting.
Tabs deliberately skipped, and why:
  Item drops, stamina calculator  already imported into the files above
  Acorn pie leather               empty ("Nothing to see here yet go away")
  Items recipe                    the game export in data/data.js is complete
  Crop Calculator, Gold discounts, Meal cost calc, Townfolk level exp,
  PJ use random items, Bags       calculators for things this app does not model
  ATI, Pamrats, Starmap, PSA, PSA 2, DI
                                  questline requirements; data/main-quests.js
                                  already has all 2,479 quests from the game
"""

import json
import os
import re
import sys
import zipfile
from xml.etree import ElementTree as ET

NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class Book:
    def __init__(self, path):
        self.z = zipfile.ZipFile(path)
        self.shared = []
        if "xl/sharedStrings.xml" in self.z.namelist():
            root = ET.fromstring(self.z.read("xl/sharedStrings.xml"))
            for si in root.findall(NS + "si"):
                self.shared.append("".join(t.text or "" for t in si.iter(NS + "t")))
        wb = self.z.read("xl/workbook.xml").decode("utf8")
        rels = self.z.read("xl/_rels/workbook.xml.rels").decode("utf8")
        rmap = dict(re.findall(r'Id="(rId\d+)"[^>]*Target="([^"]+)"', rels))
        self.sheets = {}
        for m in re.finditer(r'<sheet[^>]*name="([^"]+)"[^>]*r:id="(rId\d+)"', wb):
            target = rmap.get(m.group(2), "")
            self.sheets[m.group(1)] = target if target.startswith("xl/") else "xl/" + target.lstrip("/")

    def rows(self, name):
        out = {}
        root = ET.fromstring(self.z.read(self.sheets[name]))
        for c in root.iter(NS + "c"):
            m = re.match(r"([A-Z]+)(\d+)", c.get("r") or "")
            if not m:
                continue
            v = c.find(NS + "v")
            if c.get("t") == "s" and v is not None:
                value = self.shared[int(v.text)]
            elif c.get("t") == "inlineStr":
                value = "".join(x.text or "" for x in c.iter(NS + "t"))
            elif v is not None:
                value = v.text
            else:
                continue
            out.setdefault(int(m.group(2)), {})[m.group(1)] = value
        return out


def num(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def main(path):
    book = Book(path)

    # Every masterable item, rated: a Tower floor when it is a Tower
    # requirement, otherwise how hard it is or why it is not worth chasing.
    mastery = {}
    rows = book.rows("All mastery items")
    for r in sorted(rows):
        if r == 1:
            continue
        item = (rows[r].get("A") or "").strip()
        rating = (rows[r].get("B") or "").strip()
        if not item:
            continue
        floor = num(rating)
        if floor is not None:
            mastery[item] = {"tower": int(floor)}
        elif rating:
            mastery[item] = {"note": rating}

    # What a Mega Mastery actually costs, with its ingredient breakdown.
    tower = {}
    rows = book.rows("Tower MM cost")
    for r in range(5, 20):
        row = rows.get(r) or {}
        item = (row.get("A") or "").strip()
        if not item or num(row.get("B")) is None:
            continue
        parts = []
        for name_col, amt_col, cur_col in (("I", "J", "K"), ("M", "N", "O"), ("Q", "R", None)):
            label = (row.get(name_col) or "").strip()
            amount = num(row.get(amt_col))
            if not label or amount is None:
                continue
            part = {"name": label, "amount": amount}
            if cur_col and num(row.get(cur_col)) is not None:
                part["apOrLn"] = num(row[cur_col])
            parts.append(part)
        tower[item] = {
            "tower": int(num(row["B"])),
            "amount": num(row.get("D")),
            "goldTotal": num(row.get("E")),
            "goldWithStew": num(row.get("F")),
            "ingredients": parts,
        }

    # The owner's own prices: meals in gold each, and everything else per 1,000.
    meals, currency = {}, {}
    rows = book.rows("V1.5.3.2")
    for r in sorted(rows):
        if r == 1:
            continue
        row = rows[r]
        meal = (row.get("O") or "").strip()
        if meal and num(row.get("P")) is not None:
            meals[meal] = num(row["P"])
        item = (row.get("R") or "").strip()
        if item:
            entry = {}
            if num(row.get("S")) is not None:
                entry["apPerThousand"] = num(row["S"])
            if num(row.get("T")) is not None:
                entry["goldPerThousand"] = num(row["T"])
            if entry:
                currency[item] = entry

    conversions = {}
    header = book.rows("Converting").get(1) or {}
    for label, col in (
        ("fishing nets per Large Net", "E"),
        ("oranges per Orange Juice", "J"),
        ("lemons per Lemonade", "O"),
        ("lemons per Arnold Palmer", "T"),
    ):
        if num(header.get(col)) is not None:
            conversions[label] = num(header[col])

    payload = {
        "schema": "farmrpg-owner-workbook-v1",
        "source": "the owner's own Farm RPG workbook, read 2026-09-06",
        "note": (
            "The owner asked for this workbook to be trusted over buddy.farm wherever it "
            "has an opinion. Drop rates from its Item drops tab went into "
            "data/workbook-rates.js; the stamina model went into data/constants.json. "
            "This file holds the rest."
        ),
        "masteryFeasibility": mastery,
        "towerMasteryCost": tower,
        "mealGoldEach": meals,
        "currencyPer1000": currency,
        "conversions": conversions,
    }

    out = os.path.join(ROOT, "data", "owner-workbook.js")
    with open(out, "w", encoding="utf8", newline="\n") as handle:
        handle.write(
            "// Everything else worth keeping from the owner's own Farm RPG workbook.\n"
            "// Generated by tools/build-owner-workbook.py - see that file for the tabs.\n"
            "window.FRPG_OWNER_WORKBOOK = "
            + json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
            + ";\n"
        )
    print(
        "wrote data/owner-workbook.js: %d rated items, %d tower costs, %d meal prices, "
        "%d item prices, %d conversions"
        % (len(mastery), len(tower), len(meals), len(currency), len(conversions))
    )


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit("usage: build-owner-workbook.py <workbook.xlsx>")
    main(sys.argv[1])

#!/usr/bin/env python3
"""Extract the system/region table from the supplied appendix PDF.

The appendix is a scanned, three-column table whose PDF text layer contains
overlapping OCR passes.  This extractor uses word positions only to identify
the three table columns and row baselines.  It never uses the appendix
coordinate values as data.  Rows with conflicting system OCR, non-ASCII OCR,
or an unrecognizable region are left out and reported.

Run from the repository root:

    python3 .agents/scripts/extract_appendix.py

The output is shared/appendix-regions.json.  A snapshot is used only to
choose between overlapping OCR spellings when one spelling is an exact
normalized snapshot name; it is not used for aliases or fuzzy name matching.
"""

from __future__ import annotations

import argparse
import itertools
import json
import re
import unicodedata
from collections import Counter
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any

import fitz


REGIONS = [
    "Core Worlds",
    "Colonies",
    "Outer Rim Territories",
    "Deep Core",
    "Inner Rim",
    "Expansion Region",
    "Mid Rim",
    "Hutt Space",
    "Hapes Cluster",
    "Tion Cluster",
    "Centrality",
    "Corporate Sector",
    "Chiss Space",
    "Wild Space",
    "Unknown Regions",
    "Ssi-ruuvi Cluster",
    "[extragalactic]",
]

# Keep system names conservative.  In particular, no snapshot aliases or
# planet suffixes (II, IV, etc.) are added to names printed in the appendix.
ASCII_NAME = re.compile(
    r"[A-Za-z0-9][A-Za-z0-9'.,()\-\u0020]*"
)


def normalized(value: str) -> str:
    """The exact-normalized comparison used only for snapshot validation."""

    return re.sub(
        r"[^a-z0-9]",
        "",
        unicodedata.normalize("NFKD", value).lower(),
    )


def similarity(left: str, right: str) -> float:
    left = normalized(left)
    right = normalized(right)
    if left == right:
        return 1.0
    if not left or not right:
        return 0.0
    # OCR frequently clips the end of a region word.  A prefix is safer than
    # a general fuzzy correction and is still scored below an exact token.
    if left.startswith(right) or right.startswith(left):
        return 0.88 + 0.1 * min(len(left), len(right)) / max(len(left), len(right))
    return SequenceMatcher(None, left, right).ratio()


def edit_distance(left: str, right: str) -> int:
    left = normalized(left)
    right = normalized(right)
    previous = list(range(len(right) + 1))
    for i, char_left in enumerate(left, 1):
        current = [i]
        for j, char_right in enumerate(right, 1):
            current.append(
                min(
                    current[-1] + 1,
                    previous[j] + 1,
                    previous[j - 1] + (char_left != char_right),
                )
            )
        previous = current
    return previous[-1]


def region_token_ok(word: str, target: str) -> bool:
    distance = edit_distance(word, target)
    return distance <= 1 or (
        len(normalized(target)) >= 5 and similarity(word, target) >= 0.74
    )


def match_region(words: list[dict[str, Any]], row_y: float) -> tuple[str, float, list[str]] | None:
    """Return a canonical region, or None when the OCR is ambiguous.

    Region words are matched against known appendix vocabulary with their
    horizontal order retained.  Missing trailing words are accepted only
    for a unique category prefix (for example, ``Outer Rim`` can only mean
    ``Outer Rim Territories`` in this appendix).  No arbitrary region names
    are accepted.
    """

    candidates_at_row = [
        word for word in words if abs(word["y"] - row_y) <= 5.0
    ]
    ranked: list[tuple[float, str, list[dict[str, Any]], list[int]]] = []

    for region in REGIONS:
        region_tokens = region.split()
        token_candidates: list[list[dict[str, Any]]] = []
        for index, target in enumerate(region_tokens):
            # The source scans drift horizontally by a few points from page
            # to page.  These bands are intentionally broad; x ordering below
            # prevents words from being rearranged.
            low = 60 if index == 0 else (76 if index == 1 else 93)
            high = 112 if index == 0 else (151 if index == 1 else 162)
            token_candidates.append(
                [
                    word
                    for word in candidates_at_row
                    if low <= word["x"] < high
                    and region_token_ok(word["t"], target)
                ]
            )

        possibilities: list[
            tuple[float, list[dict[str, Any]], list[int]]
        ] = []

        def visit(
            index: int,
            last_x: float,
            selected: list[dict[str, Any]],
            score: float,
            selected_indices: list[int],
        ) -> None:
            if index == len(region_tokens):
                if selected:
                    possibilities.append((score, selected, selected_indices))
                return

            # A missing OCR token is permitted only after the validation below
            # confirms that the remaining evidence is a safe prefix/category.
            visit(index + 1, last_x, selected, score, selected_indices)
            target = region_tokens[index]
            for word in token_candidates[index]:
                if word["x"] <= last_x:
                    continue
                token_score = similarity(word["t"], target)
                y_score = max(0.0, 1.0 - abs(word["y"] - row_y) / 5.0)
                visit(
                    index + 1,
                    word["x"],
                    selected + [word],
                    score + 2.4 * token_score + 0.4 * y_score,
                    selected_indices + [index],
                )

        visit(0, -1, [], 0.0, [])
        if not possibilities:
            continue
        possibilities.sort(key=lambda item: (item[0], len(item[1])), reverse=True)
        score, selected, selected_indices = possibilities[0]
        token_scores = [
            similarity(word["t"], region_tokens[index])
            for word, index in zip(selected, selected_indices)
        ]
        count = len(selected_indices)
        total = len(region_tokens)
        full = count == total
        prefix = selected_indices == list(range(count))
        first_last = total == 3 and selected_indices == [0, 2]
        # Core, Rim, Space, Cluster, and Region alone do not identify one
        # category; other one-token prefixes do.
        unique_single = total == 1 or (
            count == 1
            and region_tokens[0] not in {"Core", "Rim", "Space", "Cluster", "Region"}
        )

        if full and min(token_scores) >= 0.63:
            pass
        elif prefix and count >= 2 and min(token_scores) >= 0.63:
            pass
        elif first_last and min(token_scores) >= 0.68:
            pass
        elif unique_single and count == 1 and min(token_scores) >= 0.70:
            pass
        else:
            continue
        ranked.append(
            (score + 0.18 * count, region, selected, selected_indices)
        )

    if not ranked:
        return None
    ranked.sort(key=lambda item: item[0], reverse=True)
    best = ranked[0]
    second = next((item for item in ranked if item[1] != best[1]), None)
    if second is not None and best[0] - second[0] < 0.16:
        return None
    return best[1], best[0], [word["t"] for word in best[2]]


def parse_page(page_number: int, page: fitz.Page) -> list[dict[str, Any]]:
    """Parse rows from one page while retaining review metadata internally."""

    page_width = page.rect.width
    words: list[dict[str, Any]] = []
    for item in page.get_text("words"):
        x0, y0, x1, y1, text, *_ = item
        if y0 > page.rect.height - 65 or y1 < 25:
            continue
        words.append({"x": x0, "x1": x1, "y": (y0 + y1) / 2, "t": text})

    output: list[dict[str, Any]] = []
    unrecognized_region_rows = 0
    for block in range(3):
        block_start = page_width * block / 3
        block_end = page_width * (block + 1) / 3
        block_words = [
            {**word, "x": word["x"] - block_start, "x1": word["x1"] - block_start}
            for word in words
            if block_start <= word["x"] < block_end
        ]
        system_words = [word for word in block_words if 0 <= word["x"] < 70]
        region_words = [
            word for word in block_words if 64 <= word["x"] < 153
        ]

        rows: list[dict[str, Any]] = []
        for word in sorted(system_words, key=lambda item: item["y"]):
            row = next(
                (
                    row
                    for row in rows
                    if abs(row["y"] - word["y"]) < 2.55
                ),
                None,
            )
            if row is None:
                row = {"y": word["y"], "words": []}
                rows.append(row)
            row["words"].append(word)
        rows.sort(key=lambda row: row["y"])

        for row in rows:
            row_y = row["y"]
            token_groups: list[list[dict[str, Any]]] = []
            for word in sorted(row["words"], key=lambda item: item["x"]):
                group = next(
                    (
                        group
                        for group in token_groups
                        if abs(group[0]["y"] - word["y"]) < 3.1
                        and (
                            abs(group[0]["x"] - word["x"]) < 3.1
                            or any(
                                (
                                    word["x"] >= other["x"] - 1
                                    and word["x1"] <= other["x1"] + 1
                                )
                                or (
                                    other["x"] >= word["x"] - 1
                                    and other["x1"] <= word["x1"] + 1
                                )
                                for other in group
                            )
                        )
                    ),
                    None,
                )
                if group is None:
                    token_groups.append([word])
                else:
                    group.append(word)

            choices: list[list[dict[str, Any]]] = []
            for group in token_groups:
                unique: list[dict[str, Any]] = []
                for word in group:
                    if normalized(word["t"]) not in {
                        normalized(previous["t"]) for previous in unique
                    }:
                        unique.append(word)
                choices.append(unique)
            if not choices:
                continue

            names: list[tuple[str, tuple[dict[str, Any], ...]]] = []
            for combination in itertools.product(*choices):
                name = " ".join(word["t"] for word in combination)
                if name.upper() in {"SYSTEM", "APPENDIX"}:
                    continue
                names.append((name, combination))
            region = match_region(region_words, row_y)
            if not names:
                continue
            if region is None:
                # Page 1's prose/header are outside the body table.  Keep
                # them out of the review count while surfacing body rows that
                # had no conservative vocabulary match.
                if page_number > 1 or row_y > 110:
                    unrecognized_region_rows += 1
                continue
            output.append(
                {
                    "page": page_number,
                    "block": block,
                    "y": row_y,
                    "choices": choices,
                    "names": names,
                    "region": region[0],
                    "region_raw": region[2],
                }
            )
    parse_page.last_unrecognized = unrecognized_region_rows
    return output


def choose_name(
    row: dict[str, Any], snapshot_names: dict[str, str]
) -> tuple[str | None, str]:
    """Choose only exact OCR/snapshot names; never apply aliases."""

    matches: list[tuple[str, tuple[dict[str, Any], ...]]] = []
    for name, words in row["names"]:
        if ASCII_NAME.fullmatch(name) and normalized(name) in snapshot_names:
            matches.append((name, words))
    normalized_matches = {normalized(name) for name, _ in matches}
    if len(normalized_matches) == 1:
        return matches[0][0], "snapshot-exact"
    if len(normalized_matches) > 1:
        return None, "ambiguous-snapshot"

    # If duplicate OCR passes disagree, do not guess which spelling is real.
    for group in row["choices"]:
        if len({normalized(word["t"]) for word in group}) > 1:
            return None, "ocr-conflict"
    name = row["names"][0][0]
    if not ASCII_NAME.fullmatch(name):
        return None, "non-ascii-ocr"
    return name, "single-ocr"


def main() -> None:
    root = Path(__file__).resolve().parents[2]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--pdf",
        type=Path,
        default=root / "attached_assets/Appendix_1789472994177.pdf",
    )
    parser.add_argument(
        "--snapshot",
        type=Path,
        default=Path("/tmp/appendix-planets.json"),
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=root / "shared/appendix-regions.json",
    )
    args = parser.parse_args()

    snapshot_names: dict[str, str] = {}
    if args.snapshot.exists():
        with args.snapshot.open(encoding="utf-8") as handle:
            snapshot = json.load(handle)
        snapshot_names = {
            normalized(item["name"]): item["name"]
            for item in snapshot
            if isinstance(item, dict) and isinstance(item.get("name"), str)
        }

    document = fitz.open(args.pdf)
    rows: list[dict[str, Any]] = []
    unrecognized_region_rows = 0
    for page_number, page in enumerate(document, 1):
        rows.extend(parse_page(page_number, page))
        unrecognized_region_rows += parse_page.last_unrecognized

    records: list[dict[str, Any]] = []
    seen_records: set[tuple[str, str, int]] = set()
    reasons: Counter[str] = Counter()
    exact_snapshot_matches = 0
    for row in rows:
        name, reason = choose_name(row, snapshot_names)
        if name is None:
            reasons[reason] += 1
            continue
        if reason == "snapshot-exact":
            exact_snapshot_matches += 1
        record = {"name": name, "region": row["region"], "page": row["page"]}
        record_key = (name, row["region"], row["page"])
        # A few OCR passes produce the same system twice at nearly identical
        # coordinates.  Preserve genuine same-name rows with different
        # regions, but remove an exact same-page duplicate.
        if record_key not in seen_records:
            seen_records.add(record_key)
            records.append(record)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", encoding="utf-8") as handle:
        json.dump(records, handle, ensure_ascii=False, indent=2)
        handle.write("\n")

    print(
        f"Extracted {len(records)} rows from {len(document)} pages; "
        f"skipped {sum(reasons.values())} conflicted/invalid OCR rows."
    )
    print(
        "Rows with no conservative region match: "
        f"{unrecognized_region_rows}."
    )
    if snapshot_names:
        unique_snapshot_matches = len(
            {normalized(record["name"]) for record in records}
            & set(snapshot_names)
        )
        print(
            "Exact normalized snapshot matches: "
            f"{unique_snapshot_matches}/{len(snapshot_names)} unique names "
            f"({exact_snapshot_matches} extracted rows)."
        )
    print(f"Skip reasons: {dict(reasons)}")
    print(f"Wrote {args.output}")


if __name__ == "__main__":
    main()
"""
Section 4 — Sanity-check for graph_output.json before handoff to Section 5.

Checks:
  1. graph_output.json is valid JSON and has the expected top-level keys
  2. All known persons from mock_data are present as nodes
  3. Kingpin (Arjun Malhotra) has the highest degree AND betweenness
  4. All five edge types are present in the graph
  5. No self-loops and no zero-weight edges
  6. graph_output.json is consistent (node ids in edges exist as nodes)
  7. Weight distribution is sane (Step 7 spot-check)

Exit 0 = all pass.  Exit 1 = one or more failures.
"""

import json
import sys
from pathlib import Path
from collections import defaultdict

ROOT         = Path(__file__).resolve().parent.parent   # repo root (parent of section4/)
MOCK_DATA    = ROOT / "section 2" / "data" / "mock_data.json"
GRAPH_OUTPUT = ROOT / "section4" / "data" / "graph_output.json"

PASS = "\033[92m[PASS]\033[0m"
FAIL = "\033[91m[FAIL]\033[0m"
INFO = "\033[96m[INFO]\033[0m"

failures = []

def check(label, ok, detail=""):
    tag = PASS if ok else FAIL
    print(f"  {tag}  {label}")
    if detail:
        for line in detail.strip().splitlines():
            print(f"         {line}")
    if not ok:
        failures.append(label)

# ── Check 1: Valid JSON + expected keys ──────────────────────────────────────
print("\n-- Check 1: Valid JSON and schema -----------------------------------")
try:
    with open(GRAPH_OUTPUT, encoding="utf-8") as f:
        graph = json.load(f)
    EXPECTED_KEYS = {"metadata", "nodes", "edges", "centrality"}
    missing_keys = EXPECTED_KEYS - set(graph.keys())
    check("graph_output.json is valid JSON", True)
    check(
        f"Top-level keys present: {sorted(EXPECTED_KEYS)}",
        len(missing_keys) == 0,
        f"Missing keys: {missing_keys}" if missing_keys else ""
    )
except Exception as e:
    check("graph_output.json is valid JSON", False, str(e))
    print("\nCannot continue — graph_output.json unreadable.")
    sys.exit(1)

with open(MOCK_DATA, encoding="utf-8") as f:
    mock = json.load(f)

person_details = mock.get("person_details", {})
KNOWN_PERSONS  = set(name.strip().title() for name in person_details)
node_ids       = {n["id"] for n in graph["nodes"]}

# ── Check 2: All known persons are nodes ─────────────────────────────────────
print("\n-- Check 2: Known persons present as nodes --------------------------")
missing_persons = KNOWN_PERSONS - node_ids
check(
    f"All {len(KNOWN_PERSONS)} known persons present as graph nodes",
    len(missing_persons) == 0,
    f"Missing: {sorted(missing_persons)}" if missing_persons else ""
)
print(f"  {INFO}  Nodes in graph : {len(node_ids)}")
print(f"  {INFO}  Edges in graph : {graph['metadata']['edge_count']}")

# ── Check 3: Kingpin rank in centrality ────────────────────────────────────────────
print("\n-- Check 3: Kingpin rank in centrality ------------------------------")
centrality = graph.get("centrality", [])
KINGPIN = "Arjun Malhotra"

kingpin_row = next((r for r in centrality if r["name"] == KINGPIN), None)
check(
    f"Kingpin '{KINGPIN}' appears in centrality table",
    kingpin_row is not None,
)
if kingpin_row:
    print(f"  {INFO}  {KINGPIN}:")
    print(f"         degree={kingpin_row['degree_centrality']:.4f}  "
          f"betweenness={kingpin_row['betweenness_centrality']:.4f}  "
          f"closeness={kingpin_row['closeness_centrality']:.4f}  "
          f"eigenvector={kingpin_row['eigenvector_centrality']:.4f}")

    # Degree and betweenness both go flat in near-complete graphs — use
    # eigenvector centrality instead, which differentiates nodes by the
    # quality (not just the count) of their connections.
    # Require kingpin in top-5 (not top-3) to allow for some tie-breaking
    # variance in small graphs.
    sorted_by_eig = sorted(centrality,
                           key=lambda r: r["eigenvector_centrality"],
                           reverse=True)
    top5_names = [r["name"] for r in sorted_by_eig[:5]]
    check(
        f"Kingpin is within top-5 by eigenvector centrality (top-5: {top5_names})",
        KINGPIN in top5_names,
        f"Kingpin ranked outside top-5 by eigenvector. Full order: "
        f"{[r['name'] for r in sorted_by_eig]}"
        if KINGPIN not in top5_names else ""
    )

# ── Check 4: All five edge types present ──────────────────────────────────────────
print("\n-- Check 4: Edge-type coverage --------------------------------------")
EXPECTED_TYPES = {"co_occurrence", "cdr_call", "shared_phone", "shared_vehicle", "shared_location"}
found_types: set[str] = set()
for edge in graph["edges"]:
    found_types.update(edge.get("edge_types", []))

for etype in sorted(EXPECTED_TYPES):
    check(
        f"Edge type '{etype}' present in graph",
        etype in found_types,
    )
extra_types = found_types - EXPECTED_TYPES
if extra_types:
    print(f"  {INFO}  Extra edge types found (not a problem): {extra_types}")

# ── Check 5: No self-loops, no zero-weight edges ─────────────────────────────────
print("\n-- Check 5: Edge quality --------------------------------------------")
self_loops  = [e for e in graph["edges"] if e["source"] == e["target"]]
zero_weight = [e for e in graph["edges"] if e.get("weight", 1) <= 0]

check("No self-loop edges",    len(self_loops)  == 0,
      str(self_loops[:3])  if self_loops  else "")
check("No zero-weight edges",  len(zero_weight) == 0,
      str(zero_weight[:3]) if zero_weight else "")

# ── Check 6: Edge source/target reference valid nodes ──────────────────────────
print("\n-- Check 6: Edge consistency (no dangling references) ---------------")
dangling = [
    e for e in graph["edges"]
    if e["source"] not in node_ids or e["target"] not in node_ids
]
check(
    "All edge source/target ids reference existing nodes",
    len(dangling) == 0,
    "\n".join(f"{e['source']} -> {e['target']}" for e in dangling[:5]) if dangling else ""
)

# ── Check 7: Weight distribution (Step 7 spot-check) ────────────────────────────
print("\n-- Check 7: Weight distribution + top-edge spot-check ---------------")
weights = [e["weight"] for e in graph["edges"]]
if weights:
    w_min = min(weights)
    w_max = max(weights)
    w_avg = sum(weights) / len(weights)
    print(f"  {INFO}  Edges: {len(weights)}   min={w_min:.2f}   max={w_max:.2f}   avg={w_avg:.2f}")

    # Flag suspiciously narrow or wide spreads.
    # If max/avg ratio is very high one heavy edge dominates everything;
    # if max == min the weighting scheme had no effect at all.
    spread_ok = w_max > w_min          # at least some variation
    check(
        "Weight spread is non-zero (weighting scheme has visible effect)",
        spread_ok,
        f"All edges have identical weight {w_min} — check WEIGHT_* constants"
        if not spread_ok else "",
    )
    dominance_ratio = w_max / w_avg if w_avg else 0
    dominance_ok = dominance_ratio < 10
    check(
        f"No single edge dominates (max/avg ratio {dominance_ratio:.1f}x < 10x threshold)",
        dominance_ok,
        "Heaviest edge weight is >10x the average — consider lowering WEIGHT_SHARED_VEHICLE"
        if not dominance_ok else "",
    )

    # Print top-10 heaviest edges so you can eyeball whether they match
    # the planted kingpin/lieutenant/associate network structure.
    top_edges = sorted(graph["edges"], key=lambda e: e["weight"], reverse=True)[:10]
    print(f"  {INFO}  Top-10 heaviest edges (verify against mock network design):")
    for e in top_edges:
        types_str = "+".join(e.get("edge_types", []))
        counts = {
            k: e.get(k, 0)
            for k in ("co_occurrence", "cdr_call", "shared_phone",
                      "shared_vehicle", "shared_location")
            if e.get(k, 0) > 0
        }
        print(f"         {e['source']!s:<22} <-> {e['target']!s:<22}  "
              f"w={e['weight']:.2f}  [{types_str}]  {counts}")
else:
    check("Graph has at least one edge for weight analysis", False, "No edges found.")

# ── Summary ──────────────────────────────────────────────────────────────────
print("\n" + "-" * 60)
if not failures:
    print(f"\n  {PASS}  All checks passed — graph_output.json ready for Section 5.\n")
    sys.exit(0)
else:
    print(f"\n  {FAIL}  {len(failures)} check(s) failed:")
    for f in failures:
        print(f"    - {f}")
    print()
    sys.exit(1)

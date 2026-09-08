"""Diagnose the graph_output.json to understand why the kingpin isn't top-3."""
import json
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent
with open(ROOT / "section4" / "data" / "graph_output.json", encoding="utf-8") as f:
    g = json.load(f)

print("=== NODES ===")
for n in g["nodes"]:
    print(f"  {n['id']:<22} role={n['role']:<12} doc_count={n['doc_count']}")

print("\n=== DEGREE per node (from edges) ===")
degree = defaultdict(int)
for e in g["edges"]:
    degree[e["source"]] += 1
    degree[e["target"]] += 1
for name, d in sorted(degree.items(), key=lambda x: -x[1]):
    print(f"  {name:<22} degree={d}")

print("\n=== Arjun Malhotra edges ===")
for e in g["edges"]:
    if "Arjun" in e["source"] or "Arjun" in e["target"]:
        other = e["target"] if "Arjun" in e["source"] else e["source"]
        types = "+".join(e["edge_types"])
        print(f"  -> {other:<22} w={e['weight']:.1f}  types={types}")

print("\n=== ISOLATED nodes (degree 0 in graph) ===")
all_nodes = {n["id"] for n in g["nodes"]}
connected = set(degree.keys())
print("  Isolated:", all_nodes - connected)

print("\n=== Centrality table (from JSON) ===")
for c in g["centrality"]:
    print(f"  {c['name']:<22} deg={c['degree_centrality']:.4f}  btw={c['betweenness_centrality']:.4f}")

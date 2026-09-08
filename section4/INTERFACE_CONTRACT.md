# Section 4 → Section 5 Interface Contract

**Owner (producer):** Person A — Section 4 (`graph_builder_s4.py`)  
**Consumer:** Person D — Section 5 (`network_analysis.py`, `audit_log.py`)  
**Also consumed by:** Person E/F — Dashboard (`app.py` via `CriminalNetworkBuilder`)

---

## What Section 4 produces

Running `python section4/graph_builder_s4.py` writes **three files** to
`section4/data/`:

| File | Format | Purpose |
|------|--------|---------|
| `graph_output.json` | Custom JSON (see schema below) | **Primary handoff — read this** |
| `graph_output.gexf` | GEXF XML | Visual debugging in Gephi |
| `graph_output.graphml` | GraphML XML | Cytoscape, yEd, other tools |

All three represent the **same graph** — use whichever format is most
convenient. For code that needs to do centrality analysis, use the JSON.

---

## Option 1 — Consume the live NetworkX graph object (same script)

If you're running in the same Python process, skip file I/O entirely:

```python
from section4.graph_builder_s4 import NERGraphBuilder

builder = NERGraphBuilder()
G = builder.build()          # returns nx.Graph — ready to use immediately
```

`G` is a standard `networkx.Graph`. All NetworkX algorithms work on it
directly:

```python
import networkx as nx

nx.betweenness_centrality(G, weight="weight")
nx.degree_centrality(G)
nx.eigenvector_centrality(G, weight="weight")
```

---

## Option 2 — Consume `graph_output.json` (cross-file handoff)

```python
import json, networkx as nx
from pathlib import Path

with open("section4/data/graph_output.json", encoding="utf-8") as f:
    data = json.load(f)

# Rebuild a NetworkX graph from the JSON if you need nx algorithms:
G = nx.Graph()
for node in data["nodes"]:
    G.add_node(node["id"], **{k: v for k, v in node.items() if k != "id"})
for edge in data["edges"]:
    G.add_edge(edge["source"], edge["target"],
               weight=edge["weight"],
               edge_types=edge["edge_types"],
               co_occurrence=edge["co_occurrence"],
               cdr_call=edge["cdr_call"],
               shared_phone=edge["shared_phone"],
               shared_vehicle=edge["shared_vehicle"],
               shared_location=edge["shared_location"])

# Or just read centrality results directly — no NetworkX needed:
top_players = data["centrality"]   # already sorted by betweenness desc
```

---

## Node schema

Every node in the graph (and in `data["nodes"]`) has these attributes:

| Attribute | Type | Notes |
|-----------|------|-------|
| `id` | `str` | Normalised person name — this is the node key in NetworkX |
| `node_type` | `str` | Always `"PERSON"` (Option A — attributes are not nodes) |
| `role` | `str` | `"Key Person"`, `"Associate"`, or `"Unknown"` |
| `phone` | `str` | Primary phone from mock data (may be `""`) |
| `city` | `str` | Home city from mock data (may be `""`) |
| `doc_count` | `int` | Number of documents this person appears in — useful as a fallback size signal before centrality is calculated |

**Node IDs are normalised name strings** (whitespace-collapsed, title-cased
via `_title()`). They are **not** numeric IDs. Use them directly as dictionary
keys: `G.nodes["Arjun Malhotra"]["role"]`.

---

## Edge schema

Every edge in the graph (and in `data["edges"]`) has these attributes:

| Attribute | Type | Notes |
|-----------|------|-------|
| `weight` | `float` | **Cumulative evidence score** — this is what PyVis maps to line thickness. Higher = stronger link. |
| `co_occurrence` | `int` | # shared FIR/report documents |
| `cdr_call` | `int` | # shared CDR records (confirmed phone contact) |
| `shared_phone` | `int` | # unique phone numbers linking this pair |
| `shared_vehicle` | `int` | # unique vehicle plates linking this pair |
| `shared_location` | `int` | # unique named locations linking this pair |
| `edge_types` | `list[str]` | Which evidence types are present, e.g. `["co_occurrence", "cdr_call"]` |
| `details` | `list[dict]` | Per-evidence detail records (doc_id / phone / plate / location) for forensic traceability |

### Weight constants (for pitch explanation)

```
co_occurrence   = 1.0   # same paragraph is circumstantial
cdr_call        = 2.0   # confirmed phone contact
shared_phone    = 1.5   # shared number across docs
shared_location = 1.5   # same named place across docs
shared_vehicle  = 2.5   # shared registered vehicle (hardest to fake)
```

These are defined as `WEIGHT_*` constants in `graph_builder_s4.py` — tune
them there, not in downstream code.

---

## Guaranteed graph properties

These are enforced by NetworkX's `Graph()` type — you do not need to
check for them:

- **Undirected** — "A is linked to B" is the same as "B is linked to A".
  Deliberate choice: criminal associations are symmetric at this analysis
  level.
- **No self-loops** — `_add_edge()` guards against `u == v`.
- **No duplicate edges** — `Graph()` merges parallel edges; weight is
  cumulative, not duplicated.
- **No zero-weight edges** — minimum weight is `WEIGHT_CO_OCCURRENCE = 1.0`.

---

## Centrality pre-computed in `data["centrality"]`

`graph_output.json` includes a `centrality` list already sorted by
**betweenness centrality descending** (primary) + degree (tiebreak).
Each entry:

```json
{
  "name": "Arjun Malhotra",
  "role": "Key Person",
  "degree": 12,
  "degree_centrality": 0.8571,
  "betweenness_centrality": 0.4123,
  "closeness_centrality": 0.7500,
  "eigenvector_centrality": 0.9201
}
```

You can use this directly for the audit log without re-running centrality
algorithms — but if you want to run your own (e.g. with different
parameters), use the live `nx.Graph` from Option 1.

---

## Known limitations (documented, not bugs)

- **No entity disambiguation** — `"R. Yadav"` and `"Ramesh Yadav"` will
  be separate nodes if spaCy emits them as separate entities in different
  documents. The `_title()` normalisation in `graph_builder_s4.py` only
  handles whitespace and casing, not abbreviation resolution. Mention this
  if asked by a judge.
- **Option A only** — phones, vehicles, and locations inform edge weight
  but are not graph nodes themselves. A lone actor who never appears
  alongside anyone else will be invisible to centrality metrics even if
  their phone number is a hub. Option B (attribute-as-node) is documented
  as future scope.
- **Common city names** (e.g. "Mumbai") will produce `shared_location`
  edges between many pairs of people who merely live in the same city —
  not necessarily co-conspirators. If this inflates centrality scores,
  lower `WEIGHT_SHARED_LOCATION` in `graph_builder_s4.py`.

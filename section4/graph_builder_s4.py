"""
Section 4 — Graph Construction from NER Output
===============================================
Owner  : Person A (VYKE)
Consumes : section3/data/ner_output.json   (Section 3 handoff)
Produces : section4/data/graph_output.json  (Section 5 handoff)

Attribute-node design decision (Step 6 from project notes)
----------------------------------------------------------
Option A — attribute-only (CHOSEN): PHONE, VEHICLE, and GPE/LOCATION entities
inform edge weight between PERSON nodes but never become graph nodes themselves.
This is sufficient for a working demo and keeps the graph readable.

Option B — attribute-as-node (stretch goal): add phone/location/vehicle as
nodes with edges to every linked person. This would expose lone actors whose
phone number is the real hub even when they never appear alongside anyone else
in a document. Documented as "future scope" for the pitch limitation slide.

Note on entity filtering:
  Only PERSON entities become graph nodes.
  PHONE, VEHICLE, and GPE entities inform edge weights only (Option A).
  spaCy occasionally mis-tags vehicle plate strings like "Vehicle WB12EF2198"
  as ORGANIZATION — these are detected via the vehicle regex and silently
  excluded from the PERSON node list.

Pipeline position:
    Section 2 (mock data)
        → Section 3 (spaCy NER → ner_output.json)
        → [THIS FILE] Section 4 (graph construction → graph_output.json)
        → Section 5 (centrality analysis + audit log)
        → Section 6 (Streamlit + PyVis dashboard)

Graph design:
  Nodes  — PERSON entities (one node per unique name)
  Edges  — weighted, multi-relational:
      co_occurrence   : two people mentioned in the same REP-* document
      cdr_call        : two people appearing together in a CDR-* document
                        (i.e. they were on the same phone call)
      shared_phone    : same phone number appears alongside both people
                        across different documents
      shared_vehicle  : same vehicle plate appears alongside both people
                        across different documents
      shared_location : same named location (GPE) appears alongside both
                        people across different documents

Edge weight constants — see WEIGHT_* below.  These are the numbers to point
at if a judge asks "how is this different from just counting who's mentioned
together?": shared-attribute edges add MORE weight than co-occurrence because
a shared phone number or vehicle is a stronger operational signal than two
names appearing in the same paragraph.

Edge attribute schema (per edge in the graph):
    weight           float   cumulative evidence score (type-weighted sum)
    co_occurrence    int     # of shared REP-* documents
    cdr_call         int     # of shared CDR-* documents (phone calls)
    shared_phone     int     # of unique phone numbers linking the pair
    shared_vehicle   int     # of unique vehicle plates linking the pair
    shared_location  int     # of unique named locations linking the pair
    edge_types       list    which type labels are present (for filtering)
    details          list    per-evidence detail dicts (doc_id / phone / plate / location)
"""

from __future__ import annotations

import itertools
import json
import re
import sys
from collections import defaultdict
from pathlib import Path
from typing import Any, Optional

# Vehicle-plate pattern (same as spacy_ner.py) — used to detect mis-tagged ORG entities
_VEHICLE_RE = re.compile(r"\b[A-Z]{2}\d{2}[A-Z]{1,2}\d{4}\b")

# ---------------------------------------------------------------------------
# Optional runtime dependency: networkx
# ---------------------------------------------------------------------------
try:
    import networkx as nx  # type: ignore[import-untyped]
    _NX_AVAILABLE = True
except ImportError:
    nx = None  # type: ignore[assignment]
    _NX_AVAILABLE = False
    print("Warning: 'networkx' module not found. Install with: pip install networkx")

# ---------------------------------------------------------------------------
# Edge weight constants
# Tune these to adjust how strongly each evidence type influences centrality.
# Deliberately differentiated so the pitch can explain *why* each value was
# chosen: a shared vehicle (hardest to fake) outweighs a shared location
# (public place), which outweighs a CDR call, which outweighs plain co-mention.
# ---------------------------------------------------------------------------
WEIGHT_CO_OCCURRENCE  : float = 1.0   # weak  — same paragraph is circumstantial
WEIGHT_CDR_CALL       : float = 2.0   # medium — confirmed phone contact
WEIGHT_SHARED_PHONE   : float = 1.5   # medium — shared number across docs
WEIGHT_SHARED_VEHICLE : float = 2.5   # strong — shared registered vehicle
WEIGHT_SHARED_LOCATION: float = 1.5   # medium — same named place across docs

# Maximum number of distinct persons that may share a location before that
# location is considered too common to carry meaningful signal.
# Problem: a city name like "Mumbai" may appear in every document and link ALL
# suspects together, collapsing the graph into a complete clique where every
# node has identical centrality — making the kingpin indistinguishable.
# Solution: skip any location whose document footprint spans more than this
# many unique persons. Tune downward if the graph is still too dense.
MAX_SHARED_LOCATION_PERSONS: int = 4

# ---------------------------------------------------------------------------
# Path constants
# ---------------------------------------------------------------------------
REPO_ROOT    = Path(__file__).resolve().parent.parent
NER_OUTPUT   = REPO_ROOT / "section3" / "data" / "ner_output.json"
MOCK_DATA    = REPO_ROOT / "section 2" / "data" / "mock_data.json"
OUTPUT_DIR   = REPO_ROOT / "section4" / "data"
GRAPH_OUTPUT = OUTPUT_DIR / "graph_output.json"


# ---------------------------------------------------------------------------
# Helper: normalise a person name the same way spacy_ner does
# ---------------------------------------------------------------------------
def _title(name: str) -> str:
    """
    Normalise a person name the same way across every call site.

    Steps (Step 8 — normalize_name equivalent):
      1. Strip leading/trailing whitespace.
      2. Collapse internal whitespace runs ("Ramesh  Kumar" → "Ramesh Kumar").
      3. Title-case ("ramesh kumar" → "Ramesh Kumar").

    Applied at the point names are first read from NER output, not after the
    graph is built, so canonicalisation happens before any node is created.
    Full entity disambiguation ("R. Yadav" == "Ramesh Yadav") is a documented
    limitation — acceptable for this project scope.
    """
    return " ".join(name.strip().split()).title()


# ===========================================================================
# NERGraphBuilder
# ===========================================================================

class NERGraphBuilder:
    """
    Builds a weighted, multi-relational NetworkX graph from Section 3's
    ner_output.json.

    Usage (standalone)::

        builder = NERGraphBuilder()
        G = builder.build()
        builder.save()
        builder.print_report()

    Usage (from another module)::

        from section4.graph_builder_s4 import NERGraphBuilder
        builder = NERGraphBuilder()
        G = builder.build()
    """

    def __init__(self):
        if not _NX_AVAILABLE:
            raise RuntimeError(
                "NetworkX is required. Install with: pip install networkx"
            )
        self.G: nx.Graph = nx.Graph()
        self._ner_docs: list[dict] = []
        self._person_meta: dict[str, dict] = {}   # name -> {role, phone, city}

    # -----------------------------------------------------------------------
    # Data loading
    # -----------------------------------------------------------------------

    def load_ner_output(self, path: Optional[Path] = None) -> list[dict]:
        """Load ner_output.json produced by Section 3."""
        path = Path(path) if path else NER_OUTPUT
        if not path.exists():
            raise FileNotFoundError(
                f"NER output not found at {path}.\n"
                "Run section3/spacy_ner.py first to generate it."
            )
        with open(path, encoding="utf-8") as f:
            self._ner_docs = json.load(f)
        print(f"[Section 4] Loaded {len(self._ner_docs)} NER documents from {path.name}")
        return self._ner_docs

    def load_person_metadata(self, path: Optional[Path] = None) -> dict[str, dict]:
        """
        Load person roles and details from mock_data.json.
        This enriches graph nodes with metadata (role, phone, city).
        Falls back gracefully if the file is missing.
        """
        path = Path(path) if path else MOCK_DATA
        if not path.exists():
            print(f"[Section 4] Warning: mock_data.json not found — node metadata will be empty.")
            return {}
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        self._person_meta = {
            _title(name): details
            for name, details in data.get("person_details", {}).items()
        }
        print(f"[Section 4] Loaded metadata for {len(self._person_meta)} known persons.")
        return self._person_meta

    # -----------------------------------------------------------------------
    # Node helpers
    # -----------------------------------------------------------------------

    def _add_person_node(self, name: str) -> None:
        """Add a PERSON node (idempotent). Enriches with metadata if available."""
        if self.G.has_node(name):
            return
        meta = self._person_meta.get(name, {})
        self.G.add_node(
            name,
            node_type = "PERSON",
            role      = meta.get("role", "Unknown"),
            phone     = meta.get("phone", ""),
            city      = meta.get("city", ""),
            doc_count = 0,   # incremented each time this person appears in a document
        )

    # -----------------------------------------------------------------------
    # Edge helpers
    # -----------------------------------------------------------------------

    # All valid edge type labels and their zero-initialised counter names.
    _EDGE_TYPES = ("co_occurrence", "cdr_call", "shared_phone", "shared_vehicle", "shared_location")

    def _add_edge(
        self,
        u: str,
        v: str,
        edge_type: str,
        weight_inc: float = 1.0,
        detail: Optional[dict] = None,
    ) -> None:
        """
        Add or update a weighted edge between two nodes.

        Weight is cumulative — each new piece of evidence adds to it.
        Per-type integer counters (co_occurrence, cdr_call, shared_phone,
        shared_vehicle) are incremented alongside weight so callers can ask
        e.g. G[u][v]["co_occurrence"] without scanning the details list.
        The set()-based combinations() call in build() already guarantees
        no self-pairs reach here, but we guard anyway.
        """
        if not u or not v or u == v:
            return
        self._add_person_node(u)
        self._add_person_node(v)

        if self.G.has_edge(u, v):
            self.G[u][v]["weight"] += weight_inc
            # Register the type label if this is the first time it appears
            if edge_type not in self.G[u][v]["edge_types"]:
                self.G[u][v]["edge_types"].append(edge_type)
            # Increment the per-type counter (unknown types are silently ignored)
            if edge_type in self._EDGE_TYPES:
                self.G[u][v][edge_type] += 1
            if detail:
                self.G[u][v]["details"].append(detail)
        else:
            # Initialise all four counters to 0; bump the relevant one to 1
            counters = {t: 0 for t in self._EDGE_TYPES}
            if edge_type in counters:
                counters[edge_type] = 1
            self.G.add_edge(
                u, v,
                weight     = weight_inc,
                edge_types = [edge_type],
                details    = [detail] if detail else [],
                **counters,
            )

    # -----------------------------------------------------------------------
    # Core build logic
    # -----------------------------------------------------------------------

    def build(
        self,
        ner_path:  Optional[Path] = None,
        meta_path: Optional[Path] = None,
    ) -> nx.Graph:
        """
        Full pipeline: load NER output → build graph → return NetworkX graph.

        Steps performed (all Option A — attributes inform edge weight only):
          Pass 1. Co-occurrence / CDR-call edges — people sharing a document
          Pass 2. Shared-phone edges    — same phone number across documents
          Pass 3. Shared-vehicle edges  — same plate across documents
          Pass 4. Shared-location edges — same GPE location across documents
        """
        if not self._ner_docs:
            self.load_ner_output(ner_path)
        if not self._person_meta:
            self.load_person_metadata(meta_path)

        # -- Indexes built during the first pass ----------------------------
        # Each maps an attribute value → list of (doc_id, [persons_in_that_doc])
        # so Pass 2-4 can find every pair of people who share that attribute.
        phone_index:    dict[str, list[tuple[str, list[str]]]] = defaultdict(list)
        vehicle_index:  dict[str, list[tuple[str, list[str]]]] = defaultdict(list)
        location_index: dict[str, list[tuple[str, list[str]]]] = defaultdict(list)

        # -- Pass 1: per-document co-occurrence edges -----------------------
        print("[Section 4] Building co-occurrence and CDR call edges …")
        for doc in self._ner_docs:
            doc_id   = doc["doc_id"]
            entities = doc.get("entities", [])

            persons   = [
                _title(e["text"]) for e in entities
                if e["label"] == "PERSON"
                and not _VEHICLE_RE.search(e["text"].upper())   # drop plate mis-tags
            ]
            phones    = [e["text"]         for e in entities if e["label"] == "PHONE"]
            vehicles  = [e["text"].upper() for e in entities if e["label"] == "VEHICLE"]
            # GPE = geopolitical entity — cities, states, countries extracted by spaCy.
            # Lowercased for index consistency ("Mumbai" == "mumbai").
            locations = [e["text"].lower() for e in entities if e["label"] == "GPE"]

            # Ensure all persons have nodes even if they appear alone in a doc
            for p in persons:
                self._add_person_node(p)
                self.G.nodes[p]["doc_count"] += 1   # one increment per document, not per mention

            # Edge type depends on whether this is a CDR or a report document
            is_cdr    = doc_id.startswith("CDR-")
            edge_type = "cdr_call" if is_cdr else "co_occurrence"
            weight    = WEIGHT_CDR_CALL if is_cdr else WEIGHT_CO_OCCURRENCE

            for a, b in itertools.combinations(sorted(set(persons)), 2):
                self._add_edge(
                    a, b,
                    edge_type  = edge_type,
                    weight_inc = weight,
                    detail     = {"doc_id": doc_id},
                )

            # Index phones, vehicles, and locations for the shared-attribute passes.
            # Only index when persons are present — a phone/plate/location with no
            # linked person cannot produce a person-to-person edge.
            if persons:
                for phone in phones:
                    phone_index[phone].append((doc_id, list(set(persons))))
                for plate in vehicles:
                    vehicle_index[plate].append((doc_id, list(set(persons))))
                for loc in locations:
                    location_index[loc].append((doc_id, list(set(persons))))

        # -- Pass 2: shared-phone edges ------------------------------------
        print("[Section 4] Building shared-phone edges …")
        for phone, appearances in phone_index.items():
            all_persons: set[str] = set()
            for _doc_id, persons in appearances:
                all_persons.update(persons)
            for a, b in itertools.combinations(sorted(all_persons), 2):
                self._add_edge(
                    a, b,
                    edge_type  = "shared_phone",
                    weight_inc = WEIGHT_SHARED_PHONE,
                    detail     = {"phone": phone},
                )

        # -- Pass 3: shared-vehicle edges ----------------------------------
        print("[Section 4] Building shared-vehicle edges …")
        for plate, appearances in vehicle_index.items():
            all_persons_v: set[str] = set()
            for _doc_id, persons in appearances:
                all_persons_v.update(persons)
            for a, b in itertools.combinations(sorted(all_persons_v), 2):
                self._add_edge(
                    a, b,
                    edge_type  = "shared_vehicle",
                    weight_inc = WEIGHT_SHARED_VEHICLE,
                    detail     = {"vehicle": plate},
                )

        # -- Pass 4: shared-location edges ---------------------------------
        # Two people appearing at the same *specific* place across different
        # docs is a meaningful signal — but a generic city name like "Mumbai"
        # that appears in every document links ALL suspects together, turning
        # the graph into a complete clique where every node has identical
        # degree and betweenness centrality (= the kingpin is invisible).
        #
        # Fix: skip any location whose footprint spans more than
        # MAX_SHARED_LOCATION_PERSONS unique suspects.  These are city-level
        # names, not operational meeting points.
        print("[Section 4] Building shared-location edges …")
        skipped_locs = 0
        for loc, appearances in location_index.items():
            all_persons_l: set[str] = set()
            for _doc_id, persons in appearances:
                all_persons_l.update(persons)
            if len(all_persons_l) > MAX_SHARED_LOCATION_PERSONS:
                skipped_locs += 1
                continue   # too common — not a meaningful operational signal
            for a, b in itertools.combinations(sorted(all_persons_l), 2):
                self._add_edge(
                    a, b,
                    edge_type  = "shared_location",
                    weight_inc = WEIGHT_SHARED_LOCATION,
                    detail     = {"location": loc},
                )
        if skipped_locs:
            print(f"[Section 4]   Skipped {skipped_locs} over-common location(s) "
                  f"(>{MAX_SHARED_LOCATION_PERSONS} persons — raise MAX_SHARED_LOCATION_PERSONS to include them)")

        print(
            f"[Section 4] Graph built: "
            f"{self.G.number_of_nodes()} nodes, "
            f"{self.G.number_of_edges()} edges."
        )
        return self.G

    # -----------------------------------------------------------------------
    # Centrality analysis
    # -----------------------------------------------------------------------

    def compute_centrality(self, top_n: int = 10) -> list[dict]:
        """
        Compute Degree, Betweenness, Closeness and Eigenvector centrality.
        Returns a list sorted by betweenness (primary) + degree (tiebreak).
        """
        if self.G.number_of_nodes() == 0:
            return []

        deg_cent   = nx.degree_centrality(self.G)
        bet_cent   = nx.betweenness_centrality(self.G, normalized=True, weight="weight")
        close_cent = nx.closeness_centrality(self.G)
        try:
            eig_cent = nx.eigenvector_centrality(self.G, max_iter=1000, weight="weight")
        except Exception:
            eig_cent = {n: 0.0 for n in self.G.nodes}

        rankings = []
        for node in self.G.nodes:
            meta = self.G.nodes[node]
            rankings.append({
                "name"                  : str(node),
                "role"                  : meta.get("role", "Unknown"),
                "degree"                : self.G.degree(node),
                "degree_centrality"     : round(deg_cent.get(node, 0), 4),
                "betweenness_centrality": round(bet_cent.get(node, 0), 4),
                "closeness_centrality"  : round(close_cent.get(node, 0), 4),
                "eigenvector_centrality": round(eig_cent.get(node, 0), 4),
            })

        rankings.sort(
            key=lambda x: (x["betweenness_centrality"], x["degree_centrality"]),
            reverse=True,
        )
        return rankings[:top_n]

    # -----------------------------------------------------------------------
    # Export helpers
    # -----------------------------------------------------------------------

    def _build_export_graph(self) -> "nx.Graph":
        """
        Return a plain new nx.Graph with all attribute values as scalars.

        GEXF and GraphML writers reject Python lists and dicts, so:
          • edge_types  list[str]  → comma-joined str  e.g. "co_occurrence,cdr_call"
          • details     list[dict] → int count          e.g. 7  (how many evidence items)
          • All node and other edge attributes are already plain scalars
            (str / int / float) and are copied through unchanged.

        Builds from scratch rather than deepcopy + in-place mutation because
        the mutation approach is unreliable across NetworkX 3.x minor versions.
        """
        G_exp = nx.Graph()
        for node, attrs in self.G.nodes(data=True):
            G_exp.add_node(node, **attrs)
        for u, v, attrs in self.G.edges(data=True):
            clean_attrs = {k: v_attr for k, v_attr in attrs.items()
                          if k not in ("edge_types", "details")}
            clean_attrs["edge_types"] = ",".join(attrs.get("edge_types", []))
            clean_attrs["details"]    = len(attrs.get("details", []))
            G_exp.add_edge(u, v, **clean_attrs)
        return G_exp

    # -----------------------------------------------------------------------
    # Output / handoff to Section 5
    # -----------------------------------------------------------------------

    def save(self, output_path: Optional[Path] = None) -> Path:
        """
        Serialise the graph to three files for Section 5 (Person D).

        Outputs (all written to the same directory as output_path):
          graph_output.json   — primary handoff; full custom schema below
          graph_output.gexf   — human-readable XML; opens directly in Gephi
          graph_output.graphml — broadly compatible; works with Cytoscape etc.

        JSON schema:
        {
            "metadata": {
                "node_count": int,
                "edge_count": int,
                "source_file": str,
                "edge_types":  [str, ...],
                "weights":     {edge_type: float, ...}
            },
            "nodes": [
                {"id": str, "node_type": "PERSON", "role": str,
                 "phone": str, "city": str, "doc_count": int}
            ],
            "edges": [
                {"source": str, "target": str, "weight": float,
                 "edge_types": [str], "co_occurrence": int,
                 "cdr_call": int, "shared_phone": int,
                 "shared_vehicle": int, "shared_location": int,
                 "details": [dict]}
            ],
            "centrality": [
                {"name": str, "role": str, "degree": int,
                 "degree_centrality": float, "betweenness_centrality": float,
                 "closeness_centrality": float, "eigenvector_centrality": float}
            ]
        }
        """
        output_path = Path(output_path) if output_path else GRAPH_OUTPUT
        output_path.parent.mkdir(parents=True, exist_ok=True)
        out_dir = output_path.parent

        # Nodes
        nodes_out = []
        for node, attrs in self.G.nodes(data=True):
            nodes_out.append({"id": node, **attrs})

        # Edges — include per-type counters explicitly so Section 5 / the
        # dashboard can read them without scanning the details list.
        edges_out = []
        for u, v, attrs in self.G.edges(data=True):
            edges_out.append({
                "source"          : u,
                "target"          : v,
                "weight"          : round(attrs.get("weight", 1.0), 3),
                "edge_types"      : attrs.get("edge_types", []),
                "co_occurrence"   : attrs.get("co_occurrence", 0),
                "cdr_call"        : attrs.get("cdr_call", 0),
                "shared_phone"    : attrs.get("shared_phone", 0),
                "shared_vehicle"  : attrs.get("shared_vehicle", 0),
                "shared_location" : attrs.get("shared_location", 0),
                "details"         : attrs.get("details", []),
            })

        centrality = self.compute_centrality(top_n=len(self.G.nodes))

        output = {
            "metadata": {
                "node_count"  : self.G.number_of_nodes(),
                "edge_count"  : self.G.number_of_edges(),
                "source_file" : str(NER_OUTPUT.name),
                "edge_types"  : list(NERGraphBuilder._EDGE_TYPES),
                "weights"     : {
                    "co_occurrence"  : WEIGHT_CO_OCCURRENCE,
                    "cdr_call"       : WEIGHT_CDR_CALL,
                    "shared_phone"   : WEIGHT_SHARED_PHONE,
                    "shared_vehicle" : WEIGHT_SHARED_VEHICLE,
                    "shared_location": WEIGHT_SHARED_LOCATION,
                },
            },
            "nodes"      : nodes_out,
            "edges"      : edges_out,
            "centrality" : centrality,
        }

        # 1 — Primary JSON handoff
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(output, f, indent=2, ensure_ascii=False)
        print(f"[Section 4] JSON  saved → {output_path}")

        # 2 — GEXF (human-readable XML; open in Gephi for visual debugging)
        # 3 — GraphML (widely compatible; works with Cytoscape, yEd, etc.)
        #
        # Both formats require all attribute values to be plain scalars.
        # We build a fresh sanitised graph (not a deepcopy) so there is no
        # risk of the in-place mutation not sticking across NetworkX versions:
        #   • edge_types list  → comma-joined string  e.g. "co_occurrence,cdr_call"
        #   • details list     → integer count         e.g. 7
        #   • all other edge/node attrs are already plain scalars
        G_export = self._build_export_graph()

        gexf_path = out_dir / "graph_output.gexf"
        try:
            nx.write_gexf(G_export, str(gexf_path))
            print(f"[Section 4] GEXF  saved → {gexf_path}")
        except Exception as exc:
            print(f"[Section 4] GEXF export skipped: {exc}")

        graphml_path = out_dir / "graph_output.graphml"
        try:
            nx.write_graphml(G_export, str(graphml_path))
            print(f"[Section 4] GraphML saved → {graphml_path}")
        except Exception as exc:
            print(f"[Section 4] GraphML export skipped: {exc}")

        return output_path

    # -----------------------------------------------------------------------
    # Human-readable report
    # -----------------------------------------------------------------------

    def print_report(self) -> None:
        """Print a concise centrality report to stdout."""
        print()
        print("=" * 65)
        print("  Section 4 — Key Influencer Report")
        print("=" * 65)
        print(f"  Nodes : {self.G.number_of_nodes()}")
        print(f"  Edges : {self.G.number_of_edges()}")
        print("-" * 65)
        print(f"  {'Name':<22} {'Role':<14} {'Btwn':>6} {'Deg':>6} {'Close':>7}")
        print("-" * 65)

        for r in self.compute_centrality():
            print(
                f"  {r['name']:<22} {r['role']:<14} "
                f"{r['betweenness_centrality']:>6.4f} "
                f"{r['degree_centrality']:>6.4f} "
                f"{r['closeness_centrality']:>7.4f}"
            )

        print("=" * 65)
        print()

        # Edge type breakdown
        type_counts: dict[str, int] = defaultdict(int)
        for _, _, attrs in self.G.edges(data=True):
            for t in attrs.get("edge_types", []):
                type_counts[t] += 1
        print("  Edge-type breakdown:")
        for etype, count in sorted(type_counts.items(), key=lambda x: -x[1]):
            print(f"    {etype:<22} {count} edge(s)")
        print()


# ===========================================================================
# Standalone entry point
# ===========================================================================

def run_graph_construction():
    builder = NERGraphBuilder()
    builder.build()
    builder.save()
    builder.print_report()


if __name__ == "__main__":
    run_graph_construction()

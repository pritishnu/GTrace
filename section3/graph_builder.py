from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import TYPE_CHECKING, Any, Optional

# ---------------------------------------------------------------------------
# Optional runtime dependency: networkx
# ---------------------------------------------------------------------------
try:
    import networkx as nx  # type: ignore[import-untyped]
    _NX_AVAILABLE = True
except ImportError:
    nx = None  # type: ignore[assignment]
    _NX_AVAILABLE = False
    print("Warning: 'networkx' module not found.")

# ---------------------------------------------------------------------------
# Resolve repo root and make section 5 importable at runtime
# ---------------------------------------------------------------------------
REPO_ROOT = Path(__file__).resolve().parent.parent
SECTION5_PATH = REPO_ROOT / "section 5"
if str(SECTION5_PATH) not in sys.path:
    sys.path.insert(0, str(SECTION5_PATH))

# ---------------------------------------------------------------------------
# Optional runtime dependency: audit_log (lives in section 5/)
# Pylance: the TYPE_CHECKING block lets the static analyser see the real type;
# at runtime the try/except handles the case where the module is absent.
# ---------------------------------------------------------------------------
if TYPE_CHECKING:
    # Only evaluated by static analysers, never at runtime
    import importlib.util as _ilu
    _spec = _ilu.spec_from_file_location("audit_log", str(SECTION5_PATH / "audit_log.py"))

try:
    from audit_log import AuditLog  # type: ignore[import-not-found]
    _AUDIT_AVAILABLE = True
except ImportError:
    AuditLog = None  # type: ignore[assignment,misc]
    _AUDIT_AVAILABLE = False

class CriminalNetworkBuilder:
    """
    Builds multi-relational entity graph using NetworkX based on:
    1. Document co-occurrences (from NER extracted entities or raw mock_data)
    2. Call Detail Records (CDRs)
    3. Financial Transactions
    4. Vehicle Associations
    5. Organization Links
    """
    def __init__(self):
        if nx is None:
            raise RuntimeError("NetworkX is required to build the criminal network graph.")
        self.G = nx.Graph()

    def add_entity_node(self, node_id: str, node_type: str = "PERSON", **kwargs):
        """Add a node with metadata attributes and node_type styling hints."""
        if not self.G.has_node(node_id):
            self.G.add_node(node_id, node_type=node_type, **kwargs)

    def add_weighted_edge(self, u: str, v: str, edge_type: str, weight_inc: float = 1.0, details: dict = None):
        """Add or update a multi-relational weighted edge between nodes."""
        if u == v or not u or not v:
            return
        
        self.add_entity_node(u)
        self.add_entity_node(v)

        if self.G.has_edge(u, v):
            self.G[u][v]["weight"] += weight_inc
            if edge_type not in self.G[u][v]["edge_types"]:
                self.G[u][v]["edge_types"].append(edge_type)
            if details:
                self.G[u][v]["details"].append(details)
        else:
            self.G.add_edge(
                u, v,
                weight=weight_inc,
                edge_types=[edge_type],
                details=[details] if details else []
            )

    def build_from_mock_data(self, mock_data_path: Optional[str] = None) -> Any:
        """Construct graph directly from mock_data.json schema."""
        if mock_data_path is None:
            mock_data_path = REPO_ROOT / "section 2" / "data" / "mock_data.json"
        
        with open(mock_data_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        # 1. Register Person Nodes
        person_details = data.get("person_details", {})
        for person_name, details in person_details.items():
            self.add_entity_node(
                person_name,
                node_type="PERSON",
                person_id=details.get("person_id"),
                role=details.get("role", "Unknown"),
                phone=details.get("phone"),
                city=details.get("city")
            )

        # 2. Co-occurrence in Documents
        documents = data.get("documents", [])
        known_people = list(person_details.keys())
        for doc in documents:
            text = doc.get("text", "")
            doc_id = doc.get("report_id", "DOC")
            
            # Find people mentioned in document
            present_people = [p for p in known_people if p in text]
            for i in range(len(present_people)):
                for j in range(i + 1, len(present_people)):
                    p1, p2 = present_people[i], present_people[j]
                    self.add_weighted_edge(
                        p1, p2,
                        edge_type="co_occurrence",
                        weight_inc=1.0,
                        details={"doc_id": doc_id, "location": doc.get("location")}
                    )

        # 3. CDR Call Records
        cdr_records = data.get("cdr_records", [])
        for cdr in cdr_records:
            caller = cdr.get("caller")
            receiver = cdr.get("receiver")
            if caller and receiver:
                duration = cdr.get("duration_seconds", 0)
                # Weight by call count and duration
                weight = 1.5 + (duration / 600.0)
                self.add_weighted_edge(
                    caller, receiver,
                    edge_type="cdr_call",
                    weight_inc=weight,
                    details={"cdr_id": cdr.get("cdr_id"), "duration": duration, "date": cdr.get("date")}
                )

        # 4. Financial Transactions
        transactions = data.get("financial_transactions", [])
        for txn in transactions:
            sender = txn.get("sender")
            receiver = txn.get("receiver")
            amount = txn.get("amount", 0)
            if sender and receiver:
                weight = 2.0 + (amount / 50000.0)
                self.add_weighted_edge(
                    sender, receiver,
                    edge_type="financial_transaction",
                    weight_inc=weight,
                    details={"txn_id": txn.get("transaction_id"), "amount": amount, "org": txn.get("organization")}
                )

        # 5. Vehicle Records
        vehicle_records = data.get("vehicle_records", [])
        vehicle_owners = {}
        for vr in vehicle_records:
            v_num = vr.get("vehicle_number")
            owner = vr.get("associated_person")
            if v_num and owner:
                vehicle_owners.setdefault(v_num, []).append(owner)
        
        for v_num, owners in vehicle_owners.items():
            for i in range(len(owners)):
                for j in range(i + 1, len(owners)):
                    self.add_weighted_edge(
                        owners[i], owners[j],
                        edge_type="shared_vehicle",
                        weight_inc=2.5,
                        details={"vehicle": v_num}
                    )

        return self.G

    def analyze_centrality(self, top_n: int = 10) -> list[dict]:
        """Compute network centrality measures (Degree, Betweenness, Eigenvector, Closeness)."""
        if len(self.G.nodes) == 0:
            return []

        deg_cent = nx.degree_centrality(self.G)
        bet_cent = nx.betweenness_centrality(self.G, normalized=True, weight="weight")
        close_cent = nx.closeness_centrality(self.G)
        
        try:
            eig_cent = nx.eigenvector_centrality(self.G, max_iter=1000)
        except Exception:
            eig_cent = {n: 0.0 for n in self.G.nodes}

        rankings = []
        for node in self.G.nodes:
            node_data = self.G.nodes[node]
            rankings.append({
                "node_id": str(node),
                "role": node_data.get("role", "Unknown"),
                "degree_centrality": round(deg_cent.get(node, 0), 4),
                "betweenness_centrality": round(bet_cent.get(node, 0), 4),
                "closeness_centrality": round(close_cent.get(node, 0), 4),
                "eigenvector_centrality": round(eig_cent.get(node, 0), 4),
                "degree": self.G.degree(node)
            })

        # Rank primarily by betweenness (bridge nodes) and degree centrality
        rankings.sort(key=lambda x: (x["betweenness_centrality"], x["degree_centrality"]), reverse=True)
        return rankings[:top_n]

    def log_analysis(self, audit_path: str = None) -> tuple[list[dict], object]:
        """Compute key players and log high centrality flags into AuditLog."""
        if audit_path is None:
            audit_path = REPO_ROOT / "section 5" / "audit_log.json"
        
        rankings = self.analyze_centrality()
        log = AuditLog() if AuditLog else None
        
        if log:
            for player in rankings:
                if player["betweenness_centrality"] > 0.1 or player["degree_centrality"] > 0.3:
                    log.add_entry("key_player_flagged", player)
            log.save_to_file(str(audit_path))
            print(f"Logged key player audit trail to: {audit_path}")
            
        return rankings, log

def run_graph_analysis():
    builder = CriminalNetworkBuilder()
    graph = builder.build_from_mock_data()
    print(f"Graph constructed with {graph.number_of_nodes()} nodes and {graph.number_of_edges()} edges.")
    
    key_players, log = builder.log_analysis()
    print("\n--- Key Influencers / Centrality Analysis ---")
    for player in key_players:
        print(f"Name: {player['node_id']:<20} Role: {player['role']:<15} Betweenness: {player['betweenness_centrality']:<8} Degree: {player['degree_centrality']}")

    if log and hasattr(log, "verify_integrity"):
        print(f"\nAudit Log Integrity Verification: {log.verify_integrity()}")

if __name__ == "__main__":
    run_graph_analysis()

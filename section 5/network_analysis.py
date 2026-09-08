import networkx as nx
from audit_log import AuditLog

def compute_degree_centrality(G: nx.Graph) -> dict:
    return nx.degree_centrality(G)

def compute_betweenness_centrality(G: nx.Graph) -> dict:
    return nx.betweenness_centrality(G, normalized=True)

def get_key_players(G: nx.Graph, top_n: int = 10) -> list[dict]:
    degree = compute_degree_centrality(G)
    betweenness = compute_betweenness_centrality(G)
    
    results = []
    for node in G.nodes():
        results.append({
            "node_id": str(node),
            "degree_centrality": round(degree.get(node, 0), 4),
            "betweenness_centrality": round(betweenness.get(node, 0), 4)
        })
    results.sort(key=lambda r: (r["betweenness_centrality"], r["degree_centrality"]), reverse=True)
    return results[:top_n]

def run_analysis_and_log(G: nx.Graph, audit_log_path: str = "audit_log.json"):
    log = AuditLog()
    key_players = get_key_players(G)
    for player in key_players:
        if player["betweenness_centrality"] > 0.1 or player["degree_centrality"] > 0.3:
            log.add_entry("key_player_flagged", player)
    log.save_to_file(audit_log_path)
    return key_players, log

if __name__ == "__main__":
    G = nx.Graph()
    G.add_edges_from([("Suspect_1", "Phone_101"), ("Phone_101", "Suspect_2")])
    players, audit = run_analysis_and_log(G)
    print("Test run successful. Integrity status:", audit.verify_integrity())
import json
import os
import sys
from pathlib import Path
import streamlit as st
import streamlit.components.v1 as components

# Add section3 and section 5 to sys.path
REPO_ROOT = Path(__file__).resolve().parent
SECTION3_PATH = REPO_ROOT / "section3"
SECTION5_PATH = REPO_ROOT / "section 5"
if str(SECTION3_PATH) not in sys.path:
    sys.path.append(str(SECTION3_PATH))
if str(SECTION5_PATH) not in sys.path:
    sys.path.append(str(SECTION5_PATH))

from spacy_ner import EntityExtractor
from graph_builder import CriminalNetworkBuilder
from audit_log import AuditLog

# PyVis import
try:
    from pyvis.network import Network
    PYVIS_AVAILABLE = True
except ImportError:
    PYVIS_AVAILABLE = False

# Page Configuration
st.set_page_config(
    page_title="GTrace | AI Criminal Network Analysis",
    page_icon="🕸️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS Styling for Premium Dashboard
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap');
    
    html, body, [class*="css"] {
        font-family: 'Inter', sans-serif;
    }
    
    .main-header {
        background: linear-gradient(135deg, #0F2027 0%, #203A43 50%, #2C5364 100%);
        padding: 1.8rem;
        border-radius: 12px;
        color: white;
        margin-bottom: 1.5rem;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
    }
    
    .main-header h1 {
        font-size: 2.2rem;
        font-weight: 700;
        margin: 0;
        background: linear-gradient(90deg, #00C9FF 0%, #92FE9D 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
    }
    
    .metric-card {
        background-color: #1A1F2C;
        border: 1px solid #2D3748;
        border-radius: 10px;
        padding: 1.2rem;
        text-align: center;
        box-shadow: 0 4px 10px rgba(0,0,0,0.15);
    }
    
    .metric-card .val {
        font-size: 2rem;
        font-weight: 700;
        color: #00C9FF;
    }
    
    .metric-card .lbl {
        font-size: 0.85rem;
        color: #A0AEC0;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }
    
    .badge-key {
        background-color: #E53E3E;
        color: white;
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 0.75rem;
        font-weight: 600;
    }
    
    .badge-associate {
        background-color: #DD6B20;
        color: white;
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 0.75rem;
        font-weight: 600;
    }
    
    .badge-unrelated {
        background-color: #718096;
        color: white;
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 0.75rem;
        font-weight: 600;
    }
</style>
""", unsafe_allow_html=True)

@st.cache_data
def load_mock_dataset():
    data_file = REPO_ROOT / "section 2" / "data" / "mock_data.json"
    if not data_file.exists():
        st.error(f"Mock data not found at {data_file}. Please run gtrace_faker.py first.")
        return None
    with open(data_file, "r", encoding="utf-8") as f:
        return json.load(f)

def render_pyvis_graph(graph, selected_edge_types, min_weight):
    """Generate PyVis HTML string for interactive graph visualization."""
    net = Network(height="600px", width="100%", bgcolor="#0E1117", font_color="#FFFFFF")
    
    # Configure physics
    net.force_atlas_2based(gravity=-50, central_gravity=0.01, spring_length=100, spring_strength=0.08)
    
    # Calculate degree & betweenness centrality for scaling
    import networkx as nx
    bet_cent = nx.betweenness_centrality(graph)
    
    # Filter edges
    filtered_edges = []
    for u, v, data in graph.edges(data=True):
        edge_weight = data.get("weight", 1.0)
        types = data.get("edge_types", [])
        
        if edge_weight >= min_weight and any(t in selected_edge_types for t in types):
            filtered_edges.append((u, v, data))

    # Add active nodes
    active_nodes = set()
    for u, v, _ in filtered_edges:
        active_nodes.add(u)
        active_nodes.add(v)
        
    for node in active_nodes:
        node_attr = graph.nodes[node]
        role = node_attr.get("role", "Unknown")
        
        # Determine node color & size
        centrality = bet_cent.get(node, 0.05)
        size = 15 + (centrality * 60)
        
        if role == "Key Person":
            color = "#FF4B4B"  # Red
        elif role == "Associate":
            color = "#FFA500"  # Orange
        else:
            color = "#1E90FF"  # Blue
            
        title_text = f"<b>{node}</b><br>Role: {role}<br>Betweenness Centrality: {centrality:.3f}<br>City: {node_attr.get('city', 'N/A')}"
        net.add_node(node, label=node, title=title_text, color=color, size=size)

    # Add active edges
    for u, v, data in filtered_edges:
        types_str = ", ".join(data.get("edge_types", []))
        weight = data.get("weight", 1.0)
        title_edge = f"Connection: {types_str}<br>Weight: {weight:.1f}"
        
        net.add_edge(u, v, title=title_edge, value=weight, color="#4A5568")

    # Generate HTML
    temp_html = REPO_ROOT / "temp_graph.html"
    net.save_graph(str(temp_html))
    with open(temp_html, "r", encoding="utf-8") as f:
        html_code = f.read()
    if temp_html.exists():
        os.remove(temp_html)
    return html_code

def main():
    # Header Banner
    st.markdown("""
    <div class="main-header">
        <h1>GTrace :: AI-Powered Criminal Network Analysis</h1>
        <p style="margin-top:5px; color:#A0AEC0; margin-bottom:0;">
            National Crime Records Bureau (NCRB) & Women Safety Division | Problem Statement 26189
        </p>
    </div>
    """, unsafe_allow_html=True)

    dataset = load_mock_dataset()
    if not dataset:
        st.stop()

    # Sidebar Navigation & Filters
    st.sidebar.title("🔍 Navigation & Filters")
    nav = st.sidebar.radio("View Module", [
        "🌐 Interactive Network Graph",
        "🎯 Key Influencer Analysis",
        "📄 Document & Entity Extraction",
        "📞 CDR & Financial Intelligence",
        "🛡️ Hash-Chain Audit Log"
    ])

    st.sidebar.markdown("---")
    st.sidebar.subheader("⚙️ Graph Filters")
    
    edge_type_options = ["co_occurrence", "cdr_call", "financial_transaction", "shared_vehicle", "shared_location"]
    selected_edge_types = st.sidebar.multiselect(
        "Edge Relationship Types",
        edge_type_options,
        default=edge_type_options
    )
    
    min_weight = st.sidebar.slider("Minimum Edge Weight", 0.5, 5.0, 1.0, 0.5)

    # Build Graph
    builder = CriminalNetworkBuilder()
    graph = builder.build_from_mock_data()

    # Metrics Summary Row
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.markdown(f"""
        <div class="metric-card">
            <div class="val">{len(dataset.get('people', []))}</div>
            <div class="lbl">Tracked Individuals</div>
        </div>
        """, unsafe_allow_html=True)
    with col2:
        st.markdown(f"""
        <div class="metric-card">
            <div class="val">{len(dataset.get('documents', []))}</div>
            <div class="lbl">Crime Intelligence Reports</div>
        </div>
        """, unsafe_allow_html=True)
    with col3:
        st.markdown(f"""
        <div class="metric-card">
            <div class="val">{len(dataset.get('cdr_records', []))}</div>
            <div class="lbl">Call Detail Records</div>
        </div>
        """, unsafe_allow_html=True)
    with col4:
        st.markdown(f"""
        <div class="metric-card">
            <div class="val">{len(dataset.get('financial_transactions', []))}</div>
            <div class="lbl">Financial Transactions</div>
        </div>
        """, unsafe_allow_html=True)

    st.markdown("<br>", unsafe_allow_html=True)

    # 1. Interactive Network Graph Tab
    if nav == "🌐 Interactive Network Graph":
        st.subheader("🕸️ Multi-Relational Network Graph")
        st.info("💡 **Interactive Guide**: Nodes represent suspects/entities. Red nodes indicate identified key influencers. Hover over nodes and edges to inspect centralities and interaction logs.")
        
        if PYVIS_AVAILABLE:
            html_graph = render_pyvis_graph(graph, selected_edge_types, min_weight)
            components.html(html_graph, height=620, scrolling=False)
        else:
            st.warning("PyVis is not installed. Installing pyvis will enable 3D interactive force-directed graph rendering.")

    # 2. Key Influencer Analysis Tab
    elif nav == "🎯 Key Influencer Analysis":
        st.subheader("🎯 Key Player Identification & Centrality Metrics")
        st.write("Automatically extracts key influencers using Betweenness, Degree, and Eigenvector Centralities.")
        
        key_players, log = builder.log_analysis()
        
        st.dataframe(
            key_players,
            column_config={
                "node_id": "Individual / Suspect Name",
                "role": "Assigned Network Role",
                "betweenness_centrality": st.column_config.NumberColumn("Betweenness Centrality (Bridge Metric)", format="%.4f"),
                "degree_centrality": st.column_config.NumberColumn("Degree Centrality (Connection Scale)", format="%.4f"),
                "closeness_centrality": st.column_config.NumberColumn("Closeness Centrality", format="%.4f"),
                "eigenvector_centrality": st.column_config.NumberColumn("Eigenvector Centrality", format="%.4f")
            },
            use_container_width=True
        )

        st.markdown("### 🚨 High-Priority Network Bridges (Key Influencers)")
        top_suspect = key_players[0] if key_players else None
        if top_suspect:
            st.error(f"⚠️ **Primary Network Hub Detected**: **{top_suspect['node_id']}** (Role: {top_suspect['role']}) has the highest Betweenness Centrality ({top_suspect['betweenness_centrality']}). This individual acts as the main bridge controlling communications and flow between sub-clusters.")

    # 3. Document & Entity Extraction Tab
    elif nav == "📄 Document & Entity Extraction":
        st.subheader("📄 Intelligence Reports & spaCy NER Entity Extraction")
        
        extractor = EntityExtractor()
        extracted_docs = extractor.process_dataset(dataset)
        
        doc_titles = [f"{d['doc_id']} - {d['type']} ({d['location']}, {d['date']})" for d in extracted_docs]
        selected_doc_idx = st.selectbox("Select Intelligence Report", range(len(doc_titles)), format_func=lambda x: doc_titles[x])
        
        doc = extracted_docs[selected_doc_idx]
        
        c1, c2 = st.columns([1.2, 1])
        with c1:
            st.markdown("#### 📝 Raw Document Content")
            st.text_area("Report Text", doc["raw_text"], height=180, disabled=True)
            
        with c2:
            st.markdown("#### 🏷️ Extracted Entities (spaCy NER + Regex)")
            entities = doc["entities"]
            if entities:
                for ent in entities:
                    st.write(f"- **{ent['text']}** — `{ent['label']}`")
            else:
                st.write("No entities extracted.")

    # 4. CDR & Financial Intelligence Tab
    elif nav == "📞 CDR & Financial Intelligence":
        st.subheader("📞 Call Detail Records & Financial Logs")
        
        tab_cdr, tab_fin = st.tabs(["Call Records (CDRs)", "Financial Transactions"])
        
        with tab_cdr:
            st.dataframe(dataset.get("cdr_records", []), use_container_width=True)
            
        with tab_fin:
            st.dataframe(dataset.get("financial_transactions", []), use_container_width=True)

    # 5. Hash-Chain Audit Log Tab
    elif nav == "🛡️ Hash-Chain Audit Log":
        st.subheader("🛡️ Tamper-Evident Hash-Chain Audit Trail")
        st.write("Ensures forensic chain-of-custody compliance by logging all analytical findings into a SHA-256 cryptographic chain.")
        
        audit_path = REPO_ROOT / "section 5" / "audit_log.json"
        audit = AuditLog()
        if audit_path.exists():
            audit.load_from_file(str(audit_path))
        else:
            builder.log_analysis()
            if audit_path.exists():
                audit.load_from_file(str(audit_path))

        is_valid = audit.verify_integrity()
        if is_valid:
            st.success("✅ Audit Log Cryptographic Integrity Verified: Untampered")
        else:
            st.error("❌ Warning: Audit Log Integrity Verification Failed! Log tampering detected.")

        st.json(audit.entries)

if __name__ == "__main__":
    main()

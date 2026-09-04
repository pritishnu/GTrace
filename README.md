# AI-Powered Criminal Network Analysis System

## Problem statement details

- **Problem Statement ID**: 26189
- **Title**: AI-Powered Criminal Network Analysis System
- **Organization**: Ministry of Home Affairs
- **Department**: National Crime Records Bureau (NCRB), Women Safety Division
- **Category**: Software
- **Theme**: Blockchain & Cybersecurity

### Background

Criminal activities are increasingly organized and interconnected, operating through networks of associates, intermediaries, financial channels, communication links, locations, and events. Law enforcement collects large volumes of data from:

- FIRs and police reports
- Call Detail Records (CDRs)
- Financial transaction records
- Surveillance reports
- Social media intelligence
- Criminal history databases
- Intelligence agency reports

This data is fragmented, unstructured, and spread across multiple systems, making manual analysis slow, labor-intensive, and prone to missing critical connections.

### What the system should do

- Collect and process data from multiple sources
- Extract important entities: people, locations, vehicles, phone numbers, organizations
- Build relationship maps showing how entities are connected
- Identify key individuals who play influential roles in the network
- Detect suspicious patterns and unusual activities
- Provide visual and analytical insights to investigators

### Expected solution (official)

An AI-powered system that automatically analyzes structured and unstructured crime-related data to uncover criminal networks, identify key influencers, detect suspicious patterns, and provide actionable intelligence for investigators.

---

## Our solution workflow

A 5-stage pipeline, each stage built on a mature/pretrained tool so nothing needs to be trained from scratch:

1. **Data sources** — Mock FIRs, CDRs, call records, reports
2. **Text preprocessing & NER** — Extracts people, locations, orgs (spaCy)
3. **Graph construction** — Builds entity relationship graph (NetworkX)
4. **Network analysis** — Centrality scores identify key players
5. **Dashboard & visualization** — Interactive graph view (Streamlit + PyVis)

### Suggested 4-day build plan

|Day|Focus|
|---|---|
|1|Build mock dataset; get spaCy NER running on it|
|2|Build the relationship graph in NetworkX from extracted entities|
|3|Run centrality algorithms; define what counts as "suspicious"|
|4|Wire into a Streamlit dashboard with PyVis; polish the demo|

---

## Stage-by-stage details

### 1. Data sources — getting mock data

Real criminal records aren't (and shouldn't be) accessible for a hackathon — use synthetic data instead:

- **Faker library** (`pip install faker`) generates realistic fake names, cities, phone numbers — use `Faker('en_IN')` for Indian locale
- Hand-write (or use an LLM to help draft) ~15-20 short mock scenario documents (fake FIR/report snippets) with **intentionally overlapping** names, shared phone numbers, and shared locations so the graph has interesting structure to uncover
- Design a mini network on paper first: e.g. one kingpin, two lieutenants, a few associates, some red herrings — then write documents around that structure
- Optional: look at public synthetic/anonymized crime datasets (e.g. searchable on Kaggle as "synthetic crime network dataset") for inspiration on realistic FIR/CDR field formats — not for real case data

### 2. Text preprocessing & NER — spaCy setup

1. Install: `pip install spacy` then `python -m spacy download en_core_web_sm` (small pretrained English model, no training needed)
2. Load it: `import spacy` → `nlp = spacy.load("en_core_web_sm")`
3. Run it: `doc = nlp(text)` on each mock document
4. Extract entities: loop over `doc.ents`, each has `.text` and `.label_` (PERSON, GPE for locations, ORG for organizations)
5. spaCy won't catch phone numbers/vehicle plates by default — use simple regex patterns alongside it rather than training a custom NER model
6. Structure output per document, e.g.:
    
    ```python
    {"doc_id": ..., "entities": [("Ravi Kumar", "PERSON"), ("Mumbai", "GPE")]}
    ```
    

### 3. Graph construction — connecting people

Three methods, ranked by effort:

1. **Co-occurrence** (start here — simplest): if two PERSON entities appear in the same document, draw an edge between them; edge weight increases each time they co-occur
    
    ```python
    import itertoolsfrom collections import Counteredge_weights = Counter()for doc in documents:    people = [e[0] for e in doc["entities"] if e[1] == "PERSON"]    for a, b in itertools.combinations(sorted(set(people)), 2):        edge_weights[(a, b)] += 1
    ```
    
2. **Shared attributes** (adds real signal): connect people who share a phone number in a call record, appear at the same location/time, or link through the same vehicle/org — stronger and more meaningful than plain co-occurrence
3. **Dependency parsing** (optional stretch goal): use spaCy's dependency parser to extract the verb connecting two PERSON entities in a sentence (e.g. "Ravi met Suresh") as an edge label — more impressive but adds complexity; only attempt if ahead of schedule

**Recommended for the timeline**: combine methods 1 and 2. That's enough for a strong, demoable graph.

### 4. Network analysis — finding key players

- Build the graph object in NetworkX from the edge list above
- Run built-in centrality algorithms (degree centrality, betweenness centrality) to answer "who's the most connected/important node" — no custom ML needed
- This directly produces the "identify key influencers" and "detect suspicious patterns" requirements from the problem statement

### 5. Dashboard & visualization

- **Streamlit** for the app shell/interface
- **PyVis** for the interactive network graph visualization (nodes light up, connections are explorable)
- Highlight high-centrality nodes visually (color/size) so judges immediately see "these are the key players"

---

## Tools summary

|Purpose|Tool|Why|
|---|---|---|
|Mock data generation|Faker|Realistic fake names/locations/phone numbers, no real data needed|
|Entity extraction|spaCy (`en_core_web_sm`)|Pretrained NER, no training required|
|Custom entity patterns|Regex|Catches phone numbers, plates spaCy misses|
|Graph building|NetworkX|Mature graph library, built-in centrality algorithms|
|Graph visualization|PyVis|Interactive, embeddable network graphs|
|Dashboard/app|Streamlit|Fast way to wrap everything in a usable interface|

---

## Team context

- Team of 4, all starting from little/no prior experience — planning to learn as they go
- Chosen over two other shortlisted problem statements (Land Record Digitization — too hard due to multilingual handwritten OCR; Blockchain Identity/NFT platform — more infrastructure friction for total beginners)
- This problem statement was picked specifically because every stage has a mature, pretrained/plug-and-play library — no model training required anywhere in the pipeline












#hackathon 
[[hackathon]]

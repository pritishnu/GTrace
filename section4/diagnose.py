import json
import re

ROOT = "section 2/data/mock_data.json"

with open(ROOT, encoding="utf-8") as f:
    d = json.load(f)

docs = d.get("documents", [])

# ── Failure 1: Amit Verma in doc texts? ──────────────────────────────
hits = [(doc["report_id"], doc["text"]) for doc in docs if "Amit Verma" in doc["text"]]
print(f"=== Amit Verma in {len(hits)} document texts ===")
for rid, text in hits:
    print(f"  {rid}: {text[:150]}")

# ── Failure 2: Phones in doc texts? ──────────────────────────────────
STRICT = re.compile(r"(?<!\d)[6-9]\d{9}(?!\d)")
LOOSE  = re.compile(r"[6-9]\d{9}")

strict_hits = [(doc["report_id"], STRICT.findall(doc["text"])) for doc in docs]
strict_hits = [(r, m) for r, m in strict_hits if m]

loose_hits = [(doc["report_id"], LOOSE.findall(doc["text"])) for doc in docs]
loose_hits = [(r, m) for r, m in loose_hits if m]

print(f"\n=== STRICT phone regex hits in doc texts: {len(strict_hits)} docs ===")
for rid, m in strict_hits[:5]:
    print(f"  {rid}: {m}")

print(f"\n=== LOOSE phone regex hits in doc texts: {len(loose_hits)} docs ===")
for rid, m in loose_hits[:5]:
    print(f"  {rid}: {m}")

# Show a full sample doc text to see if phones are embedded
print("\n=== Sample doc text (REP-0001) ===")
for doc in docs:
    if doc["report_id"] == "REP-0001":
        print(doc["text"])
        break

# CDR structure
cdrs = d.get("cdr_records", [])
print("\n=== CDR record sample (first 2) ===")
for cdr in cdrs[:2]:
    print(json.dumps(cdr, indent=2))

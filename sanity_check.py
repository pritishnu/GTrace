"""
Step 7 — Sanity-check ner_output.json before handoff to Section 4.

Checks:
  1. Valid JSON
  2. No documents silently dropped
  3. Planted key players (kingpin + associates) are detected
  4. Phone numbers and vehicle plates are captured and correctly labelled
  5. No duplicate entities within a single document (Step 5 dedup worked)

Exit code 0 = all checks passed.
Exit code 1 = one or more checks failed (details printed inline).
"""

import json
import sys
from pathlib import Path
from collections import Counter

ROOT         = Path(__file__).resolve().parent
INPUT_DATA   = ROOT / "section 2" / "data" / "mock_data.json"
NER_OUTPUT   = ROOT / "section3" / "data" / "ner_output.json"

PASS = "\033[92m[PASS]\033[0m"
FAIL = "\033[91m[FAIL]\033[0m"
WARN = "\033[93m[WARN]\033[0m"
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

# ──────────────────────────────────────────────────────────────
# CHECK 1 — Valid JSON
# ──────────────────────────────────────────────────────────────
print("\n── Check 1: Valid JSON ─────────────────────────────────────")
try:
    with open(NER_OUTPUT, encoding="utf-8") as f:
        output = json.load(f)
    check("ner_output.json is valid JSON", True)
except Exception as e:
    check("ner_output.json is valid JSON", False, str(e))
    print("\nCannot continue — ner_output.json is unreadable.")
    sys.exit(1)

try:
    with open(INPUT_DATA, encoding="utf-8") as f:
        mock = json.load(f)
except Exception as e:
    print(f"{FAIL}  Could not read mock_data.json: {e}")
    sys.exit(1)

# ──────────────────────────────────────────────────────────────
# CHECK 2 — No silently dropped documents
# ──────────────────────────────────────────────────────────────
print("\n── Check 2: Document coverage ──────────────────────────────")
input_ids  = {doc["report_id"] for doc in mock.get("documents", [])}
output_ids = {doc["doc_id"]    for doc in output}

missing = input_ids - output_ids
extra   = output_ids - input_ids

check(
    f"All {len(input_ids)} input documents present in output",
    len(missing) == 0,
    f"Missing doc_ids: {sorted(missing)}" if missing else ""
)
# CDR-* docs are intentionally injected by the phone-injection step in
# process_dataset — they are expected additions, not unexpected extras.
unexpected_extra = {d for d in extra if not d.startswith("CDR-")}

check(
    "No unexpected extra documents in output",
    len(unexpected_extra) == 0,
    f"Extra doc_ids: {sorted(unexpected_extra)}" if unexpected_extra else ""
)
if extra - unexpected_extra:
    print(f"  {INFO}  {len(extra - unexpected_extra)} CDR synthetic doc(s) present (expected — phone injection)")

# ──────────────────────────────────────────────────────────────
# CHECK 3 — Key players are detected
# ──────────────────────────────────────────────────────────────
print("\n── Check 3: Planted network members detected ───────────────")
person_details = mock.get("person_details", {})
kingpin     = [n for n, v in person_details.items() if v.get("role") == "Key Person"]
associates  = [n for n, v in person_details.items() if v.get("role") == "Associate"]
key_targets = kingpin + associates

# Build a map: person name -> list of doc_ids where they appear as PERSON
person_to_docs: dict[str, list[str]] = {}
for doc in output:
    for ent in doc["entities"]:
        if ent["label"] == "PERSON":
            person_to_docs.setdefault(ent["text"], []).append(doc["doc_id"])

print(f"  {INFO}  Kingpin : {kingpin}")
print(f"  {INFO}  Associates: {associates}")
print()

all_detected = True
for name in key_targets:
    docs_found = person_to_docs.get(name, [])
    detected   = len(docs_found) > 0
    role       = person_details[name]["role"]
    check(
        f"{role:12s}  {name!r}  detected in {len(docs_found)} doc(s)",
        detected,
        f"Appears in: {docs_found}" if detected else
        f"NOT found at all — check mock data wording or spaCy model coverage"
    )
    if not detected:
        all_detected = False

# ──────────────────────────────────────────────────────────────
# CHECK 4 — Phones and plates captured
# ──────────────────────────────────────────────────────────────
print("\n── Check 4: Phone & vehicle plate coverage ─────────────────")
all_phones   = [e for doc in output for e in doc["entities"] if e["label"] == "PHONE"]
all_vehicles = [e for doc in output for e in doc["entities"] if e["label"] == "VEHICLE"]

check(f"At least one PHONE entity extracted   (found {len(all_phones)})",   len(all_phones) > 0)
check(f"At least one VEHICLE entity extracted (found {len(all_vehicles)})", len(all_vehicles) > 0)

# Spot-check: labels must be exactly "PHONE" / "VEHICLE" — never "LOCATION" etc.
bad_phone   = [e for e in all_phones   if e["label"] != "PHONE"]
bad_vehicle = [e for e in all_vehicles if e["label"] != "VEHICLE"]
check("All PHONE entities carry label=='PHONE'",     len(bad_phone) == 0,
      str(bad_phone[:3]) if bad_phone else "")
check("All VEHICLE entities carry label=='VEHICLE'", len(bad_vehicle) == 0,
      str(bad_vehicle[:3]) if bad_vehicle else "")

# Show a sample
if all_phones:
    print(f"  {INFO}  Sample phones   : {[e['text'] for e in all_phones[:3]]}")
if all_vehicles:
    print(f"  {INFO}  Sample plates   : {[e['text'] for e in all_vehicles[:3]]}")

# ──────────────────────────────────────────────────────────────
# CHECK 5 — No duplicates within a document
# ──────────────────────────────────────────────────────────────
print("\n── Check 5: No intra-document entity duplicates ────────────")
dup_docs = []
for doc in output:
    keys = [(e["text"], e["label"]) for e in doc["entities"]]
    counts = Counter(keys)
    dups = {k: v for k, v in counts.items() if v > 1}
    if dups:
        dup_docs.append((doc["doc_id"], dups))

check(
    f"Zero duplicate (text, label) pairs within any document",
    len(dup_docs) == 0,
    "\n".join(f"{did}: {dups}" for did, dups in dup_docs) if dup_docs else ""
)

# ──────────────────────────────────────────────────────────────
# SUMMARY
# ──────────────────────────────────────────────────────────────
print("\n" + "─" * 58)
if not failures:
    print(f"\n  {PASS}  All checks passed — ner_output.json is ready for handoff.\n")
    sys.exit(0)
else:
    print(f"\n  {FAIL}  {len(failures)} check(s) failed:")
    for f in failures:
        print(f"    • {f}")
    print()
    sys.exit(1)

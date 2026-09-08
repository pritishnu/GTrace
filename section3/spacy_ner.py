import json
import os
import re
from pathlib import Path

# Try importing spacy gracefully
try:
    import spacy
    SPACY_AVAILABLE = True
except ImportError:
    SPACY_AVAILABLE = False
    print("Warning: 'spacy' module not found. Falling back to regex entity extraction.")

# ---------------------------------------------------------------------------
# Regex patterns — verified against actual Faker output in mock_data.json
#
# PHONE  : Indian 10-digit mobile numbers that start with 6-9.
#          The tighter anchor avoids false positives on numeric runs inside
#          longer strings (e.g. transaction IDs, plate digit blocks).
#          Note: phones appear in CDR structured fields, not raw document
#          text — but the pattern is kept here for real-world doc ingestion.
#
# VEHICLE: Indian registration format verified against Faker samples:
#            WB02AB4521 / WB06CD7832 / WB12EF2198 / WB24GH6610 / WB10JK9034
#          Pattern:  2 state-code letters | 2 district digits |
#                    1-2 series letters   | 4 serial digits
#          No IGNORECASE — plates appear uppercase in doc text; normalise
#          to upper() in code anyway to be safe.
# ---------------------------------------------------------------------------
REGEX_PHONE = re.compile(
    r"(?<![\d])"   # not preceded by a digit (avoid mid-number matches)
    r"[6-9]\d{9}"
    r"(?![\d])"    # not followed by a digit
)
REGEX_VEHICLE = re.compile(
    r"\b[A-Z]{2}\d{2}[A-Z]{1,2}\d{4}\b"
)

# ---------------------------------------------------------------------------
# Step 5 — Clean, normalise, merge fragments, and deduplicate
# ---------------------------------------------------------------------------
import string
from collections import Counter

# Characters stripped from both ends of an entity text span.
# Hyphens are kept because they appear in compound names (e.g. "Singh-Roy").
_STRIP_CHARS = string.punctuation.replace("-", "") + " "


def _normalise_entity_text(text: str, label: str) -> str:
    """
    Clean a single raw entity string:
    - Strip surrounding punctuation and whitespace.
    - Title-case PERSON names  ("ramesh kumar" -> "Ramesh Kumar").
    - Upper-case VEHICLE plates and PHONE numbers (already done upstream,
      but this is the single source of truth).
    - Leave LOCATION / ORGANIZATION casing as spaCy returned it.
    """
    text = text.strip(_STRIP_CHARS)
    if label == "PERSON":
        # title() handles multi-word names correctly and fixes all-lowercase
        # fragments that spaCy occasionally emits.
        text = text.title()
    elif label in ("VEHICLE", "PHONE"):
        text = text.upper()
    return text


def _merge_fragmented_names(entities: list[dict]) -> list[dict]:
    """
    Detect and absorb spaCy name-split fragments.

    spaCy sometimes emits both a full name and one of its component tokens
    as separate PERSON entities within the same document, e.g.:

        "Arjun Malhotra" (count=2)  AND  "Arjun" (count=1)

    The fragment "Arjun" is a proper sub-sequence of the full name, so it
    carries no independent information.  This function:
      1. Sorts PERSON entities longest-first.
      2. For each shorter PERSON, checks whether ALL of its words appear
         as a *contiguous* word-subsequence inside any longer PERSON.
      3. If yes, adds the fragment's count to the longer name and drops it.

    Non-PERSON labels are passed through unchanged.
    """
    persons = [e for e in entities if e["label"] == "PERSON"]
    others  = [e for e in entities if e["label"] != "PERSON"]

    # Sort by descending word-count so we always compare short against long
    persons.sort(key=lambda e: len(e["text"].split()), reverse=True)

    absorbed: set[str] = set()   # texts already merged away

    for i, full in enumerate(persons):
        full_words = full["text"].split()  # e.g. ["Arjun", "Malhotra"]
        for j, fragment in enumerate(persons):
            if i == j or fragment["text"] in absorbed:
                continue
            frag_words = fragment["text"].split()
            if len(frag_words) >= len(full_words):
                continue  # fragment is not shorter
            # Contiguous sub-sequence check
            n, m = len(full_words), len(frag_words)
            is_sub = any(
                full_words[k:k + m] == frag_words
                for k in range(n - m + 1)
            )
            if is_sub:
                full["count"] = full.get("count", 1) + fragment.get("count", 1)
                absorbed.add(fragment["text"])

    merged_persons = [e for e in persons if e["text"] not in absorbed]
    return merged_persons + others


def _clean_and_deduplicate(raw_entities: list[dict]) -> list[dict]:
    """
    Full Step-5 pipeline applied to the raw entity list from one document:

    1. Normalise each entity text (casing, punctuation).
    2. Count occurrences with Counter — entities that are identical after
       normalisation collapse into one entry with a ``count`` field.
    3. Merge spaCy name fragments into their full-name counterpart.

    The returned dicts have the schema:
        {"text": str, "label": str, "count": int}
    Span offsets (start/end) are dropped — they become meaningless after
    deduplication and downstream consumers don't need them.
    """
    # 1. Normalise
    normalised = [
        (_normalise_entity_text(e["text"], e["label"]), e["label"])
        for e in raw_entities
        if e.get("text", "").strip()   # skip empty spans
    ]

    # 2. Count
    counts = Counter(normalised)   # (text, label) -> int
    deduped = [
        {"text": text, "label": label, "count": count}
        for (text, label), count in counts.most_common()  # highest-count first
    ]

    # 3. Merge fragments (PERSON only)
    return _merge_fragmented_names(deduped)


class EntityExtractor:
    """
    NLP & Regex Entity Extraction Engine for Crime Reports.
    Extracts PERSON, LOCATION (GPE), ORGANIZATION (ORG), PHONE, and VEHICLE entities.
    """
    def __init__(self, model_name: str = "en_core_web_sm"):
        self.nlp = None
        if SPACY_AVAILABLE:
            try:
                self.nlp = spacy.load(model_name)
                print(f"Loaded spaCy model: '{model_name}'")
            except Exception as e:
                print(f"Could not load spaCy model '{model_name}': {e}. Using regex fallback for entities.")

    def extract_regex_entities(self, text: str) -> list[dict]:
        """Extract phone numbers and vehicle plates using regular expressions."""
        entities = []
        
        # Phone numbers
        for match in REGEX_PHONE.finditer(text):
            entities.append({
                "text": match.group(0),
                "label": "PHONE",
                "start": match.start(),
                "end": match.end()
            })
            
        # Vehicle registration plates
        for match in REGEX_VEHICLE.finditer(text):
            entities.append({
                "text": match.group(0).upper(),
                "label": "VEHICLE",
                "start": match.start(),
                "end": match.end()
            })
            
        return entities

    def process_document(self, doc_item: dict, known_people: list[str] = None) -> dict:
        """
        Process a single document object containing 'text' and metadata.
        Returns extracted entities combining spaCy NER and custom Regex rules.
        """
        text = doc_item.get("text", "")
        doc_id = doc_item.get("report_id") or doc_item.get("doc_id") or "UNKNOWN"
        case_id = doc_item.get("case_id", "")
        doc_type = doc_item.get("type", "Report")
        
        extracted_entities = []
        seen_spans = set()

        # 1. spaCy NER Extraction
        if self.nlp:
            spacy_doc = self.nlp(text)
            for ent in spacy_doc.ents:
                label = ent.label_
                # Standardize labels
                if label in ("PERSON", "PER"):
                    norm_label = "PERSON"
                elif label in ("GPE", "LOC"):
                    norm_label = "GPE"
                elif label in ("ORG", "ORGANIZATION"):
                    norm_label = "ORGANIZATION"
                else:
                    continue

                span_key = (ent.start_char, ent.end_char)
                seen_spans.add(span_key)
                extracted_entities.append({
                    "text": ent.text.strip(),
                    "label": norm_label,
                    "start": ent.start_char,
                    "end": ent.end_char
                })
        else:
            # Fallback PERSON detection if spaCy model is unavailable
            if known_people:
                for person in known_people:
                    pattern = re.compile(re.escape(person), re.IGNORECASE)
                    for match in pattern.finditer(text):
                        extracted_entities.append({
                            "text": match.group(0),
                            "label": "PERSON",
                            "start": match.start(),
                            "end": match.end()
                        })

        # 1b. Known-person sweep — guarantees planted names are never silently
        #     dropped when spaCy mis-tags or skips them entirely.
        #     Runs regardless of whether spaCy is available.
        if known_people:
            # Collect texts spaCy already found so we don't double-count.
            already_found = {e["text"].lower() for e in extracted_entities if e["label"] == "PERSON"}
            for person in known_people:
                if person.lower() not in already_found and person in text:
                    pattern = re.compile(re.escape(person), re.IGNORECASE)
                    for match in pattern.finditer(text):
                        extracted_entities.append({
                            "text": match.group(0),
                            "label": "PERSON",
                            "start": match.start(),
                            "end": match.end(),
                        })

        # 2. Custom Regex Extraction (Phones & Vehicles)
        regex_ents = self.extract_regex_entities(text)
        for r_ent in regex_ents:
            span_key = (r_ent["start"], r_ent["end"])
            if span_key not in seen_spans:
                seen_spans.add(span_key)
                extracted_entities.append(r_ent)

        # 3. Clean, deduplicate, and merge split names (Step 5)
        cleaned_entities = _clean_and_deduplicate(extracted_entities)

        return {
            "doc_id": doc_id,
            "case_id": case_id,
            "type": doc_type,
            "location": doc_item.get("location", ""),
            "date": doc_item.get("date", ""),
            "raw_text": text,
            "entities": cleaned_entities,
        }

    def process_dataset(self, data: dict) -> list[dict]:
        """Process all documents in a dataset dictionary."""
        documents = data.get("documents", [])

        # Build list of known names for fallback / known-person sweep
        known_people = []
        if "people" in data:
            known_people = [p["name"] for p in data["people"] if "name" in p]
        elif "person_details" in data:
            known_people = list(data["person_details"].keys())

        processed_results = []
        for doc in documents:
            result = self.process_document(doc, known_people=known_people)
            processed_results.append(result)

        # ── CDR phone injection ──────────────────────────────────────────
        # Phone numbers live in structured CDR fields (caller_phone /
        # receiver_phone), not in free-text document bodies.  We synthesise
        # one virtual document per CDR record so that:
        #   a) PHONE entities appear in the NER output for Section 4.
        #   b) Two people sharing a phone call become shared-attribute
        #      candidates (same PHONE text across the caller's and receiver's
        #      virtual docs).
        # These synthetic docs use the CDR id as doc_id so they are stable
        # across runs and traceable back to the source record.
        cdr_records = data.get("cdr_records", [])
        for cdr in cdr_records:
            cdr_id         = cdr.get("cdr_id", "CDR-UNKNOWN")
            caller         = cdr.get("caller", "")
            receiver       = cdr.get("receiver", "")
            caller_phone   = str(cdr.get("caller_phone", "")).strip()
            receiver_phone = str(cdr.get("receiver_phone", "")).strip()

            entities: list[dict] = []
            # People involved in the call
            for name in (caller, receiver):
                if name:
                    entities.append({"text": name, "label": "PERSON", "start": 0, "end": 0})
            # Phone numbers — validate with REGEX_PHONE before emitting
            for phone in (caller_phone, receiver_phone):
                if phone and REGEX_PHONE.fullmatch(phone):
                    entities.append({"text": phone, "label": "PHONE", "start": 0, "end": 0})

            if not entities:
                continue

            cleaned = _clean_and_deduplicate(entities)
            processed_results.append({
                "doc_id":   cdr_id,
                "entities": cleaned,
            })

        return processed_results

def run_pipeline(input_path: str = None, output_path: str = None):
    """Run full NER extraction on mock dataset and save output."""
    repo_root = Path(__file__).resolve().parent.parent
    
    if input_path is None:
        input_path = repo_root / "section 2" / "data" / "mock_data.json"
    else:
        input_path = Path(input_path)
        
    if output_path is None:
        out_dir = repo_root / "section3" / "data"
        out_dir.mkdir(parents=True, exist_ok=True)
        output_path = out_dir / "ner_output.json"
    else:
        output_path = Path(output_path)

    if not input_path.exists():
        raise FileNotFoundError(f"Input mock dataset file not found at: {input_path}")

    print(f"Reading dataset from: {input_path}")
    with open(input_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    extractor = EntityExtractor()
    results = extractor.process_dataset(data)

    print(f"Extracted entities across {len(results)} documents.")

    # ---------------------------------------------------------------------------
    # Step 6 — Interface contract with Section 4 (graph construction).
    # Output is a bare list; each item exposes only doc_id + entities so the
    # shape stays stable regardless of internal processing fields added later.
    # Section 4 uses this to build:
    #   • co-occurrence edges  — entities sharing the same doc_id
    #   • shared-attribute edges — same text+PHONE or text+VEHICLE across docs
    # ---------------------------------------------------------------------------
    contracted_output = [
        {
            "doc_id": doc["doc_id"],
            "entities": doc["entities"],   # [{"text":…,"label":…,"count":…}]
        }
        for doc in results
    ]

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(contracted_output, f, indent=2, ensure_ascii=False)

    print(f"NER Extraction output saved successfully to: {output_path}")
    return results

if __name__ == "__main__":
    run_pipeline()


def _audit_patterns(data_path: str | None = None) -> None:
    """
    Diagnostic helper — call this directly to spot-check that the regex
    patterns match exactly what Faker generates.

    Usage:
        python spacy_ner.py  (runs run_pipeline)
        python -c "from spacy_ner import _audit_patterns; _audit_patterns()"
    """
    from pathlib import Path
    root = Path(__file__).resolve().parent.parent
    path = Path(data_path) if data_path else root / "section 2" / "data" / "mock_data.json"
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    docs = data.get("documents", [])
    print(f"\n{'='*60}")
    print(f"Pattern audit over {len(docs)} documents")
    print(f"{'='*60}")

    total_phones, total_plates = 0, 0
    for doc in docs:
        text = doc["text"]
        phones = REGEX_PHONE.findall(text)
        plates = REGEX_VEHICLE.findall(text)
        if phones or plates:
            print(f"\n[{doc['report_id']}] {text}")
            if phones:
                print(f"  PHONE hits  : {phones}")
                total_phones += len(phones)
            if plates:
                print(f"  VEHICLE hits: {plates}")
                total_plates += len(plates)

    # Also scan the CDR phone fields to verify format matches
    cdrs = data.get("cdr_records", [])
    cdr_phones_missed = []
    for cdr in cdrs[:5]:  # spot-check first 5
        for field in ("caller_phone", "receiver_phone"):
            val = str(cdr.get(field, ""))
            if not REGEX_PHONE.fullmatch(val):
                cdr_phones_missed.append(val)

    print(f"\n{'='*60}")
    print(f"Total PHONE  matches in doc texts : {total_phones}")
    print(f"Total VEHICLE matches in doc texts: {total_plates}")
    if cdr_phones_missed:
        print(f"[WARN] CDR phone values NOT matched by pattern: {cdr_phones_missed}")
    else:
        print("[OK]  All sampled CDR phone values matched by REGEX_PHONE")
    print(f"{'='*60}\n")

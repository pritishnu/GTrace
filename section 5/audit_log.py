import hashlib
import json
import time

def hash_entry(entry: dict) -> str:
    """Hash a canonical JSON representation of the entry (excluding its own hash field)."""
    payload_dict = entry.copy()
    payload_dict.pop("entry_hash", None)
    payload = json.dumps(payload_dict, sort_keys=True).encode()
    return hashlib.sha256(payload).hexdigest()

class AuditLog:
    def __init__(self):
        self.entries = []

    def add_entry(self, event_type: str, details: dict):
        """Append a new event block to the tamper-evident hash-chain."""
        prev_hash = self.entries[-1]["entry_hash"] if self.entries else "0" * 64
        entry = {
            "index": len(self.entries),
            "timestamp": time.time(),
            "event_type": event_type,
            "details": details,
            "prev_hash": prev_hash,
        }
        entry["entry_hash"] = hash_entry(entry)
        self.entries.append(entry)
        return entry

    def verify_integrity(self) -> bool:
        """Returns True if the chain is untampered, False if anything was altered."""
        for i, entry in enumerate(self.entries):
            expected_prev = self.entries[i - 1]["entry_hash"] if i > 0 else "0" * 64
            if entry["prev_hash"] != expected_prev:
                return False
            if hash_entry(entry) != entry["entry_hash"]:
                return False
        return True

    def save_to_file(self, path: str = "audit_log.json"):
        with open(path, "w") as f:
            json.dump(self.entries, f, indent=2)

    def load_from_file(self, path: str = "audit_log.json"):
        with open(path, "r") as f:
            self.entries = json.load(f)
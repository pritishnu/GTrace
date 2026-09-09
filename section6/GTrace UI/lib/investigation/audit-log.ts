/**
 * audit-log.ts
 * Types + fetch + real SHA-256 hash-chain verifier.
 *
 * Hash algorithm (mirrors section5/audit_log.py):
 *   SHA-256( JSON.stringify(entry_without_entry_hash, keys_sorted) )
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuditEntryDetails {
  node_id: string;
  role?: string;
  degree_centrality?: number;
  betweenness_centrality?: number;
  closeness_centrality?: number;
  eigenvector_centrality?: number;
  degree?: number;
  [key: string]: unknown;
}

export interface PipelineAuditEntry {
  index: number;
  timestamp: number;   // Unix float
  event_type: string;
  details: AuditEntryDetails;
  prev_hash: string;
  entry_hash: string;
}

export interface IntegrityResult {
  ok: boolean;
  brokenIndex: number | null; // entry index where chain first breaks
}

// ─── Fetch ────────────────────────────────────────────────────────────────────

export async function fetchAuditLog(): Promise<PipelineAuditEntry[]> {
  const res = await fetch("/data/audit_log.json", { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load audit_log.json: ${res.status}`);
  return res.json() as Promise<PipelineAuditEntry[]>;
}

// ─── SHA-256 via Web Crypto ───────────────────────────────────────────────────

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Sort object keys recursively and produce a canonical JSON string.
 * Mirrors Python's json.dumps(..., sort_keys=True).
 */
function canonicalJson(obj: unknown): string {
  if (obj === null || typeof obj !== "object") return JSON.stringify(obj);
  if (Array.isArray(obj)) return `[${obj.map(canonicalJson).join(",")}]`;
  const sorted = Object.keys(obj as Record<string, unknown>)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${canonicalJson((obj as Record<string, unknown>)[k])}`);
  return `{${sorted.join(",")}}`;
}

/**
 * Recomputes the hash of an entry the same way audit_log.py does:
 *   SHA-256( canonical_json(entry_without_entry_hash) )
 */
async function computeEntryHash(entry: PipelineAuditEntry): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { entry_hash: _omit, ...rest } = entry;
  return sha256(canonicalJson(rest));
}

// ─── Chain verification ───────────────────────────────────────────────────────

export async function verifyChain(entries: PipelineAuditEntry[]): Promise<IntegrityResult> {
  const GENESIS_HASH = "0".repeat(64);

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];

    // 1. Check prev_hash linkage
    const expectedPrev = i === 0 ? GENESIS_HASH : entries[i - 1].entry_hash;
    if (entry.prev_hash !== expectedPrev) {
      return { ok: false, brokenIndex: i };
    }

    // 2. Recompute and compare entry_hash
    const recomputed = await computeEntryHash(entry);
    if (recomputed !== entry.entry_hash) {
      return { ok: false, brokenIndex: i };
    }
  }

  return { ok: true, brokenIndex: null };
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

export function formatTimestamp(ts: number): string {
  return new Date(ts * 1000).toLocaleString("en-IN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function truncateHash(h: string): string {
  return `${h.slice(0, 8)}…${h.slice(-6)}`;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  hash: string;
}

export const auditEntries: AuditEntry[] = [
  { id: "a-01", timestamp: "2024-05-30 09:12:04", actor: "INV-2291", action: "Case file opened: OP-KESTREL", hash: "9f2c8a71e4b03d5f6a1c92e7b8d4f013a6c5e2d97b4f8a1c3e6d0b5f7a2c9e14" },
  { id: "a-02", timestamp: "2024-05-30 09:14:37", actor: "INV-2291", action: "Ingested CDR batch #88213 (1,204 rows)", hash: "3e7a1d09c5b28f4e6d2a7c1b9f0e4d3a8c6b5f2e1d7a9c4b0f3e6d2a8c5b1f7e" },
  { id: "a-03", timestamp: "2024-05-30 09:21:15", actor: "SYSTEM", action: "Identified Key Player: Vikram 'Raja' Sethi", hash: "b4d8f1a6c2e7930d5b1f4a8c6e2d7b3f9a0c5e1d8b4f7a2c6e3d9b0f5a1c8e4d" },
  { id: "a-04", timestamp: "2024-05-30 09:22:48", actor: "INV-2291", action: "Flagged Connection: Sethi – Malhotra", hash: "6c1e9b3d7f2a5c8e0d4b6f1a9c3e7d2b5f8a0c4e6d1b9f3a7c2e5d8b0f4a6c1e" },
  { id: "a-05", timestamp: "2024-05-30 09:26:02", actor: "INV-2291", action: "Flagged Connection: Qureshi – Blue Crescent Exports", hash: "e2a7c4f1b9d6e3a0c5f8b2d7e1a4c9f6b3d0e5a8c2f7b1d4e9a6c3f0b5d8e2a7" },
  { id: "a-06", timestamp: "2024-05-30 09:31:19", actor: "SYSTEM", action: "Identified Key Player: Dev Malhotra", hash: "1d5b8f3a6c9e2d7b0f4a1c8e5d2b9f6a3c0e7d4b1f8a5c2e9d6b3f0a7c4e1d8b" },
  { id: "a-07", timestamp: "2024-05-30 09:40:55", actor: "INV-2291", action: "Entity merged: +91 98201 44xxx → Sethi (subscriber match)", hash: "7f3c0e6a9d2b5f8c1e4a7d0b3f6c9e2a5d8b1f4c7e0a3d6b9f2c5e8a1d4b7f0c" },
  { id: "a-08", timestamp: "2024-05-30 10:02:11", actor: "INV-4410", action: "Flagged Connection: Naik – Apex Forex Services", hash: "a8e4b1d7f0c3a6e9b2d5f8c1a4e7b0d3f6c9a2e5b8d1f4c7a0e3b6d9f2c5a8e1" },
  { id: "a-09", timestamp: "2024-05-30 10:05:43", actor: "SYSTEM", action: "Dismissed lead: Anil Deshpande (no network path)", hash: "4c9f2e5b8a1d7c0f3e6b9a2d5c8f1e4b7a0d3c6f9e2b5a8d1c4f7e0b3a6d9c2f" },
  { id: "a-10", timestamp: "2024-05-30 10:18:27", actor: "INV-2291", action: "Report exported: OP-KESTREL_v3.pdf", hash: "d0b6e3a9c2f5d8b1e4a7c0f3d6b9e2a5c8f1d4b7e0a3c6f9d2b5e8a1c4f7d0b3" },
  { id: "a-11", timestamp: "2024-05-30 10:19:02", actor: "SYSTEM", action: "Chain integrity verified (11 entries)", hash: "f5a2d8c1b4e7f0a3d6c9b2e5f8a1d4c7b0e3f6a9d2c5b8e1f4a7d0c3b6e9f2a5" },
];

export const CHAIN_ROOT_HASH = "0000a17f3c9e2b8d5f1a4c7e0b3d6f9a2c5e8b1d4f7a0c3e6b9d2f5a8c1e4b7d";

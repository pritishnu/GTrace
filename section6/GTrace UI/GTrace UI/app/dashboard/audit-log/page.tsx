import type { Metadata } from "next";
import { AuditLogTable } from "@/components/investigator/audit-log-table";

export const metadata: Metadata = {
  title: "Audit Log — Optimus Investigator Console",
};

export default function AuditLogPage() {
  return <AuditLogTable />;
}

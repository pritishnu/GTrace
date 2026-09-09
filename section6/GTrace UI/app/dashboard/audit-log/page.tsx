import type { Metadata } from "next";
import { AuditLogTable } from "@/components/investigator/audit-log-table";

export const metadata: Metadata = {
  title: "Audit Log — GTrace Investigator Console",
};

export default function AuditLogPage() {
  return <AuditLogTable />;
}

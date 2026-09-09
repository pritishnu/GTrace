/**
 * export-report.ts
 * Exports a minimal hand-built PDF from live pipeline data.
 */
import { type ScoredNode, riskLevel } from "./centrality";
import { type PipelineAuditEntry, formatTimestamp, truncateHash } from "./audit-log";

function escapePdfText(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)").replace(/[^\x20-\x7E]/g, "?");
}

function buildPdf(lines: string[]): Blob {
  const content = [
    "BT",
    "/F1 10 Tf",
    "14 TL",
    "48 750 Td",
    ...lines.map((l) => `(${escapePdfText(l)}) Tj T*`),
    "ET",
  ].join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((obj, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((o) => {
    pdf += `${String(o).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new Blob([pdf], { type: "application/pdf" });
}

export function exportInvestigationReport(
  scoredNodes: ScoredNode[],
  auditEntries: PipelineAuditEntry[],
  integrityStatus: string,
) {
  const top = [...scoredNodes]
    .sort((a, b) => b.betweenness_centrality - a.betweenness_centrality)
    .slice(0, 12);

  const lines = [
    "GTRACE INVESTIGATOR CONSOLE - NETWORK ANALYSIS REPORT",
    "Case: GTRACE    Generated: " + new Date().toISOString(),
    "Classification: RESTRICTED",
    "",
    "TOP ENTITIES BY BETWEENNESS CENTRALITY",
    "----------------------------------------------------------------",
    ...top.map(
      (n) =>
        `${n.name.padEnd(22)} ${n.role.padEnd(12)} deg=${String(n.degree).padStart(2)}  btw=${n.betweenness_centrality.toFixed(4)}  ${riskLevel(n)}`,
    ),
    "",
    `CHAIN INTEGRITY: ${integrityStatus.toUpperCase()}`,
    "----------------------------------------------------------------",
    ...auditEntries.slice(-6).map(
      (e) =>
        `${formatTimestamp(e.timestamp).slice(0, 19)}  ${e.details.node_id.padEnd(18)} ${truncateHash(e.entry_hash)}`,
    ),
    "",
    "Generated from GTrace pipeline (section4/graph_output.json + section5/audit_log.json).",
  ];

  const blob = buildPdf(lines);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "GTrace_report.pdf";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

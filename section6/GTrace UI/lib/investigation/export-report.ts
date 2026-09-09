import { getScoredNodes, riskLevel } from "./centrality";
import { auditEntries } from "./audit-log";

function escapePdfText(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)").replace(/[^\x20-\x7E]/g, "?");
}

/** Builds a minimal single-page PDF by hand so the demo export produces a real, openable file. */
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

export function exportInvestigationReport() {
  const scored = [...getScoredNodes()].sort((a, b) => b.degree - a.degree).slice(0, 12);
  const lines = [
    "OPTIMUS INVESTIGATOR CONSOLE - NETWORK ANALYSIS REPORT",
    "Case: OP-KESTREL    Generated: " + new Date().toISOString(),
    "Classification: RESTRICTED",
    "",
    "TOP ENTITIES BY CENTRALITY",
    "----------------------------------------------------------------",
    ...scored.map(
      (n) =>
        `${n.name.padEnd(28)} ${n.type.padEnd(13)} deg=${String(n.degree).padStart(2)}  btw=${String(n.betweenness).padStart(6)}  ${riskLevel(n)}`,
    ),
    "",
    "AUDIT CHAIN (latest entries)",
    "----------------------------------------------------------------",
    ...auditEntries.slice(-6).map((e) => `${e.timestamp}  ${e.action.slice(0, 44).padEnd(44)} ${e.hash.slice(0, 12)}`),
    "",
    "This document is generated from mock case data for demonstration.",
  ];

  const blob = buildPdf(lines);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "OP-KESTREL_report.pdf";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

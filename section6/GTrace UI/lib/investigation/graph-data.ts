export type EntityType = "person" | "location" | "organization" | "phone";

export interface EntityNode {
  id: string;
  name: string;
  type: EntityType;
  tier?: "kingpin" | "lieutenant" | "associate" | "red-herring";
}

export interface EntityLink {
  source: string;
  target: string;
  relation: string;
}

export interface LinkedRecord {
  id: string;
  kind: "FIR" | "CDR" | "Report" | "Surveillance";
  title: string;
  excerpt: string;
  date: string;
}

export const ENTITY_TYPE_META: Record<
  EntityType,
  { label: string; color: string }
> = {
  person: { label: "Person", color: "#8fb4ff" },
  location: { label: "Location", color: "#4fd1c5" },
  organization: { label: "Organization", color: "#b48cff" },
  phone: { label: "Phone Number", color: "#ff7fa8" },
};

export const nodes: EntityNode[] = [
  // Kingpin
  { id: "p-sethi", name: "Vikram 'Raja' Sethi", type: "person", tier: "kingpin" },

  // Lieutenants
  { id: "p-malhotra", name: "Dev Malhotra", type: "person", tier: "lieutenant" },
  { id: "p-qureshi", name: "Farhan Qureshi", type: "person", tier: "lieutenant" },
  { id: "p-naik", name: "Sunita Naik", type: "person", tier: "lieutenant" },
  { id: "p-dsouza", name: "Ronnie D'Souza", type: "person", tier: "lieutenant" },

  // Associates
  { id: "p-pawar", name: "Ajay Pawar", type: "person", tier: "associate" },
  { id: "p-shaikh", name: "Imran Shaikh", type: "person", tier: "associate" },
  { id: "p-rane", name: "Kunal Rane", type: "person", tier: "associate" },
  { id: "p-fernandes", name: "Lisa Fernandes", type: "person", tier: "associate" },
  { id: "p-yadav", name: "Manoj Yadav", type: "person", tier: "associate" },
  { id: "p-bhatt", name: "Nikhil Bhatt", type: "person", tier: "associate" },
  { id: "p-khan", name: "Salim Khan", type: "person", tier: "associate" },
  { id: "p-joshi", name: "Tanvi Joshi", type: "person", tier: "associate" },
  { id: "p-gaikwad", name: "Rohit Gaikwad", type: "person", tier: "associate" },

  // Organizations
  { id: "o-sethi-logistics", name: "Sethi Logistics Pvt Ltd", type: "organization" },
  { id: "o-blue-crescent", name: "Blue Crescent Exports", type: "organization" },
  { id: "o-nirvana", name: "Nirvana Bar & Lounge", type: "organization" },
  { id: "o-apex-forex", name: "Apex Forex Services", type: "organization" },
  { id: "o-shree-transport", name: "Shree Ganesh Transport", type: "organization" },

  // Locations
  { id: "l-warehouse7", name: "Warehouse 7, Bhiwandi", type: "location" },
  { id: "l-andheri", name: "Flat 3B, Andheri West", type: "location" },
  { id: "l-meridian", name: "Hotel Meridian, Rm 402", type: "location" },
  { id: "l-dockyard", name: "Dockyard Gate 4", type: "location" },
  { id: "l-lonavala", name: "Farmhouse, Lonavala", type: "location" },
  { id: "l-crawford", name: "Crawford Market Lane 9", type: "location" },

  // Phones
  { id: "t-9820144", name: "+91 98201 44xxx", type: "phone" },
  { id: "t-9930127", name: "+91 99301 27xxx", type: "phone" },
  { id: "t-8108833", name: "+91 81088 33xxx", type: "phone" },
  { id: "t-7045521", name: "+91 70455 21xxx", type: "phone" },
  { id: "t-9167802", name: "+91 91678 02xxx", type: "phone" },
  { id: "t-9004415", name: "+91 90044 15xxx", type: "phone" },
  { id: "t-8291376", name: "+91 82913 76xxx", type: "phone" },

  // Red herrings
  { id: "p-deshpande", name: "Anil Deshpande", type: "person", tier: "red-herring" },
  { id: "t-9819950", name: "+91 98199 50xxx", type: "phone", tier: "red-herring" },
  { id: "o-sunrise-bakery", name: "Sunrise Bakery", type: "organization", tier: "red-herring" },
];

export const links: EntityLink[] = [
  // Kingpin hub
  { source: "p-sethi", target: "p-malhotra", relation: "Frequent contact" },
  { source: "p-sethi", target: "p-qureshi", relation: "Frequent contact" },
  { source: "p-sethi", target: "p-naik", relation: "Financial link" },
  { source: "p-sethi", target: "p-dsouza", relation: "Co-located" },
  { source: "p-sethi", target: "o-sethi-logistics", relation: "Director" },
  { source: "p-sethi", target: "l-lonavala", relation: "Owner" },
  { source: "p-sethi", target: "t-9820144", relation: "Subscriber" },
  { source: "p-sethi", target: "l-meridian", relation: "Checked in" },
  { source: "p-sethi", target: "o-nirvana", relation: "Silent partner" },

  // Malhotra — logistics arm
  { source: "p-malhotra", target: "o-sethi-logistics", relation: "Ops manager" },
  { source: "p-malhotra", target: "l-warehouse7", relation: "Lease holder" },
  { source: "p-malhotra", target: "t-9930127", relation: "Subscriber" },
  { source: "p-malhotra", target: "p-pawar", relation: "Supervises" },
  { source: "p-malhotra", target: "p-shaikh", relation: "Supervises" },
  { source: "p-malhotra", target: "o-shree-transport", relation: "Contracts" },

  // Qureshi — dock and exports
  { source: "p-qureshi", target: "o-blue-crescent", relation: "Proprietor" },
  { source: "p-qureshi", target: "l-dockyard", relation: "Access pass" },
  { source: "p-qureshi", target: "t-8108833", relation: "Subscriber" },
  { source: "p-qureshi", target: "p-rane", relation: "Frequent contact" },
  { source: "p-qureshi", target: "p-khan", relation: "Frequent contact" },

  // Naik — finance
  { source: "p-naik", target: "o-apex-forex", relation: "Account holder" },
  { source: "p-naik", target: "t-7045521", relation: "Subscriber" },
  { source: "p-naik", target: "p-fernandes", relation: "Wire transfers" },
  { source: "p-naik", target: "p-joshi", relation: "Wire transfers" },
  { source: "p-naik", target: "l-andheri", relation: "Resident" },

  // D'Souza — venues
  { source: "p-dsouza", target: "o-nirvana", relation: "Manager" },
  { source: "p-dsouza", target: "l-meridian", relation: "Checked in" },
  { source: "p-dsouza", target: "t-9167802", relation: "Subscriber" },
  { source: "p-dsouza", target: "p-yadav", relation: "Employs" },
  { source: "p-dsouza", target: "p-bhatt", relation: "Employs" },

  // Associates
  { source: "p-pawar", target: "l-warehouse7", relation: "Seen at" },
  { source: "p-pawar", target: "t-9004415", relation: "Subscriber" },
  { source: "p-shaikh", target: "o-shree-transport", relation: "Driver" },
  { source: "p-shaikh", target: "l-crawford", relation: "Seen at" },
  { source: "p-rane", target: "l-dockyard", relation: "Seen at" },
  { source: "p-rane", target: "t-8291376", relation: "Subscriber" },
  { source: "p-khan", target: "o-blue-crescent", relation: "Clerk" },
  { source: "p-fernandes", target: "o-apex-forex", relation: "Employee" },
  { source: "p-joshi", target: "l-andheri", relation: "Visitor" },
  { source: "p-yadav", target: "l-crawford", relation: "Seen at" },
  { source: "p-bhatt", target: "o-nirvana", relation: "Bartender" },
  { source: "p-gaikwad", target: "o-shree-transport", relation: "Owner" },
  { source: "p-gaikwad", target: "t-9004415", relation: "Called" },

  // Cross links that make the network cohesive
  { source: "t-9820144", target: "t-9930127", relation: "CDR co-occurrence" },
  { source: "t-9820144", target: "t-8108833", relation: "CDR co-occurrence" },
  { source: "t-9930127", target: "t-9004415", relation: "CDR co-occurrence" },
  { source: "l-warehouse7", target: "o-shree-transport", relation: "Dispatch logs" },

  // Red herring pair — an island with no path to the network
  { source: "p-deshpande", target: "t-9819950", relation: "Subscriber" },
];

const RECORDS_BY_ENTITY: Record<string, LinkedRecord[]> = {
  "p-sethi": [
    { id: "FIR-2024-0412", kind: "FIR", title: "FIR #0412 — Bhiwandi PS", excerpt: "…accused (1) Vikram Sethi alias Raja, believed to direct consignment routing via…", date: "2024-03-14" },
    { id: "CDR-88213", kind: "CDR", title: "CDR extract — +91 98201 44xxx", excerpt: "31 calls to 99301 27xxx between 02:10–04:45 IST on nights preceding dock movements.", date: "2024-04-02" },
    { id: "SR-117", kind: "Surveillance", title: "Surveillance log SR-117", excerpt: "Subject observed at Hotel Meridian Rm 402 with D'Souza; 47 min duration.", date: "2024-04-19" },
  ],
  "p-malhotra": [
    { id: "FIR-2024-0412", kind: "FIR", title: "FIR #0412 — Bhiwandi PS", excerpt: "…accused (2) Dev Malhotra, lease holder of Warehouse 7, present during seizure…", date: "2024-03-14" },
    { id: "RPT-BW-09", kind: "Report", title: "Warehouse inspection report", excerpt: "Dispatch manifests bearing Malhotra's signature cross-reference Shree Ganesh Transport.", date: "2024-03-22" },
  ],
  "p-qureshi": [
    { id: "FIR-2024-0530", kind: "FIR", title: "FIR #0530 — Yellow Gate PS", excerpt: "Container BCE-4471 declared as textiles; contents inconsistent. Consignee: Blue Crescent Exports.", date: "2024-05-30" },
    { id: "CDR-88219", kind: "CDR", title: "CDR extract — +91 81088 33xxx", excerpt: "Tower dumps place handset at Dockyard Gate 4 during 3 of 4 flagged movements.", date: "2024-05-12" },
  ],
  "p-naik": [
    { id: "RPT-FIN-22", kind: "Report", title: "Financial intelligence note", excerpt: "Structured deposits to Apex Forex totalling ₹2.1 Cr across 14 days; onward wires to Fernandes, Joshi.", date: "2024-04-28" },
  ],
  "p-dsouza": [
    { id: "SR-117", kind: "Surveillance", title: "Surveillance log SR-117", excerpt: "D'Souza arrived 21:40, departed with Sethi 22:35 via service exit.", date: "2024-04-19" },
    { id: "RPT-NV-03", kind: "Report", title: "Licensing inspection — Nirvana", excerpt: "Undeclared cash room behind stock area; Bhatt on premises.", date: "2024-02-08" },
  ],
  "p-deshpande": [
    { id: "CDR-90011", kind: "CDR", title: "CDR extract — +91 98199 50xxx", excerpt: "Single misdialled call to 98201 44xxx, 9 seconds. No further contact.", date: "2024-03-30" },
  ],
};

export function getLinkedRecords(id: string): LinkedRecord[] {
  if (RECORDS_BY_ENTITY[id]) return RECORDS_BY_ENTITY[id];
  const node = nodes.find((n) => n.id === id);
  if (!node) return [];
  const label = node.type === "phone" ? `CDR extract — ${node.name}` : `Reference — ${node.name}`;
  return [
    {
      id: `REF-${id.toUpperCase()}`,
      kind: node.type === "phone" ? "CDR" : "Report",
      title: label,
      excerpt: `Entity appears in ${degreeOf(id)} linked record(s) across the case file.`,
      date: "2024-04-10",
    },
  ];
}

export function degreeOf(id: string): number {
  return links.filter((l) => l.source === id || l.target === id).length;
}

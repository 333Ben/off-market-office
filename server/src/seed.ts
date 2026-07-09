// Synthetic dataset (§8). 28 fictional companies: 16 outgrowers, 12 releasers.
// All names, people and contacts are invented. Numbers are made coherent via
// spacemath.ts — the LLM never touches them.

import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { Company, Signal, SignalType, SignalSource } from "./types";
import { deskCapacity, monthsToBreach, neededSqm } from "./spacemath";

const NOW = Date.now();
const DAY = 86_400_000;
const daysAgo = (n: number) => new Date(NOW - n * DAY).toISOString();
const weeksAhead = (n: number) =>
  new Date(NOW + n * 7 * DAY).toISOString().slice(0, 10);

// Approximate arrondissement centers, all within Paris bounds
// (lat 48.83–48.90, lng 2.28–2.41). We jitter deterministically per company.
const ARR_CENTER: Record<number, [number, number]> = {
  1: [48.8626, 2.3363],
  2: [48.8688, 2.3419],
  3: [48.863, 2.3625],
  4: [48.8546, 2.3574],
  5: [48.8448, 2.3471],
  8: [48.8726, 2.3155],
  9: [48.8768, 2.3396],
  10: [48.876, 2.3599],
  11: [48.8594, 2.3765],
  12: [48.8399, 2.3877],
  13: [48.836, 2.3561],
  15: [48.8412, 2.301],
  17: [48.8848, 2.3213],
  19: [48.8827, 2.3822],
  20: [48.8639, 2.3984],
};

// Deterministic jitter so pins never overlap but stay in their arrondissement.
function jitter(arr: number, i: number): [number, number] {
  const [lat, lng] = ARR_CENTER[arr] ?? [48.8656, 2.345];
  const a = ((i * 53) % 17) / 17 - 0.5; // -0.5..0.5
  const b = ((i * 29) % 13) / 13 - 0.5;
  return [
    +(lat + a * 0.012).toFixed(5),
    +(lng + b * 0.016).toFixed(5),
  ];
}

let sigSeq = 0;
function sig(
  companyId: string,
  type: SignalType,
  source: SignalSource,
  title: string,
  detail: string,
  days: number,
  weight: number
): Signal {
  return {
    id: `sig-${++sigSeq}`,
    companyId,
    type,
    source,
    title,
    detail,
    timestamp: daysAgo(days),
    weight,
  };
}

// ── Outgrower specs ────────────────────────────────────────────────────────
interface OutSpec {
  id: string;
  name: string;
  industry: string;
  arr: number;
  address: string;
  headcount: number;
  officeSqm: number;
  openRoles: number;
  hiresPerMonth: number;
  urgency: number;
  signals: [SignalType, SignalSource, string, string, number, number][];
}

const OUT: OutSpec[] = [
  {
    id: "hero-out",
    name: "Cartesia Labs",
    industry: "AI infrastructure",
    arr: 11,
    address: "9 rue de la Roquette, 75011 Paris",
    headcount: 31,
    officeSqm: 400,
    openRoles: 18,
    hiresPerMonth: 4.5,
    urgency: 88,
    signals: [
      ["hiring_surge", "sillage", "Posted 18 roles in 30 days", "Engineering + GTM roles across Paris office.", 6, 70],
      ["exec_hire", "sillage", "New Head of Workplace joined", "Signals imminent office expansion planning.", 14, 55],
    ],
  },
  {
    id: "out-2",
    name: "Nexolane",
    industry: "Fintech",
    arr: 2,
    address: "22 rue du Sentier, 75002 Paris",
    headcount: 44,
    officeSqm: 500,
    openRoles: 12,
    hiresPerMonth: 3,
    urgency: 72,
    signals: [
      ["hiring_surge", "sillage", "12 open roles, hiring 3/mo", "Sales and engineering expansion.", 9, 50],
      ["job_change", "sillage", "VP Sales hired from a scale-up", "Growth-stage GTM buildout underway.", 21, 30],
    ],
  },
  {
    id: "out-3",
    name: "Voltaic Systems",
    industry: "Energy SaaS",
    arr: 9,
    address: "14 rue de Châteaudun, 75009 Paris",
    headcount: 58,
    officeSqm: 620,
    openRoles: 9,
    hiresPerMonth: 2.5,
    urgency: 64,
    signals: [
      ["hiring_surge", "sillage", "9 roles opened this quarter", "Steady expansion, mostly product.", 12, 40],
    ],
  },
  {
    id: "out-4",
    name: "Marguerite AI",
    industry: "Health AI",
    arr: 10,
    address: "31 rue du Faubourg Saint-Denis, 75010 Paris",
    headcount: 22,
    officeSqm: 260,
    openRoles: 10,
    hiresPerMonth: 3.2,
    urgency: 78,
    signals: [
      ["hiring_surge", "sillage", "10 roles in 6 weeks", "Post-raise clinical + ML hiring.", 5, 60],
      ["exec_hire", "sillage", "COO hired", "Operations scaling signal.", 18, 40],
    ],
  },
  {
    id: "out-5",
    name: "Batignolles Data",
    industry: "Data infrastructure",
    arr: 17,
    address: "8 rue des Dames, 75017 Paris",
    headcount: 37,
    officeSqm: 450,
    openRoles: 8,
    hiresPerMonth: 2,
    urgency: 58,
    signals: [
      ["hiring_surge", "sillage", "8 engineering roles open", "Backfill plus growth.", 15, 35],
    ],
  },
  {
    id: "out-6",
    name: "Lumière Robotics",
    industry: "Robotics",
    arr: 12,
    address: "40 avenue Daumesnil, 75012 Paris",
    headcount: 40,
    officeSqm: 500,
    openRoles: 14,
    hiresPerMonth: 3.5,
    urgency: 69,
    signals: [
      ["hiring_surge", "sillage", "14 roles, hardware + software", "Series B expansion.", 8, 55],
      ["job_change", "sillage", "Head of Manufacturing joined", "Scaling operations.", 25, 25],
    ],
  },
  {
    id: "out-7",
    name: "Petit Ledger",
    industry: "Fintech",
    arr: 2,
    address: "5 rue d'Aboukir, 75002 Paris",
    headcount: 18,
    officeSqm: 220,
    openRoles: 6,
    hiresPerMonth: 1.8,
    urgency: 47,
    signals: [
      ["hiring_surge", "sillage", "6 roles this quarter", "Early growth, measured pace.", 20, 30],
    ],
  },
  {
    id: "out-8",
    name: "Sentier Studios",
    industry: "Creative SaaS",
    arr: 3,
    address: "17 rue de Turbigo, 75003 Paris",
    headcount: 27,
    officeSqm: 320,
    openRoles: 7,
    hiresPerMonth: 2.2,
    urgency: 55,
    signals: [
      ["hiring_surge", "sillage", "7 roles open", "Design and growth hiring.", 11, 35],
    ],
  },
  {
    id: "out-9",
    name: "OpenGrille",
    industry: "Developer tools",
    arr: 11,
    address: "3 rue Oberkampf, 75011 Paris",
    headcount: 33,
    officeSqm: 380,
    openRoles: 11,
    hiresPerMonth: 3.8,
    urgency: 87,
    signals: [
      ["hiring_surge", "sillage", "11 roles in 4 weeks", "Aggressive post-launch hiring.", 4, 65],
      ["exec_hire", "sillage", "Head of People hired", "Scaling org fast.", 16, 45],
    ],
  },
  {
    id: "out-10",
    name: "Verdon Mobility",
    industry: "Mobility",
    arr: 13,
    address: "26 rue du Chevaleret, 75013 Paris",
    headcount: 49,
    officeSqm: 560,
    openRoles: 10,
    hiresPerMonth: 2.6,
    urgency: 60,
    signals: [
      ["hiring_surge", "sillage", "10 roles, ops + eng", "City expansion hiring.", 13, 40],
    ],
  },
  {
    id: "out-11",
    name: "Aubervin Cloud",
    industry: "Cloud infrastructure",
    arr: 19,
    address: "12 rue de l'Ourcq, 75019 Paris",
    headcount: 52,
    officeSqm: 600,
    openRoles: 9,
    hiresPerMonth: 2.4,
    urgency: 52,
    signals: [
      ["hiring_surge", "sillage", "9 roles open", "Steady infra team growth.", 17, 35],
    ],
  },
  {
    id: "out-12",
    name: "Maison Cassini",
    industry: "Proptech",
    arr: 8,
    address: "18 rue de la Pépinière, 75008 Paris",
    headcount: 29,
    officeSqm: 360,
    openRoles: 8,
    hiresPerMonth: 2.9,
    urgency: 62,
    signals: [
      ["hiring_surge", "sillage", "8 roles this month", "Sales-led expansion.", 10, 45],
      ["job_change", "sillage", "Head of Sales joined", "GTM ramp.", 22, 25],
    ],
  },
  {
    id: "out-13",
    name: "Thalène Bio",
    industry: "Biotech",
    arr: 5,
    address: "7 rue Cuvier, 75005 Paris",
    headcount: 24,
    officeSqm: 300,
    openRoles: 12,
    hiresPerMonth: 4,
    urgency: 86,
    signals: [
      ["hiring_surge", "sillage", "12 roles after Series A", "Lab + research hiring surge.", 3, 68],
      ["exec_hire", "sillage", "VP Research hired", "Team doubling planned.", 12, 40],
    ],
  },
  {
    id: "out-14",
    name: "Quai Numérique",
    industry: "Media tech",
    arr: 20,
    address: "44 rue des Pyrénées, 75020 Paris",
    headcount: 41,
    officeSqm: 470,
    openRoles: 7,
    hiresPerMonth: 2.1,
    urgency: 49,
    signals: [
      ["hiring_surge", "sillage", "7 roles open", "Content + eng growth.", 19, 30],
    ],
  },
  {
    id: "out-15",
    name: "Belleville Labs",
    industry: "Applied AI",
    arr: 20,
    address: "9 rue de Belleville, 75020 Paris",
    headcount: 26,
    officeSqm: 300,
    openRoles: 9,
    hiresPerMonth: 3.3,
    urgency: 67,
    signals: [
      ["hiring_surge", "sillage", "9 roles in 5 weeks", "Research team scaling.", 7, 52],
    ],
  },
  {
    id: "out-16",
    name: "Fontaine Analytics",
    industry: "Analytics",
    arr: 15,
    address: "21 rue de Vaugirard, 75015 Paris",
    headcount: 46,
    officeSqm: 520,
    openRoles: 8,
    hiresPerMonth: 2.3,
    urgency: 44,
    signals: [
      ["hiring_surge", "sillage", "8 roles open", "Measured growth.", 23, 28],
    ],
  },
];

// ── Releaser specs ─────────────────────────────────────────────────────────
interface RelSpec {
  id: string;
  name: string;
  industry: string;
  arr: number;
  address: string;
  headcount: number;
  wasHeadcount: number;
  availableSqm: number;
  weeks: number;
  reason: NonNullable<Company["releaseReason"]>;
  motivation: NonNullable<Company["motivation"]>;
  urgency: number;
  signals: [SignalType, SignalSource, string, string, number, number][];
}

const REL: RelSpec[] = [
  {
    id: "hero-rel",
    name: "Atelier Numérique Group",
    industry: "Advertising agency",
    arr: 3,
    address: "48 rue de Cléry, 75003 Paris",
    headcount: 12,
    wasHeadcount: 55,
    availableSqm: 520,
    weeks: 6,
    reason: "insolvency",
    motivation: "urgent",
    urgency: 90,
    signals: [
      ["insolvency_filing", "bodacc", "Redressement judiciaire published", "Insolvency proceeding opened in the BODACC registry.", 5, 85],
      ["champion_departure", "sillage", "Creative Director departed", "Senior staff exodus underway.", 12, 40],
      ["champion_departure", "sillage", "Head of Accounts departed", "Second senior exit in a month.", 20, 40],
      ["layoffs", "mock", "Headcount 55 → 12", "Large-scale reduction confirmed.", 18, 60],
    ],
  },
  {
    id: "rel-2",
    name: "Maison Verdier",
    industry: "Retail",
    arr: 8,
    address: "30 rue de la Boétie, 75008 Paris",
    headcount: 30,
    wasHeadcount: 60,
    availableSqm: 400,
    weeks: 10,
    reason: "downsizing",
    motivation: "high",
    urgency: 74,
    signals: [
      ["layoffs", "mock", "Headcount halved", "Restructuring across the group.", 15, 55],
      ["office_listing", "mock", "Two floors quietly listed", "Sublease sounding-out started.", 9, 30],
    ],
  },
  {
    id: "rel-3",
    name: "Cabinet Rousseau",
    industry: "Legal services",
    arr: 9,
    address: "11 rue de Provence, 75009 Paris",
    headcount: 20,
    wasHeadcount: 35,
    availableSqm: 280,
    weeks: 8,
    reason: "relocation",
    motivation: "moderate",
    urgency: 55,
    signals: [
      ["office_listing", "mock", "Relocating to smaller premises", "Lease not renewed.", 14, 40],
    ],
  },
  {
    id: "rel-4",
    name: "Groupe Peltier",
    industry: "Manufacturing (HQ office)",
    arr: 12,
    address: "62 rue de Reuilly, 75012 Paris",
    headcount: 15,
    wasHeadcount: 48,
    availableSqm: 480,
    weeks: 4,
    reason: "insolvency",
    motivation: "urgent",
    urgency: 85,
    signals: [
      ["insolvency_filing", "bodacc", "Liquidation judiciaire opened", "Court-ordered wind-down of operations.", 7, 82],
      ["layoffs", "mock", "Office staff released", "HQ headcount collapsed.", 10, 55],
    ],
  },
  {
    id: "rel-5",
    name: "Studio Margaux",
    industry: "Design studio",
    arr: 10,
    address: "5 rue de Marseille, 75010 Paris",
    headcount: 8,
    wasHeadcount: 22,
    availableSqm: 200,
    weeks: 12,
    reason: "remote_shift",
    motivation: "moderate",
    urgency: 46,
    signals: [
      ["office_listing", "mock", "Going remote-first", "Releasing the studio space.", 16, 35],
    ],
  },
  {
    id: "rel-6",
    name: "Perreault & Cie",
    industry: "Consulting",
    arr: 2,
    address: "13 rue Réaumur, 75002 Paris",
    headcount: 25,
    wasHeadcount: 40,
    availableSqm: 240,
    weeks: 9,
    reason: "downsizing",
    motivation: "moderate",
    urgency: 51,
    signals: [
      ["layoffs", "mock", "Consulting bench trimmed", "One floor freeing up.", 13, 40],
    ],
  },
  {
    id: "rel-7",
    name: "Verlaine Media",
    industry: "Media",
    arr: 11,
    address: "28 boulevard Voltaire, 75011 Paris",
    headcount: 14,
    wasHeadcount: 38,
    availableSqm: 360,
    weeks: 6,
    reason: "downsizing",
    motivation: "high",
    urgency: 70,
    signals: [
      ["layoffs", "mock", "Editorial team cut", "Print unit shut down.", 11, 52],
      ["champion_departure", "sillage", "Editor-in-chief left", "Leadership churn.", 19, 35],
    ],
  },
  {
    id: "rel-8",
    name: "Cristallin SA",
    industry: "Insurance",
    arr: 15,
    address: "40 rue Lecourbe, 75015 Paris",
    headcount: 40,
    wasHeadcount: 70,
    availableSqm: 500,
    weeks: 14,
    reason: "relocation",
    motivation: "moderate",
    urgency: 42,
    signals: [
      ["office_listing", "mock", "Consolidating two sites", "Vacating the 15e office.", 22, 30],
    ],
  },
  {
    id: "rel-9",
    name: "Atelier Bastille",
    industry: "Fashion",
    arr: 4,
    address: "9 rue Saint-Antoine, 75004 Paris",
    headcount: 10,
    wasHeadcount: 28,
    availableSqm: 260,
    weeks: 7,
    reason: "remote_shift",
    motivation: "high",
    urgency: 63,
    signals: [
      ["layoffs", "mock", "Studio team reduced", "Shifting to hybrid.", 12, 45],
      ["office_listing", "mock", "Showroom space listed", "Available for sublease.", 8, 35],
    ],
  },
  {
    id: "rel-10",
    name: "Comptoir Daumesnil",
    industry: "Trading",
    arr: 12,
    address: "77 avenue Daumesnil, 75012 Paris",
    headcount: 18,
    wasHeadcount: 42,
    availableSqm: 420,
    weeks: 5,
    reason: "insolvency",
    motivation: "urgent",
    urgency: 79,
    signals: [
      ["insolvency_filing", "bodacc", "Procédure de sauvegarde opened", "Protective insolvency proceeding.", 9, 70],
      ["layoffs", "mock", "Desk closures", "Trading floor downsized.", 14, 48],
    ],
  },
  {
    id: "rel-11",
    name: "Voisin Ltd",
    industry: "Telecom",
    arr: 13,
    address: "19 rue de Tolbiac, 75013 Paris",
    headcount: 33,
    wasHeadcount: 55,
    availableSqm: 300,
    weeks: 11,
    reason: "downsizing",
    motivation: "moderate",
    urgency: 48,
    signals: [
      ["layoffs", "mock", "Support team offshored", "One floor freeing up.", 17, 38],
    ],
  },
  {
    id: "rel-12",
    name: "Galerie Sévigné",
    industry: "Art tech",
    arr: 4,
    address: "6 rue de Sévigné, 75004 Paris",
    headcount: 9,
    wasHeadcount: 24,
    availableSqm: 220,
    weeks: 8,
    reason: "remote_shift",
    motivation: "moderate",
    urgency: 44,
    signals: [
      ["office_listing", "mock", "Downsizing gallery office", "Releasing back-office floor.", 20, 32],
    ],
  },
];

export function buildSeed(): Company[] {
  const companies: Company[] = [];

  OUT.forEach((s, i) => {
    const [lat, lng] = jitter(s.arr, i + 1);
    const capacityDesks = deskCapacity(s.officeSqm);
    const company: Company = {
      id: s.id,
      name: s.name,
      type: "outgrower",
      industry: s.industry,
      arrondissement: s.arr,
      address: s.address,
      lat,
      lng,
      headcount: s.headcount,
      officeSqm: s.officeSqm,
      capacityDesks,
      openRoles: s.openRoles,
      hiresPerMonth: s.hiresPerMonth,
      monthsToBreach: monthsToBreach(capacityDesks, s.headcount, s.hiresPerMonth),
      neededSqm: neededSqm(s.headcount, s.openRoles),
      urgencyScore: s.urgency,
      status: "new",
      signals: s.signals.map((sg) =>
        sig(s.id, sg[0], sg[1], sg[2], sg[3], sg[4], sg[5])
      ),
      matchIds: [],
    };
    companies.push(company);
  });

  REL.forEach((s, i) => {
    const [lat, lng] = jitter(s.arr, i + 100);
    const capacityDesks = deskCapacity(s.availableSqm);
    const company: Company = {
      id: s.id,
      name: s.name,
      type: "releaser",
      industry: s.industry,
      arrondissement: s.arr,
      address: s.address,
      lat,
      lng,
      headcount: s.headcount,
      officeSqm: s.availableSqm,
      capacityDesks,
      wasHeadcount: s.wasHeadcount,
      releaseReason: s.reason,
      availableSqm: s.availableSqm,
      availableFrom: weeksAhead(s.weeks),
      motivation: s.motivation,
      urgencyScore: s.urgency,
      status: "new",
      signals: s.signals.map((sg) =>
        sig(s.id, sg[0], sg[1], sg[2], sg[3], sg[4], sg[5])
      ),
      matchIds: [],
    };
    companies.push(company);
  });

  return companies;
}

// Allow `npm run seed` to write db.json directly.
const __filename = fileURLToPath(import.meta.url);
const isDirect = process.argv[1] === __filename;
if (isDirect || process.argv.includes("--write")) {
  const dataDir = join(dirname(__filename), "..", "data");
  mkdirSync(dataDir, { recursive: true });
  const db = { companies: buildSeed(), matches: [], drafts: [] };
  writeFileSync(join(dataDir, "db.json"), JSON.stringify(db, null, 2));
  console.log(
    `Seeded ${db.companies.length} companies → server/data/db.json`
  );
}

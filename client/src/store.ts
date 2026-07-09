// Zustand store (§6). Phase 1: companies + live filters + search + selection.
// Selectors return STABLE references only (raw state / primitives). Derived
// values (filtered lists, counts) are computed in components with useMemo —
// returning a fresh array/object from a selector makes useSyncExternalStore loop.

import { create } from "zustand";
import type { Company, SignalType, AgentEvent } from "./types";
import { fetchCompanies, fetchCompany, fetchMatches } from "./lib/api";

export interface ActiveMatch {
  outgrowerId: string;
  releaserId: string;
  score: number;
}

export type Tab = "all" | "outgrower" | "releaser";
export type TeamBucket = "1–10" | "11–50" | "51–200" | "200+";
export type OfficeBucket = "<200" | "200–500" | "500–1000" | "1000+";
export type View = "map" | "table";

export interface Filters {
  minUrgency: number;
  teamSizes: TeamBucket[];
  officeSizes: OfficeBucket[];
  signalTypes: SignalType[];
  arrondissements: number[];
}

export const DEFAULT_FILTERS: Filters = {
  minUrgency: 40,
  teamSizes: [],
  officeSizes: [],
  signalTypes: [],
  arrondissements: [],
};

// A named, saved outreach list — persisted to localStorage so it survives reloads.
export interface SavedList {
  id: string;
  name: string;
  companyIds: string[];
  createdAt: string;
}

const SAVED_LISTS_KEY = "outgrow.savedLists";

function readSavedLists(): SavedList[] {
  try {
    const raw = localStorage.getItem(SAVED_LISTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistSavedLists(lists: SavedList[]): void {
  try {
    localStorage.setItem(SAVED_LISTS_KEY, JSON.stringify(lists));
  } catch {
    /* storage unavailable — lists stay in-memory for the session */
  }
}

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `list-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
}

interface StoreState {
  companies: Company[];
  loading: boolean;
  error: string | null;
  tab: Tab;
  view: View;
  search: string;
  filters: Filters;
  selectedId: string | null;

  // outreach list — companies the broker has queued to contact
  contactIds: string[];
  contactListOpen: boolean;
  savedLists: SavedList[];

  // agent stream state
  events: AgentEvent[];
  pulsingIds: string[];
  consoleOpen: boolean;
  activeMatch: ActiveMatch | null;
  toast: { text: string; companyId?: string } | null;
  soundOn: boolean;
  bodaccOpen: boolean;
  sillageOpen: boolean;

  load: () => Promise<void>;
  setTab: (tab: Tab) => void;
  setView: (view: View) => void;
  setSearch: (q: string) => void;
  setSelected: (id: string | null) => void;

  toggleContact: (id: string) => void;
  addContacts: (ids: string[]) => void;
  removeContact: (id: string) => void;
  clearContacts: () => void;
  setContactListOpen: (open: boolean) => void;

  saveList: (name: string) => void;
  loadSavedList: (id: string) => void;
  deleteSavedList: (id: string) => void;

  setMinUrgency: (v: number) => void;
  toggleTeamSize: (b: TeamBucket) => void;
  toggleOfficeSize: (b: OfficeBucket) => void;
  toggleSignal: (s: SignalType) => void;
  toggleArr: (a: number) => void;
  resetFilters: () => void;

  pushEvent: (e: AgentEvent) => void;
  upsertCompany: (c: Company) => void;
  pulse: (id: string) => void;
  toggleConsole: () => void;
  setActiveMatch: (m: ActiveMatch | null) => void;
  showToast: (text: string, companyId?: string) => void;
  toggleSound: () => void;
  toggleBodacc: () => void;
  toggleSillage: () => void;
}

export const useStore = create<StoreState>((set) => ({
  companies: [],
  loading: false,
  error: null,
  tab: "all",
  view: "map",
  search: "",
  filters: DEFAULT_FILTERS,
  selectedId: null,
  contactIds: [],
  contactListOpen: false,
  savedLists: readSavedLists(),
  events: [],
  pulsingIds: [],
  consoleOpen: true,
  activeMatch: null,
  toast: null,
  soundOn: false,
  bodaccOpen: false,
  sillageOpen: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const companies = await fetchCompanies();
      set({ companies, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  setTab: (tab) => set({ tab }),
  setView: (view) => set({ view }),
  setSearch: (search) => set({ search }),
  setSelected: (selectedId) => set({ selectedId }),

  toggleContact: (id) =>
    set((s) => ({
      contactIds: s.contactIds.includes(id)
        ? s.contactIds.filter((x) => x !== id)
        : [...s.contactIds, id],
    })),
  addContacts: (ids) =>
    set((s) => ({
      contactIds: [...s.contactIds, ...ids.filter((id) => !s.contactIds.includes(id))],
    })),
  removeContact: (id) =>
    set((s) => ({ contactIds: s.contactIds.filter((x) => x !== id) })),
  clearContacts: () => set({ contactIds: [] }),
  setContactListOpen: (contactListOpen) => set({ contactListOpen }),

  saveList: (name) =>
    set((s) => {
      const trimmed = name.trim();
      if (!trimmed || s.contactIds.length === 0) return s;
      const list: SavedList = {
        id: newId(),
        name: trimmed,
        companyIds: [...s.contactIds],
        createdAt: new Date().toISOString(),
      };
      const savedLists = [list, ...s.savedLists];
      persistSavedLists(savedLists);
      return { savedLists };
    }),
  loadSavedList: (id) =>
    set((s) => {
      const list = s.savedLists.find((l) => l.id === id);
      if (!list) return s;
      // Only load ids that still exist in the current dataset.
      const valid = list.companyIds.filter((cid) =>
        s.companies.some((c) => c.id === cid)
      );
      return { contactIds: valid, contactListOpen: true };
    }),
  deleteSavedList: (id) =>
    set((s) => {
      const savedLists = s.savedLists.filter((l) => l.id !== id);
      persistSavedLists(savedLists);
      return { savedLists };
    }),

  setMinUrgency: (v) =>
    set((s) => ({ filters: { ...s.filters, minUrgency: v } })),
  toggleTeamSize: (b) =>
    set((s) => ({
      filters: {
        ...s.filters,
        teamSizes: s.filters.teamSizes.includes(b)
          ? s.filters.teamSizes.filter((x) => x !== b)
          : [...s.filters.teamSizes, b],
      },
    })),
  toggleOfficeSize: (b) =>
    set((s) => ({
      filters: {
        ...s.filters,
        officeSizes: s.filters.officeSizes.includes(b)
          ? s.filters.officeSizes.filter((x) => x !== b)
          : [...s.filters.officeSizes, b],
      },
    })),
  toggleSignal: (sig) =>
    set((s) => ({
      filters: {
        ...s.filters,
        signalTypes: s.filters.signalTypes.includes(sig)
          ? s.filters.signalTypes.filter((x) => x !== sig)
          : [...s.filters.signalTypes, sig],
      },
    })),
  toggleArr: (a) =>
    set((s) => ({
      filters: {
        ...s.filters,
        arrondissements: s.filters.arrondissements.includes(a)
          ? s.filters.arrondissements.filter((x) => x !== a)
          : [...s.filters.arrondissements, a],
      },
    })),
  resetFilters: () => set({ filters: DEFAULT_FILTERS, tab: "all", search: "" }),

  pushEvent: (e) =>
    set((s) => ({ events: [...s.events, e].slice(-120) })),

  upsertCompany: (c) =>
    set((s) => ({
      companies: s.companies.some((x) => x.id === c.id)
        ? s.companies.map((x) => (x.id === c.id ? c : x))
        : [...s.companies, c],
    })),

  pulse: (id) => {
    set((s) =>
      s.pulsingIds.includes(id)
        ? s
        : { pulsingIds: [...s.pulsingIds, id] }
    );
    window.setTimeout(
      () =>
        set((s) => ({ pulsingIds: s.pulsingIds.filter((x) => x !== id) })),
      2600
    );
  },

  toggleConsole: () => set((s) => ({ consoleOpen: !s.consoleOpen })),

  setActiveMatch: (m) => set({ activeMatch: m }),

  showToast: (text, companyId) => {
    const entry = { text, companyId };
    set({ toast: entry });
    window.setTimeout(() => {
      if (useStore.getState().toast === entry) set({ toast: null });
    }, 6000);
  },

  toggleSound: () => set((s) => ({ soundOn: !s.soundOn })),

  toggleBodacc: () => set((s) => ({ bodaccOpen: !s.bodaccOpen })),

  toggleSillage: () => set((s) => ({ sillageOpen: !s.sillageOpen })),
}));

// Optional two-note "cha-ching" for a match (muted by default; demo etiquette §12).
function playChime() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    [880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.0001, now + i * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.12, now + i * 0.09 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.09 + 0.22);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.09);
      osc.stop(now + i * 0.09 + 0.24);
    });
    setTimeout(() => ctx.close(), 800);
  } catch {
    /* audio not available — silent */
  }
}

// ── SSE wiring: consume the agent event stream and reflect it in the store ──
export function connectEvents(): () => void {
  const es = new EventSource("/api/events");
  es.onmessage = (msg) => {
    let e: AgentEvent;
    try {
      e = JSON.parse(msg.data);
    } catch {
      return;
    }
    const store = useStore.getState();
    store.pushEvent(e);
    if (e.kind === "info" && /reset/i.test(e.message)) {
      store.setActiveMatch(null);
      store.load();
      return;
    }
    if (e.companyId) {
      store.pulse(e.companyId);
      fetchCompany(e.companyId)
        .then((c) => useStore.getState().upsertCompany(c))
        .catch(() => {});
    }
    if (e.kind === "match") {
      // Fetch the freshly created match, draw the arc, fire the toast.
      fetchMatches()
        .then((matches) => {
          const m = matches[matches.length - 1];
          if (!m) return;
          const s = useStore.getState();
          s.setActiveMatch({
            outgrowerId: m.outgrowerId,
            releaserId: m.releaserId,
            score: m.score,
          });
          fetchCompany(m.outgrowerId).then(s.upsertCompany).catch(() => {});
          fetchCompany(m.releaserId).then(s.upsertCompany).catch(() => {});
          const out = s.companies.find((c) => c.id === m.outgrowerId);
          const rel = s.companies.find((c) => c.id === m.releaserId);
          s.showToast(
            `🤝 ${out?.name ?? "Match"} ↔ ${rel?.name ?? ""} — ${m.score}`,
            m.outgrowerId
          );
          if (s.soundOn) playChime();
        })
        .catch(() => {});
    }
  };
  es.onerror = () => {
    /* EventSource auto-reconnects */
  };
  return () => es.close();
}

// ── Pure derived helpers (call inside useMemo in components) ────────────────

function inBucket(headcount: number, buckets: TeamBucket[]): boolean {
  if (buckets.length === 0) return true;
  return buckets.some((b) => {
    switch (b) {
      case "1–10":
        return headcount <= 10;
      case "11–50":
        return headcount >= 11 && headcount <= 50;
      case "51–200":
        return headcount >= 51 && headcount <= 200;
      case "200+":
        return headcount > 200;
    }
  });
}

// The m² that matters per side: for sellers it's the space on offer, for
// buyers it's their current office footprint.
export function relevantSqm(c: Company): number {
  return c.type === "releaser" ? c.availableSqm ?? c.officeSqm : c.officeSqm;
}

function inOfficeBucket(sqm: number, buckets: OfficeBucket[]): boolean {
  if (buckets.length === 0) return true;
  return buckets.some((b) => {
    switch (b) {
      case "<200":
        return sqm < 200;
      case "200–500":
        return sqm >= 200 && sqm < 500;
      case "500–1000":
        return sqm >= 500 && sqm < 1000;
      case "1000+":
        return sqm >= 1000;
    }
  });
}

export function applyFilters(
  companies: Company[],
  tab: Tab,
  filters: Filters,
  search: string
): Company[] {
  const q = search.trim().toLowerCase();
  return companies.filter((c) => {
    if (tab !== "all" && c.type !== tab) return false;
    if (c.urgencyScore < filters.minUrgency) return false;
    if (!inBucket(c.headcount, filters.teamSizes)) return false;
    if (!inOfficeBucket(relevantSqm(c), filters.officeSizes)) return false;
    if (
      filters.arrondissements.length > 0 &&
      !filters.arrondissements.includes(c.arrondissement)
    )
      return false;
    if (
      filters.signalTypes.length > 0 &&
      !c.signals.some((s) => filters.signalTypes.includes(s.type))
    )
      return false;
    if (q && !c.name.toLowerCase().includes(q)) return false;
    return true;
  });
}

export function typeCounts(companies: Company[]): {
  outgrower: number;
  releaser: number;
} {
  let outgrower = 0;
  let releaser = 0;
  for (const c of companies) {
    if (c.type === "outgrower") outgrower++;
    else releaser++;
  }
  return { outgrower, releaser };
}

export function findCompany(
  companies: Company[],
  id: string | null
): Company | undefined {
  if (!id) return undefined;
  return companies.find((c) => c.id === id);
}

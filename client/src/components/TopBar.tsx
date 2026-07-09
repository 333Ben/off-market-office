import { useMemo, useState } from "react";
import { Search, Bell, Volume2, VolumeX } from "lucide-react";
import { useStore, type Tab } from "../store";
import { typeColor, typeLabel } from "../lib/format";

const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "outgrower", label: "Need space" },
  { id: "releaser", label: "Releasing space" },
];

export default function TopBar() {
  const tab = useStore((s) => s.tab);
  const setTab = useStore((s) => s.setTab);
  const search = useStore((s) => s.search);
  const setSearch = useStore((s) => s.setSearch);
  const setSelected = useStore((s) => s.setSelected);
  const companies = useStore((s) => s.companies);
  const soundOn = useStore((s) => s.soundOn);
  const toggleSound = useStore((s) => s.toggleSound);
  const toggleBodacc = useStore((s) => s.toggleBodacc);
  const [focused, setFocused] = useState(false);

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return companies
      .filter((c) => c.name.toLowerCase().includes(q))
      .slice(0, 6);
  }, [search, companies]);

  const pick = (id: string) => {
    setSelected(id);
    setSearch("");
    setFocused(false);
  };

  return (
    <header className="relative z-[1100] flex h-16 shrink-0 items-center gap-6 border-b border-border bg-card px-5">
      {/* Wordmark */}
      <div className="flex items-center gap-2">
        <span
          className="h-6 w-6 rotate-45 rounded-[6px]"
          style={{
            background: "linear-gradient(135deg, var(--violet), var(--coral))",
          }}
        />
        <span className="text-lg font-700 tracking-tight text-ink">Outgrow</span>
      </div>

      {/* Segmented control */}
      <div className="flex items-center gap-1 rounded-chip bg-page p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-[8px] px-3 py-1.5 text-sm font-500 transition ${
              tab === t.id
                ? "bg-card text-ink shadow-sm"
                : "text-secondary hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative ml-auto w-72">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => window.setTimeout(() => setFocused(false), 120)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && results[0]) pick(results[0].id);
            if (e.key === "Escape") setSearch("");
          }}
          placeholder="Search companies"
          className="w-full rounded-chip border border-border bg-page py-2 pl-9 pr-3 text-sm text-ink placeholder:text-muted focus:border-violet focus:bg-card"
        />
        {focused && results.length > 0 && (
          <ul className="absolute left-0 right-0 top-full mt-2 overflow-hidden rounded-card border border-border bg-card shadow-soft">
            {results.map((c) => (
              <li key={c.id}>
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(c.id)}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-page"
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: typeColor(c) }}
                  />
                  <span className="min-w-0 flex-1 truncate text-sm font-500 text-ink">
                    {c.name}
                  </span>
                  <span className="shrink-0 text-[11px] text-muted">
                    {typeLabel(c)} · {c.arrondissement}e
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Demo hotkey hint */}
      <div className="hidden items-center gap-1.5 text-[11px] text-muted lg:flex">
        <Key>S</Key> demo
        <Key>A</Key> score all
        <Key>R</Key> reset
      </div>

      {/* Sound toggle (muted by default — demo etiquette §12) */}
      <button
        onClick={toggleSound}
        className="grid h-9 w-9 place-items-center rounded-chip border border-border bg-card text-secondary hover:text-ink"
        title={soundOn ? "Match sound on" : "Match sound off"}
      >
        {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
      </button>

      {/* Live BODACC feed */}
      <button
        onClick={toggleBodacc}
        className="relative grid h-9 w-9 place-items-center rounded-chip border border-border bg-card text-secondary hover:text-ink"
        title="Live BODACC insolvency feed (real data)"
      >
        <Bell className="h-4 w-4" />
        <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-success ring-2 ring-card" />
      </button>

      <span className="h-8 w-8 rounded-full bg-violet-tint ring-1 ring-border" />
    </header>
  );
}

function Key({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-border bg-page px-1.5 py-0.5 font-mono text-[10px] font-600 text-secondary">
      {children}
    </kbd>
  );
}

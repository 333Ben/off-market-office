import { useEffect, useMemo } from "react";
import { useStore, findCompany, connectEvents } from "./store";
import { simulateSignal, resetDataset, runAgent } from "./lib/api";
import TopBar from "./components/TopBar";
import Sidebar from "./components/Sidebar";
import MapView from "./components/MapView";
import DetailPanel from "./components/DetailPanel";
import AgentConsole from "./components/AgentConsole";
import IconRail from "./components/IconRail";
import BodaccFeed from "./components/BodaccFeed";

export default function App() {
  const load = useStore((s) => s.load);
  const loading = useStore((s) => s.loading);
  const error = useStore((s) => s.error);
  const companies = useStore((s) => s.companies);
  const selectedId = useStore((s) => s.selectedId);
  const selected = useMemo(
    () => findCompany(companies, selectedId),
    [companies, selectedId]
  );

  useEffect(() => {
    load();
    const disconnect = connectEvents();
    return disconnect;
  }, [load]);

  // Demo hotkeys (§13): S fires the hero sequence, R resets the dataset.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
      if (e.key === "s" || e.key === "S") {
        simulateSignal();
      } else if (e.key === "a" || e.key === "A") {
        runAgent();
      } else if (e.key === "r" || e.key === "R") {
        if (window.confirm("Reset the dataset to the synthetic seed?")) {
          resetDataset();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex h-screen bg-page text-ink">
      <IconRail />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <div className="flex min-h-0 flex-1">
          <Sidebar />
          <main className="relative min-w-0 flex-1">
            {error ? (
              <div className="grid h-full place-items-center text-sm text-secondary">
                Couldn’t load companies — is the server running on :3001? ({error})
              </div>
            ) : loading ? (
              <div className="grid h-full place-items-center text-sm text-muted">
                Loading Paris…
              </div>
            ) : (
              <MapView />
            )}
            {/* Floating agent popup, anchored next to the sidebar */}
            <AgentConsole />
          </main>

          {/* Detail panel — width animates so the map resizes without layout shift */}
          <div
            className="shrink-0 overflow-hidden border-l border-border transition-[width] duration-300 ease-out"
            style={{ width: selected ? 380 : 0 }}
          >
            {selected && <DetailPanel company={selected} />}
          </div>
        </div>
      </div>
      <BodaccFeed />
    </div>
  );
}

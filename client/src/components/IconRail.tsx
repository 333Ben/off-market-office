import {
  Map as MapIcon,
  LayoutGrid,
  Bookmark,
  Bell,
  Settings,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// Slim navigation rail (visual chrome matching the reference). The map view is
// the app's only view, so it's the active item; the rest are placeholders.
const ITEMS: { icon: LucideIcon; label: string; active?: boolean }[] = [
  { icon: MapIcon, label: "Map", active: true },
  { icon: LayoutGrid, label: "Board" },
  { icon: Bookmark, label: "Saved" },
  { icon: Bell, label: "Alerts" },
];

export default function IconRail() {
  return (
    <nav className="flex w-14 shrink-0 flex-col items-center gap-2 border-r border-border bg-card py-4">
      {/* App mark */}
      <div
        className="mb-3 grid h-9 w-9 place-items-center rounded-[12px]"
        style={{
          background: "linear-gradient(135deg, var(--violet), var(--coral))",
        }}
        title="Outgrow"
      >
        <span className="h-3 w-3 rotate-45 rounded-[2px] bg-white/90" />
      </div>

      {ITEMS.map(({ icon: Icon, label, active }) => (
        <button
          key={label}
          title={label}
          aria-current={active ? "page" : undefined}
          className={`grid h-10 w-10 place-items-center rounded-chip transition ${
            active
              ? "bg-violet-tint text-violet"
              : "text-muted hover:bg-page hover:text-secondary"
          }`}
        >
          <Icon className="h-5 w-5" />
        </button>
      ))}

      <button
        title="Settings"
        className="mt-auto grid h-10 w-10 place-items-center rounded-chip text-muted hover:bg-page hover:text-secondary"
      >
        <Settings className="h-5 w-5" />
      </button>
    </nav>
  );
}

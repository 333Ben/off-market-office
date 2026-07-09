import { Map as MapIcon, Table2, Send, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useStore, type View } from "../store";
import LogoMark from "./Logo";

// Slim navigation rail (visual chrome matching the reference). Map and Table
// switch the main view; the contact-list button opens the outreach drawer.
const VIEW_ITEMS: { icon: LucideIcon; label: string; view: View }[] = [
  { icon: MapIcon, label: "Map", view: "map" },
  { icon: Table2, label: "Table", view: "table" },
];

export default function IconRail() {
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);
  const contactIds = useStore((s) => s.contactIds);
  const setContactListOpen = useStore((s) => s.setContactListOpen);

  return (
    <nav className="flex w-14 shrink-0 flex-col items-center gap-2 border-r border-border bg-card py-4">
      {/* App mark */}
      <div
        className="mb-3 grid h-9 w-9 place-items-center"
        title="OMO — Off Market Office"
      >
        <LogoMark size={32} />
      </div>

      {VIEW_ITEMS.map(({ icon: Icon, label, view: v }) => (
        <button
          key={label}
          title={label}
          onClick={() => setView(v)}
          aria-current={view === v ? "page" : undefined}
          className={`grid h-10 w-10 place-items-center rounded-chip transition ${
            view === v
              ? "bg-violet-tint text-violet"
              : "text-muted hover:bg-page hover:text-secondary"
          }`}
        >
          <Icon className="h-5 w-5" />
        </button>
      ))}

      {/* Outreach / contact list */}
      <button
        title="Contact list"
        onClick={() => setContactListOpen(true)}
        className="relative grid h-10 w-10 place-items-center rounded-chip text-muted transition hover:bg-page hover:text-secondary"
      >
        <Send className="h-5 w-5" />
        {contactIds.length > 0 && (
          <span className="tnum absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-violet px-1 text-[10px] font-700 text-white ring-2 ring-card">
            {contactIds.length}
          </span>
        )}
      </button>

      <button
        title="Settings"
        className="mt-auto grid h-10 w-10 place-items-center rounded-chip text-muted hover:bg-page hover:text-secondary"
      >
        <Settings className="h-5 w-5" />
      </button>
    </nav>
  );
}

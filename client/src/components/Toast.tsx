import { useStore } from "../store";

export default function Toast() {
  const toast = useStore((s) => s.toast);
  if (!toast) return null;
  return (
    <div className="pointer-events-none absolute left-1/2 top-4 z-[1200] -translate-x-1/2">
      <div className="console-line rounded-full border border-border bg-card px-4 py-2 text-sm font-600 text-ink shadow-soft">
        {toast}
      </div>
    </div>
  );
}

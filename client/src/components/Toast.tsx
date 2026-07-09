import { useStore } from "../store";

export default function Toast() {
  const toast = useStore((s) => s.toast);
  const setSelected = useStore((s) => s.setSelected);
  if (!toast) return null;

  const clickable = !!toast.companyId;
  return (
    <div className="absolute left-1/2 top-4 z-[1200] -translate-x-1/2">
      <button
        disabled={!clickable}
        onClick={() => toast.companyId && setSelected(toast.companyId)}
        className={`console-line rounded-full border border-border bg-card px-4 py-2 text-sm font-600 text-ink shadow-soft ${
          clickable ? "cursor-pointer hover:border-violet" : "cursor-default"
        }`}
      >
        {toast.text}
        {clickable && (
          <span className="ml-2 text-xs font-500 text-violet">view →</span>
        )}
      </button>
    </div>
  );
}

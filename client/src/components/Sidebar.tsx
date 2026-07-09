import { useMemo, useState } from "react";
import {
  TrendingUp,
  DoorOpen,
  Flame,
  UserPlus,
  ArrowLeftRight,
  Users,
  FileWarning,
  Building2,
} from "lucide-react";
import { useStore, typeCounts, type TeamBucket } from "../store";
import type { SignalType } from "../types";

const TEAM_SIZES: TeamBucket[] = ["1–10", "11–50", "51–200", "200+"];
const SIGNALS: { label: string; type: SignalType; icon: typeof Flame }[] = [
  { label: "Hiring surge", type: "hiring_surge", icon: Flame },
  { label: "New exec", type: "exec_hire", icon: UserPlus },
  { label: "Job change", type: "job_change", icon: ArrowLeftRight },
  { label: "Layoffs", type: "layoffs", icon: Users },
  { label: "Insolvency", type: "insolvency_filing", icon: FileWarning },
  { label: "Office listing", type: "office_listing", icon: Building2 },
];
const ARRONDISSEMENTS = Array.from({ length: 20 }, (_, i) => i + 1);

export default function Sidebar() {
  const companies = useStore((s) => s.companies);
  const counts = useMemo(() => typeCounts(companies), [companies]);
  const tab = useStore((s) => s.tab);
  const setTab = useStore((s) => s.setTab);
  const filters = useStore((s) => s.filters);
  const setMinUrgency = useStore((s) => s.setMinUrgency);
  const toggleTeamSize = useStore((s) => s.toggleTeamSize);
  const toggleSignal = useStore((s) => s.toggleSignal);
  const toggleArr = useStore((s) => s.toggleArr);
  const resetFilters = useStore((s) => s.resetFilters);

  const [applied, setApplied] = useState(false);
  const onApply = () => {
    setApplied(true);
    window.setTimeout(() => setApplied(false), 1200);
  };

  return (
    <aside className="flex w-[300px] shrink-0 flex-col gap-5 overflow-y-auto border-r border-border bg-page p-4">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          active={tab === "outgrower"}
          onClick={() => setTab(tab === "outgrower" ? "all" : "outgrower")}
          icon={<TrendingUp className="h-4 w-4" />}
          color="var(--violet)"
          tint="var(--violet-tint)"
          label="Need space"
          value={counts.outgrower}
        />
        <StatCard
          active={tab === "releaser"}
          onClick={() => setTab(tab === "releaser" ? "all" : "releaser")}
          icon={<DoorOpen className="h-4 w-4" />}
          color="var(--coral)"
          tint="var(--coral-tint)"
          label="Releasing"
          value={counts.releaser}
        />
      </div>

      {/* Urgency slider */}
      <Group title={`Urgency ≥ ${filters.minUrgency}`}>
        <input
          type="range"
          min={0}
          max={100}
          value={filters.minUrgency}
          onChange={(e) => setMinUrgency(Number(e.target.value))}
          className="w-full accent-violet"
        />
        <div className="flex justify-between text-xs text-muted">
          <span>0</span>
          <span>100</span>
        </div>
      </Group>

      {/* Team size */}
      <Group title="Team size">
        <div className="flex flex-wrap gap-2">
          {TEAM_SIZES.map((s) => (
            <Chip
              key={s}
              active={filters.teamSizes.includes(s)}
              onClick={() => toggleTeamSize(s)}
            >
              {s}
            </Chip>
          ))}
        </div>
      </Group>

      {/* Signals */}
      <Group title="Signals">
        <div className="flex flex-col gap-2">
          {SIGNALS.map(({ label, type, icon: Icon }) => {
            const on = filters.signalTypes.includes(type);
            return (
              <label
                key={label}
                className="flex cursor-pointer items-center gap-2.5 text-sm text-secondary hover:text-ink"
              >
                <input
                  type="checkbox"
                  className="accent-violet"
                  checked={on}
                  onChange={() => toggleSignal(type)}
                />
                <Icon className="h-4 w-4 text-muted" />
                {label}
              </label>
            );
          })}
        </div>
      </Group>

      {/* Arrondissements */}
      <Group title="Arrondissement">
        <div className="flex flex-wrap gap-1.5">
          {ARRONDISSEMENTS.map((a) => (
            <Chip
              key={a}
              small
              active={filters.arrondissements.includes(a)}
              onClick={() => toggleArr(a)}
            >
              {a}
            </Chip>
          ))}
        </div>
      </Group>

      {/* Actions */}
      <div className="mt-auto flex items-center justify-between pt-2">
        <button
          onClick={resetFilters}
          className="text-sm font-500 text-secondary hover:text-ink"
        >
          Reset
        </button>
        <button
          onClick={onApply}
          className="rounded-full bg-violet px-5 py-2 text-sm font-600 text-white transition hover:bg-violet-hover"
        >
          {applied ? "Applied ✓" : "Apply"}
        </button>
      </div>
    </aside>
  );
}

function StatCard(props: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  color: string;
  tint: string;
  label: string;
  value: number;
}) {
  return (
    <button
      onClick={props.onClick}
      className={`flex flex-col gap-2 rounded-card border bg-card p-3 text-left transition ${
        props.active ? "border-transparent shadow-soft ring-2" : "border-border"
      }`}
      style={props.active ? { ["--tw-ring-color" as any]: props.color } : undefined}
    >
      <span
        className="grid h-8 w-8 place-items-center rounded-chip"
        style={{ background: props.tint, color: props.color }}
      >
        {props.icon}
      </span>
      <span className="tnum text-2xl font-700 text-ink">{props.value}</span>
      <span className="text-xs text-secondary">{props.label}</span>
    </button>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5">
      <h3 className="text-xs font-600 uppercase tracking-wide text-muted">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Chip({
  children,
  small,
  active,
  onClick,
}: {
  children: React.ReactNode;
  small?: boolean;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-chip border transition ${
        small ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm"
      } ${
        active
          ? "border-transparent bg-violet text-white"
          : "border-border bg-card text-secondary hover:border-violet/40 hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

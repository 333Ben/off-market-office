import { useMemo, useState } from "react";
import {
  UserSearch,
  Check,
  Plus,
  ArrowUpDown,
  ListPlus,
  TrendingUp,
  DoorOpen,
} from "lucide-react";
import type { Company } from "../types";
import { useStore, applyFilters } from "../store";
import { enrichCompany, fetchCompany } from "../lib/api";
import {
  typeColor,
  typeLabel,
  heroStat,
  releaseReasonLabel,
} from "../lib/format";

type SortKey = "name" | "urgency" | "headcount" | "arr";

export default function TableView() {
  const companies = useStore((s) => s.companies);
  const tab = useStore((s) => s.tab);
  const filters = useStore((s) => s.filters);
  const search = useStore((s) => s.search);
  const setSelected = useStore((s) => s.setSelected);
  const contactIds = useStore((s) => s.contactIds);
  const toggleContact = useStore((s) => s.toggleContact);
  const addContacts = useStore((s) => s.addContacts);
  const setContactListOpen = useStore((s) => s.setContactListOpen);

  const [sortKey, setSortKey] = useState<SortKey>("urgency");
  const [asc, setAsc] = useState(false);

  const rows = useMemo(() => {
    const filtered = applyFilters(companies, tab, filters, search);
    const dir = asc ? 1 : -1;
    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case "name":
          return dir * a.name.localeCompare(b.name);
        case "headcount":
          return dir * (a.headcount - b.headcount);
        case "arr":
          return dir * (a.arrondissement - b.arrondissement);
        case "urgency":
        default:
          return dir * (a.urgencyScore - b.urgencyScore);
      }
    });
  }, [companies, tab, filters, search, sortKey, asc]);

  const sort = (key: SortKey) => {
    if (key === sortKey) setAsc((v) => !v);
    else {
      setSortKey(key);
      setAsc(key === "name" || key === "arr");
    }
  };

  const filteredNotInList = rows.filter((r) => !contactIds.includes(r.id));

  return (
    <div className="flex h-full flex-col bg-page">
      {/* Toolbar */}
      <div className="flex shrink-0 items-center gap-3 border-b border-border bg-card px-5 py-3">
        <div>
          <h2 className="text-sm font-700 text-ink">Prospects</h2>
          <p className="text-xs text-muted">
            {rows.length} {rows.length === 1 ? "company" : "companies"} match your
            filters · buyers &amp; sellers
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => addContacts(filteredNotInList.map((r) => r.id))}
            disabled={filteredNotInList.length === 0}
            className="flex items-center gap-1.5 rounded-chip border border-border bg-card px-3 py-1.5 text-xs font-600 text-secondary hover:text-ink disabled:opacity-40"
          >
            <ListPlus className="h-3.5 w-3.5" /> Add all to list
          </button>
          <button
            onClick={() => setContactListOpen(true)}
            className="flex items-center gap-1.5 rounded-chip bg-violet px-3 py-1.5 text-xs font-600 text-white hover:bg-violet-hover"
          >
            Contact list
            {contactIds.length > 0 && (
              <span className="tnum rounded-full bg-white/25 px-1.5 text-[11px]">
                {contactIds.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-page">
            <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted">
              <th className="w-8 px-4 py-2.5" />
              <Th onClick={() => sort("name")} active={sortKey === "name"}>
                Company
              </Th>
              <th className="px-3 py-2.5 font-600">Side</th>
              <Th onClick={() => sort("arr")} active={sortKey === "arr"} className="px-3">
                Arr.
              </Th>
              <Th
                onClick={() => sort("headcount")}
                active={sortKey === "headcount"}
                className="px-3"
              >
                Team
              </Th>
              <th className="px-3 py-2.5 font-600">Signal</th>
              <Th
                onClick={() => sort("urgency")}
                active={sortKey === "urgency"}
                className="px-3"
              >
                Urgency
              </Th>
              <th className="px-3 py-2.5 font-600">Decision maker</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <Row
                key={c.id}
                company={c}
                inList={contactIds.includes(c.id)}
                onToggle={() => toggleContact(c.id)}
                onOpen={() => setSelected(c.id)}
              />
            ))}
          </tbody>
        </table>

        {rows.length === 0 && (
          <div className="grid place-items-center py-20 text-sm text-muted">
            No companies match — lower the urgency filter or clear the tabs.
          </div>
        )}
      </div>
    </div>
  );
}

function Th({
  children,
  onClick,
  active,
  className = "",
}: {
  children: React.ReactNode;
  onClick: () => void;
  active: boolean;
  className?: string;
}) {
  return (
    <th className={`py-2.5 font-600 ${className}`}>
      <button
        onClick={onClick}
        className={`flex items-center gap-1 uppercase tracking-wide hover:text-ink ${
          active ? "text-ink" : ""
        }`}
      >
        {children}
        <ArrowUpDown className="h-3 w-3 opacity-60" />
      </button>
    </th>
  );
}

function Row({
  company,
  inList,
  onToggle,
  onOpen,
}: {
  company: Company;
  inList: boolean;
  onToggle: () => void;
  onOpen: () => void;
}) {
  const upsertCompany = useStore((s) => s.upsertCompany);
  const [enriching, setEnriching] = useState(false);
  const contact = company.contact;
  const isBuyer = company.type === "outgrower";

  const enrich = async () => {
    setEnriching(true);
    try {
      await enrichCompany(company.id);
      const fresh = await fetchCompany(company.id);
      upsertCompany(fresh);
    } catch {
      /* surfaces on the agent console */
    } finally {
      setEnriching(false);
    }
  };

  return (
    <tr
      className={`border-b border-border transition hover:bg-card ${
        inList ? "bg-violet-tint/40" : ""
      }`}
    >
      <td className="px-4 py-2.5 align-middle">
        <input
          type="checkbox"
          checked={inList}
          onChange={onToggle}
          aria-label={`Queue ${company.name} for outreach`}
          className="h-4 w-4 cursor-pointer accent-violet"
        />
      </td>

      <td className="py-2.5 align-middle">
        <button onClick={onOpen} className="group flex items-center gap-2.5 text-left">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ background: typeColor(company) }}
          />
          <span className="min-w-0">
            <span className="block truncate font-600 text-ink group-hover:text-violet">
              {company.name}
            </span>
            <span className="block truncate text-xs text-muted">
              {company.industry}
            </span>
          </span>
        </button>
      </td>

      <td className="px-3 py-2.5 align-middle">
        <span
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-600"
          style={{
            background: isBuyer ? "var(--violet-tint)" : "var(--coral-tint)",
            color: isBuyer ? "var(--violet)" : "var(--coral)",
          }}
        >
          {isBuyer ? (
            <TrendingUp className="h-3 w-3" />
          ) : (
            <DoorOpen className="h-3 w-3" />
          )}
          {isBuyer ? "Buyer" : "Seller"}
        </span>
      </td>

      <td className="tnum px-3 py-2.5 align-middle text-secondary">
        {company.arrondissement}e
      </td>

      <td className="tnum px-3 py-2.5 align-middle text-secondary">
        {company.headcount}
      </td>

      <td className="px-3 py-2.5 align-middle">
        <div className="text-ink">{heroStat(company)}</div>
        {!isBuyer && company.releaseReason && (
          <div className="text-xs text-muted">
            {releaseReasonLabel(company.releaseReason)}
          </div>
        )}
      </td>

      <td className="px-3 py-2.5 align-middle">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-page">
            <div
              className="h-full rounded-full"
              style={{
                width: `${company.urgencyScore}%`,
                background: typeColor(company),
              }}
            />
          </div>
          <span className="tnum text-xs font-700 text-ink">
            {company.urgencyScore}
          </span>
        </div>
      </td>

      <td className="px-3 py-2.5 align-middle">
        {contact && contact.email ? (
          <div className="min-w-0">
            <div className="flex items-center gap-1 truncate font-500 text-ink">
              <Check className="h-3.5 w-3.5 shrink-0 text-success" />
              {contact.fullName}
            </div>
            <div className="truncate text-xs text-muted">{contact.email}</div>
          </div>
        ) : enriching ? (
          <span className="text-xs text-muted">FullEnrich running…</span>
        ) : (
          <button
            onClick={enrich}
            className="flex items-center gap-1.5 rounded-chip border border-border px-2.5 py-1 text-xs font-600 text-violet hover:bg-violet-tint"
          >
            <UserSearch className="h-3.5 w-3.5" /> Find contact
          </button>
        )}
      </td>

      <td className="px-4 py-2.5 align-middle text-right">
        <button
          onClick={onToggle}
          title={inList ? "Remove from contact list" : "Add to contact list"}
          className={`grid h-7 w-7 place-items-center rounded-chip border transition ${
            inList
              ? "border-violet bg-violet text-white"
              : "border-border text-muted hover:text-violet"
          }`}
        >
          {inList ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        </button>
      </td>
    </tr>
  );
}

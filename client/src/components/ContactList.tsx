import { useMemo, useState } from "react";
import {
  X,
  Trash2,
  UserSearch,
  Check,
  Mail,
  Copy,
  Sparkles,
  Send,
  Save,
  FolderOpen,
  Building2,
  ChevronDown,
} from "lucide-react";
import { useStore } from "../store";
import { enrichCompany, fetchCompany } from "../lib/api";
import { typeColor, heroStat, formatDate } from "../lib/format";
import AvailableOffices from "./AvailableOffices";

// Outreach queue — the broker builds a list of companies to contact, enriches
// any that are missing a decision-maker, then copies the emails to work from.
export default function ContactList() {
  const open = useStore((s) => s.contactListOpen);
  const setOpen = useStore((s) => s.setContactListOpen);
  const companies = useStore((s) => s.companies);
  const contactIds = useStore((s) => s.contactIds);
  const removeContact = useStore((s) => s.removeContact);
  const clearContacts = useStore((s) => s.clearContacts);
  const upsertCompany = useStore((s) => s.upsertCompany);
  const setSelected = useStore((s) => s.setSelected);
  const showToast = useStore((s) => s.showToast);
  const savedLists = useStore((s) => s.savedLists);
  const saveList = useStore((s) => s.saveList);
  const loadSavedList = useStore((s) => s.loadSavedList);
  const deleteSavedList = useStore((s) => s.deleteSavedList);

  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  const [listName, setListName] = useState("");
  const [showSaved, setShowSaved] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const queued = useMemo(
    () =>
      contactIds
        .map((id) => companies.find((c) => c.id === id))
        .filter((c): c is NonNullable<typeof c> => Boolean(c)),
    [contactIds, companies]
  );

  const missing = queued.filter((c) => !c.contact?.email);

  const setBusyFor = (id: string, on: boolean) =>
    setBusy((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const enrichOne = async (id: string) => {
    setBusyFor(id, true);
    try {
      await enrichCompany(id);
      const fresh = await fetchCompany(id);
      upsertCompany(fresh);
    } catch {
      /* surfaces on the agent console */
    } finally {
      setBusyFor(id, false);
    }
  };

  const enrichAll = async () => {
    await Promise.all(missing.map((c) => enrichOne(c.id)));
  };

  const copyEmails = async () => {
    const emails = queued
      .map((c) => c.contact?.email)
      .filter((e): e is string => Boolean(e));
    if (emails.length === 0) return;
    try {
      await navigator.clipboard.writeText(emails.join(", "));
      setCopied(true);
      showToast(`Copied ${emails.length} email${emails.length === 1 ? "" : "s"}`);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  };

  const onSave = () => {
    const name = listName.trim();
    if (!name || queued.length === 0) return;
    saveList(name);
    setListName("");
    showToast(`Saved “${name}” · ${queued.length} companies`);
  };

  if (!open) return null;

  const withContact = queued.filter((c) => c.contact?.email).length;

  return (
    <div
      className="fixed inset-0 z-[1300] flex justify-end bg-black/30"
      onClick={() => setOpen(false)}
    >
      <div
        className="flex h-full w-[440px] flex-col bg-card shadow-pop"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border px-5 py-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 rounded-full bg-violet-tint px-2 py-0.5 text-[11px] font-700 text-violet">
                <Send className="h-3 w-3" /> OUTREACH
              </span>
            </div>
            <h2 className="mt-1.5 text-base font-700 text-ink">Contact list</h2>
            <p className="text-xs text-muted">
              {queued.length} queued · {withContact} with a decision maker
            </p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="grid h-8 w-8 place-items-center rounded-chip text-muted hover:bg-page hover:text-ink"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Bulk actions */}
        {queued.length > 0 && (
          <div className="flex items-center gap-2 border-b border-border px-5 py-2.5">
            <button
              onClick={enrichAll}
              disabled={missing.length === 0}
              className="flex items-center gap-1.5 rounded-chip bg-violet px-3 py-1.5 text-xs font-600 text-white hover:bg-violet-hover disabled:opacity-40"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Enrich missing
              {missing.length > 0 && (
                <span className="tnum rounded-full bg-white/25 px-1.5">
                  {missing.length}
                </span>
              )}
            </button>
            <button
              onClick={copyEmails}
              disabled={withContact === 0}
              className="flex items-center gap-1.5 rounded-chip border border-border px-3 py-1.5 text-xs font-600 text-secondary hover:text-ink disabled:opacity-40"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-success" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              Copy emails
            </button>
            <button
              onClick={clearContacts}
              className="ml-auto flex items-center gap-1.5 text-xs font-600 text-muted hover:text-coral"
            >
              <Trash2 className="h-3.5 w-3.5" /> Clear
            </button>
          </div>
        )}

        {/* Save the current list */}
        {queued.length > 0 && (
          <div className="flex items-center gap-2 border-b border-border px-5 py-2.5">
            <input
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSave()}
              placeholder="Name this list…"
              className="min-w-0 flex-1 rounded-chip border border-border bg-page px-3 py-1.5 text-sm text-ink placeholder:text-muted focus:border-violet focus:bg-card"
            />
            <button
              onClick={onSave}
              disabled={!listName.trim()}
              className="flex shrink-0 items-center gap-1.5 rounded-chip bg-violet px-3 py-1.5 text-xs font-600 text-white hover:bg-violet-hover disabled:opacity-40"
            >
              <Save className="h-3.5 w-3.5" /> Save
            </button>
          </div>
        )}

        {/* Saved lists */}
        {savedLists.length > 0 && (
          <div className="border-b border-border px-5 py-2">
            <button
              onClick={() => setShowSaved((v) => !v)}
              className="flex w-full items-center gap-2 text-xs font-600 text-secondary hover:text-ink"
            >
              <FolderOpen className="h-3.5 w-3.5" />
              Saved lists
              <span className="tnum rounded-full bg-page px-1.5 text-[11px] text-muted">
                {savedLists.length}
              </span>
              <ChevronDown
                className={`ml-auto h-3.5 w-3.5 transition-transform ${
                  showSaved ? "rotate-180" : ""
                }`}
              />
            </button>
            {showSaved && (
              <ul className="mt-2 flex flex-col gap-1.5">
                {savedLists.map((l) => (
                  <li
                    key={l.id}
                    className="flex items-center gap-2 rounded-chip border border-border bg-card px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-600 text-ink">
                        {l.name}
                      </div>
                      <div className="tnum text-[11px] text-muted">
                        {l.companyIds.length} companies · {formatDate(l.createdAt)}
                      </div>
                    </div>
                    <button
                      onClick={() => loadSavedList(l.id)}
                      className="shrink-0 rounded-chip border border-border px-2.5 py-1 text-xs font-600 text-violet hover:bg-violet-tint"
                    >
                      Load
                    </button>
                    <button
                      onClick={() => deleteSavedList(l.id)}
                      title="Delete list"
                      className="shrink-0 text-muted hover:text-coral"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Rows */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {queued.length === 0 ? (
            <div className="grid h-full place-items-center px-6 text-center text-sm text-muted">
              No companies queued yet. In the table, tick the rows you want to
              contact — buyers and sellers alike — and they’ll collect here.
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {queued.map((c) => {
                const contact = c.contact;
                const loading = busy.has(c.id);
                return (
                  <li
                    key={c.id}
                    className="rounded-card border border-border bg-card p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button
                        onClick={() => setSelected(c.id)}
                        className="group flex min-w-0 items-center gap-2 text-left"
                      >
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ background: typeColor(c) }}
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-600 text-ink group-hover:text-violet">
                            {c.name}
                          </span>
                          <span className="block truncate text-xs text-muted">
                            {c.type === "outgrower" ? "Buyer" : "Seller"} ·{" "}
                            {c.arrondissement}e · {heroStat(c)}
                          </span>
                        </span>
                      </button>
                      <button
                        onClick={() => removeContact(c.id)}
                        className="shrink-0 text-muted hover:text-coral"
                        title="Remove"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-2.5 border-t border-border pt-2.5">
                      {contact && contact.email ? (
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-500 text-ink">
                              {contact.fullName}{" "}
                              <span className="text-muted">· {contact.role}</span>
                            </div>
                            <a
                              href={`mailto:${contact.email}`}
                              className="flex items-center gap-1 truncate text-xs text-violet hover:text-violet-hover"
                            >
                              <Mail className="h-3 w-3 shrink-0" /> {contact.email}
                            </a>
                          </div>
                          <span className="flex shrink-0 items-center gap-1 text-[11px] font-600 text-success">
                            <Check className="h-3.5 w-3.5" /> Ready
                          </span>
                        </div>
                      ) : loading ? (
                        <span className="text-xs text-muted">
                          FullEnrich waterfall running…
                        </span>
                      ) : (
                        <button
                          onClick={() => enrichOne(c.id)}
                          className="flex items-center gap-1.5 text-xs font-600 text-violet hover:text-violet-hover"
                        >
                          <UserSearch className="h-3.5 w-3.5" /> Find contact
                        </button>
                      )}
                    </div>

                    {/* Available offices — only for buyers */}
                    {c.type === "outgrower" && (
                      <div className="mt-2.5 border-t border-border pt-2.5">
                        <button
                          onClick={() =>
                            setExpandedId((prev) => (prev === c.id ? null : c.id))
                          }
                          aria-expanded={expandedId === c.id}
                          className="flex w-full items-center gap-1.5 text-xs font-600 text-secondary hover:text-ink"
                        >
                          <Building2 className="h-3.5 w-3.5 text-coral" />
                          Available offices
                          <ChevronDown
                            className={`ml-auto h-3.5 w-3.5 transition-transform ${
                              expandedId === c.id ? "rotate-180" : ""
                            }`}
                          />
                        </button>
                        {expandedId === c.id && (
                          <div className="mt-2">
                            <AvailableOffices buyer={c} limit={3} />
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

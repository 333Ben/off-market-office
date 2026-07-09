import { useState } from "react";
import { UserSearch, Mail, Phone, Linkedin, Check } from "lucide-react";
import type { Company } from "../types";
import { useStore } from "../store";
import { enrichCompany, fetchCompany } from "../lib/api";

export default function ContactBlock({ company }: { company: Company }) {
  const upsertCompany = useStore((s) => s.upsertCompany);
  const [loading, setLoading] = useState(false);
  const contact = company.contact;

  const find = async () => {
    setLoading(true);
    try {
      await enrichCompany(company.id);
      const fresh = await fetchCompany(company.id);
      upsertCompany(fresh);
    } catch {
      /* error surfaces on the console via the agent stream */
    } finally {
      setLoading(false);
    }
  };

  return (
    <section>
      <h3 className="mb-3 text-xs font-600 uppercase tracking-wide text-muted">
        Decision maker
      </h3>

      {contact && (contact.email || contact.linkedin || contact.phone) ? (
        <div className="rounded-card border border-border bg-card p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-600 text-ink">{contact.fullName}</div>
              <div className="text-xs text-secondary">{contact.role}</div>
            </div>
            <span className="flex items-center gap-1 text-[11px] font-600 text-success">
              <Check className="h-3.5 w-3.5" />
              FullEnrich
            </span>
          </div>
          <div className="mt-3 flex flex-col gap-1.5 text-sm">
            {contact.email && (
              <a
                href={`mailto:${contact.email}`}
                className="flex items-center gap-2 text-violet hover:text-violet-hover"
              >
                <Mail className="h-4 w-4" /> {contact.email}
              </a>
            )}
            {contact.phone && (
              <a
                href={`tel:${contact.phone.replace(/\s/g, "")}`}
                className="flex items-center gap-2 text-secondary hover:text-ink"
              >
                <Phone className="h-4 w-4" /> {contact.phone}
              </a>
            )}
            {contact.linkedin && (
              <a
                href={contact.linkedin}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-[#0A66C2] hover:underline"
              >
                <Linkedin className="h-4 w-4" /> LinkedIn profile
              </a>
            )}
          </div>
        </div>
      ) : loading ? (
        <div className="rounded-card border border-border bg-card p-3">
          <div className="mb-2 h-3 w-1/2 animate-pulse rounded bg-page" />
          <div className="mb-2 h-3 w-2/3 animate-pulse rounded bg-page" />
          <div className="h-3 w-1/3 animate-pulse rounded bg-page" />
          <p className="mt-2 text-xs text-muted">FullEnrich waterfall running…</p>
        </div>
      ) : (
        <button
          onClick={find}
          className="flex w-full items-center justify-center gap-2 rounded-card bg-violet px-4 py-2.5 text-sm font-600 text-white hover:bg-violet-hover"
        >
          <UserSearch className="h-4 w-4" /> Find contact
        </button>
      )}
    </section>
  );
}

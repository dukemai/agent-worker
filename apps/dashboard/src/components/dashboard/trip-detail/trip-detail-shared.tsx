"use client";

import { type ReactNode } from "react";
import { useMutation } from "@tanstack/react-query";
import { X } from "lucide-react";
import { createTripTask } from "@/components/dashboard/trip-ops-api";
import { getAccommodationLogistics, joinParts } from "@/components/dashboard/trip-utils";
import type { SelectedPreferenceGroup } from "@/components/dashboard/trip-types";
import type { Bucket } from "@/types/database";

export function SummaryGroup({ title, rows, empty, compact = false }: { title: string; rows: [string, string][]; empty?: string; compact?: boolean }) {
  return (
    <section className={`${compact ? "space-y-2 p-2.5" : "space-y-3 p-3"} rounded-md border bg-background`}>
      <h3 className="text-sm font-semibold text-muted-foreground">{title}</h3>
      {rows.length > 0 ? (
        <div className={compact ? "space-y-2" : "grid gap-3 md:grid-cols-2"}>
          {rows.map(([label, value]) => <SummaryValue key={label} label={label} value={value} />)}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{empty ?? "No information yet."}</p>
      )}
    </section>
  );
}

export function TripSection({
  title,
  icon,
  meta,
  actions,
  children,
  className = "",
  contentClassName = "space-y-4",
}: {
  title: ReactNode;
  icon?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <section className={className}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            {icon}
            {title}
          </h2>
          {meta}
        </div>
        {actions}
      </div>
      <div className={`mt-4 ${contentClassName}`}>{children}</div>
    </section>
  );
}

export function SummaryValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="whitespace-pre-wrap text-sm">{value}</div>
    </div>
  );
}

export function SelectedPreferencesList({
  groups,
  onRemove,
}: {
  groups: SelectedPreferenceGroup[];
  onRemove?: (preference: string) => void;
}) {
  if (groups.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-muted-foreground">Selected preferences</h3>
      <div className="space-y-3">
        {groups.map((group) => (
          <section key={group.category} className="space-y-2">
            <div className="text-xs font-medium capitalize text-muted-foreground">{group.category}</div>
            <ul className="space-y-2">
              {group.preferences.map((preference) => (
                <li key={preference} className="flex items-start justify-between gap-3 text-sm">
                  <span>{preference}</span>
                  {onRemove ? (
                    <button
                      type="button"
                      className="mt-0.5 rounded-full p-0.5 hover:bg-muted"
                      aria-label={`Remove ${preference}`}
                      onClick={() => onRemove(preference)}
                    >
                      <X className="size-3" aria-hidden />
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

export function ExtractedLogistics({ details }: { details: Record<string, unknown> | null | undefined }) {
  if (!details || Object.keys(details).length === 0) {
    return null;
  }
  const accommodations = getAccommodationLogistics(details);

  const scalarRows = [
    ["Transport", details.transport_mode],
    ["Outbound depart", joinParts(details.outbound_departure_location, details.outbound_departure_time)],
    ["Outbound arrive", joinParts(details.outbound_arrival_location, details.outbound_arrival_time)],
    ["Return depart", joinParts(details.return_departure_location, details.return_departure_time)],
    ["Return arrive", joinParts(details.return_arrival_location, details.return_arrival_time)],
    ["Base area", details.base_area],
    ["Local transport", details.local_transport],
    ["Parking", details.parking_notes],
  ].filter((row): row is [string, string] => typeof row[1] === "string" && row[1].trim().length > 0);

  const listRows = [
    ["Booking refs", details.booking_references],
    ["Links", details.important_links],
    ["Constraints", details.constraints],
    ["Review notes", details.confidence_notes],
  ].filter((row): row is [string, string[]] => Array.isArray(row[1]) && row[1].length > 0);

  if (scalarRows.length === 0 && listRows.length === 0 && accommodations.length === 0) return null;

  return (
    <div className="space-y-3 md:col-span-2">
      {scalarRows.length > 0 ? (
        <dl className="grid gap-2 md:grid-cols-2">
          {scalarRows.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
              <dd className="text-sm">{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {accommodations.length > 0 ? (
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">Accommodations</div>
          <div className="space-y-2">
            {accommodations.map((accommodation, index) => (
              <div key={`${accommodation.name ?? "stay"}-${index}`} className="rounded-md bg-muted/30 p-2">
                <div className="text-sm font-medium">{accommodation.name ?? `Accommodation ${index + 1}`}</div>
                <dl className="mt-1 grid gap-1 text-sm md:grid-cols-2">
                  {accommodation.address ? <SummaryValue label="Address" value={accommodation.address} /> : null}
                  {accommodation.area ? <SummaryValue label="Area" value={accommodation.area} /> : null}
                  {formatAccommodationTiming("Check-in", accommodation.check_in_date, accommodation.check_in_time)}
                  {formatAccommodationTiming("Check-out", accommodation.check_out_date, accommodation.check_out_time)}
                  {accommodation.booking_reference ? <SummaryValue label="Booking ref" value={accommodation.booking_reference} /> : null}
                </dl>
                {accommodation.notes ? <p className="mt-1 text-sm text-muted-foreground">{accommodation.notes}</p> : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {listRows.map(([label, values]) => (
        <div key={label}>
          <div className="text-xs font-medium text-muted-foreground">{label}</div>
          <ul className="mt-1 list-inside list-disc text-sm">
            {values.map((value) => <li key={value}>{value}</li>)}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function FieldGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground">{title}</h3>
      <div className="grid gap-3 md:grid-cols-2">
        {children}
      </div>
    </section>
  );
}

export function LabeledField({
  label,
  htmlFor,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
    </div>
  );
}

export function KnowledgeRows({ title, rows }: { title: string; rows: { title: string; meta: string | null; detail: string | null }[] }) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium uppercase text-muted-foreground">{title}</div>
      <ul className="space-y-2 text-sm">
        {rows.map((row) => (
          <li key={`${title}-${row.title}`} className="rounded-md bg-muted/30 px-3 py-2">
            <div className="font-medium">{row.title}</div>
            {row.meta ? <div className="text-xs text-muted-foreground">{row.meta}</div> : null}
            {row.detail ? <div className="mt-1 text-muted-foreground">{row.detail}</div> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatAccommodationTiming(label: string, date: string | null, time: string | null) {
  const value = joinParts(date, time);
  return value ? <SummaryValue label={label} value={value} /> : null;
}

export type PanelProps = {
  tripId: string;
  onError: (error: string | null) => void;
  onDone: () => void;
};

export function useTripTaskMutation(tripId: string, onError: (error: string | null) => void, onDone: () => void) {
  return useMutation({
    mutationFn: (payload: { title: string; bucket: Bucket; category?: string; original_body?: string | null; source_item_id?: string; source_item_type?: string }) =>
      createTripTask(tripId, payload),
    onSuccess: () => {
      onError(null);
      onDone();
    },
    onError: (err) => onError(err instanceof Error ? err.message : "Failed to create task"),
  });
}

"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Cake, RefreshCw } from "lucide-react";
import { fetchRenewals } from "./api";
import { fetchBirthdays } from "./birthdays-api";

function daysUntil(month: number, day: number) {
  const now = new Date();
  let target = new Date(now.getFullYear(), month - 1, day);
  if (target.getTime() < new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) {
    target = new Date(now.getFullYear() + 1, month - 1, day);
  }
  return Math.ceil((target.getTime() - now.getTime()) / 86_400_000);
}

function dueLabel(days: number) {
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `${days}d`;
}

export function HomeRail() {
  const renewals = useQuery({ queryKey: ["renewals"], queryFn: fetchRenewals });
  const birthdays = useQuery({ queryKey: ["birthdays"], queryFn: () => fetchBirthdays({ status: "active" }) });
  const upcomingBirthdays = [...(birthdays.data ?? [])]
    .sort((a, b) => daysUntil(a.birthday_month, a.birthday_day) - daysUntil(b.birthday_month, b.birthday_day))
    .slice(0, 4);

  return (
    <aside className="grid gap-6 sm:grid-cols-2 xl:grid-cols-1" aria-label="Upcoming reminders">
      <section>
        <div className="mb-3 flex items-center justify-between px-1">
          <h2 className="flex items-center gap-2 font-sans text-[13px] font-bold uppercase tracking-[0.03em]"><RefreshCw className="size-4 text-primary" /> Renewals</h2>
          <Link href="/renewals" className="text-xs font-semibold text-primary hover:underline">See all</Link>
        </div>
        <div className="overflow-hidden rounded-2xl border bg-card shadow-[0_1px_2px_rgba(36,31,25,0.04),0_8px_24px_-12px_rgba(36,31,25,0.14)]">
          {renewals.isLoading ? <p className="p-4 text-sm text-muted-foreground">Loading renewals…</p> : null}
          {!renewals.isLoading && !(renewals.data?.length) ? <p className="p-4 text-sm text-muted-foreground">Nothing due in the next 30 days.</p> : null}
          {(renewals.data ?? []).slice(0, 4).map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 border-b px-4 py-3.5 last:border-b-0">
              <div className="min-w-0"><p className="truncate text-sm font-medium">{item.title}</p><p className="mt-0.5 text-xs text-muted-foreground">{new Date(item.due_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</p></div>
              <span className={item.days_left <= 7 ? "rounded-full bg-[#f4e1cf] px-2.5 py-1 text-xs font-semibold text-primary" : "rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground"}>{dueLabel(item.days_left)}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between px-1">
          <h2 className="flex items-center gap-2 font-sans text-[13px] font-bold uppercase tracking-[0.03em]"><Cake className="size-4 text-primary" /> Birthdays</h2>
          <Link href="/birthdays" className="text-xs font-semibold text-primary hover:underline">See all</Link>
        </div>
        <div className="overflow-hidden rounded-2xl border bg-card shadow-[0_1px_2px_rgba(36,31,25,0.04),0_8px_24px_-12px_rgba(36,31,25,0.14)]">
          {birthdays.isLoading ? <p className="p-4 text-sm text-muted-foreground">Loading birthdays…</p> : null}
          {!birthdays.isLoading && upcomingBirthdays.length === 0 ? <p className="p-4 text-sm text-muted-foreground">No birthdays saved yet.</p> : null}
          {upcomingBirthdays.map((item) => {
            const days = daysUntil(item.birthday_month, item.birthday_day);
            return <Link href="/birthdays" key={item.id} className="flex items-center justify-between gap-3 border-b px-4 py-3.5 transition-colors last:border-b-0 hover:bg-muted/50"><div className="min-w-0"><p className="truncate text-sm font-medium">{item.name}</p><p className="mt-0.5 text-xs text-muted-foreground">{new Date(2000, item.birthday_month - 1, item.birthday_day).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</p></div><span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">{dueLabel(days)}</span></Link>;
          })}
        </div>
      </section>
    </aside>
  );
}
